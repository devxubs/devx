/**
 * Audit log writer (Phase 4, D1 — schema: AuditLog, see
 * DEVX_POS_PHASE4_SCHEMA_FINAL_DIFF.md §2.1).
 *
 * One row per audited business action: who did it (actor id + a
 * display-name snapshot, so the trail survives renames/deletes),
 * what happened (action + entity pointer + one-line summary), and a
 * small { field: { from, to } } diff for the fields that matter.
 *
 * Transaction rule (owner's D1 decision): financial and inventory
 * mutations call logAudit() with the SAME transaction client as the
 * mutation, so an audit row can never claim something its
 * transaction rolled back — and a failed audit insert fails the
 * mutation rather than silently losing the trail. The single
 * exception is LOGIN, which has no business transaction:
 * logAuditStandalone() writes it after successful authentication
 * and swallows its own failure so a logging problem can never lock
 * a user out.
 *
 * There is deliberately NO update/delete path for audit rows
 * anywhere in the application (the viewer API is GET-only).
 */
import type { NextRequest } from "next/server";
import { prisma } from "./prisma";
import type { AuthContext, SessionUser } from "./auth";

export const AUDIT_ACTIONS = [
   "CREATE",
   "UPDATE",
   "DELETE",
   "RESTORE",
   "STATUS_CHANGE",
   "PAYMENT",
   "STOCK",
   "LOGIN",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITY_TYPES = [
   "ORDER",
   "PURCHASE",
   "PURCHASE_RETURN",
   "SUPPLIER_PAYMENT",
   "EXPENSE",
   "PRODUCT",
   "USER",
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export interface AuditActor {
   id: string | null;
   label: string | null;
}

/** Actor identity from a full auth context (API route gates). */
export function auditActorFromContext(ctx: AuthContext): AuditActor {
   return {
      id: ctx.userId,
      label: ctx.session?.name || ctx.email || null,
   };
}

/** Actor identity from a bare session (handlers holding only that). */
export function auditActorFromSession(
   session: SessionUser | null | undefined,
): AuditActor {
   if (!session) return { id: null, label: null };
   return {
      id: session.id || null,
      label: session.name || session.email || null,
   };
}

export interface AuditRequestContext {
   ipAddress: string | null;
   userAgent: string | null;
}

/**
 * Best-effort client IP / user-agent from the request, following the
 * same header precedence as the login rate limiter (first
 * x-forwarded-for entry, then x-real-ip).
 */
export function requestAuditContext(
   request: NextRequest,
): AuditRequestContext {
   const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
   return {
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || null,
   };
}

type ChangeValue = string | number | boolean | null;

function normalizeChangeValue(value: unknown): ChangeValue {
   if (value === undefined || value === null) return null;
   if (value instanceof Date) return value.toISOString();
   if (typeof value === "number") return Number.isFinite(value) ? value : null;
   if (typeof value === "string" || typeof value === "boolean") return value;
   // Prisma Decimal and other numeric objects.
   if (typeof (value as any)?.toNumber === "function") {
      const n = (value as any).toNumber();
      return Number.isFinite(n) ? n : null;
   }
   return String(value);
}

/**
 * Build the AuditLog `changes` payload: for each named field whose
 * value actually differs between the before/after snapshots, a
 * { from, to } pair of JSON-safe scalars. Returns null when nothing
 * changed (callers store NULL rather than an empty object).
 */
export function buildChanges(
   before: Record<string, unknown> | null | undefined,
   after: Record<string, unknown> | null | undefined,
   fields: string[],
): Record<string, { from: ChangeValue; to: ChangeValue }> | null {
   const out: Record<string, { from: ChangeValue; to: ChangeValue }> = {};
   for (const field of fields) {
      const from = normalizeChangeValue(before?.[field]);
      const to = normalizeChangeValue(after?.[field]);
      if (from !== to) out[field] = { from, to };
   }
   return Object.keys(out).length > 0 ? out : null;
}

export interface AuditEntry {
   actor: AuditActor;
   action: AuditAction;
   entityType: AuditEntityType;
   entityId: string;
   entityCustomId?: string | null;
   summary: string;
   changes?: Record<string, { from: ChangeValue; to: ChangeValue }> | null;
   ipAddress?: string | null;
   userAgent?: string | null;
}

/**
 * Write one audit row through the caller's transaction client. No
 * error handling by design (see the transaction rule above): if the
 * insert fails, the surrounding mutation rolls back with it.
 */
export async function logAudit(tx: any, entry: AuditEntry): Promise<void> {
   await tx.auditLog.create({
      data: {
         actorId: entry.actor.id,
         actorLabel: entry.actor.label,
         action: entry.action,
         entityType: entry.entityType,
         entityId: entry.entityId,
         entityCustomId: entry.entityCustomId || null,
         summary: entry.summary,
         // Json column: omit the key entirely for "no diff" so the
         // column stays DB NULL (a literal null is ambiguous for
         // Prisma Json inputs).
         ...(entry.changes ? { changes: entry.changes } : {}),
         ipAddress: entry.ipAddress ?? null,
         userAgent: entry.userAgent ?? null,
      },
   });
}

/**
 * Standalone audit write for actions that have no business
 * transaction (LOGIN). Uses the root client and NEVER throws — a
 * failed audit insert must not break the action it describes.
 */
export async function logAuditStandalone(entry: AuditEntry): Promise<void> {
   try {
      await logAudit(prisma, entry);
   } catch (err) {
      console.error("Audit log write failed:", err);
   }
}
