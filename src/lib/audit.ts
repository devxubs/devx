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
import { getClientIp } from "./rateLimit";
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
   // P2-4 coverage extension: catalog / party / configuration
   // entities audited from their own CRUD routes and the Recycle
   // Bin pairs. The AuditLog.entityType column is a plain string,
   // so these join the existing vocabulary without a schema change.
   "ROLE",
   "SETTING",
   "CUSTOMER",
   "SUPPLIER",
   "ASSET",
   "CATEGORY",
   "UNIT",
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

/**
 * Order columns diffed by the single-order PUT audit
 * (orders/[id] `writeOrderAudit`). P2-13: courierStatus,
 * paymentSenderNumber, orderSource and cancellationReason join the
 * original money/status/courier set — a PUT changing only one of
 * them previously wrote no audit row at all. The four order notes
 * are NOT columns (they live in the orderTags JSON) and are diffed
 * separately by the handler from tag snapshots.
 */
export const ORDER_PUT_AUDIT_FIELDS = [
   "status",
   "paymentStatus",
   "paymentTxId",
   "paymentSenderNumber",
   "paymentMethod",
   "orderSource",
   "cancellationReason",
   "courier",
   "courierStatus",
   "deliveryCharge",
   "discount",
   "total",
   "dueAmount",
   "advancePayment",
   "courierConsignmentId",
   "courierTrackingCode",
   "courierProviderStatus",
   "orderNote",
] as const;

/**
 * Purchase columns diffed by the purchase PUT audit. P2-13: the
 * non-money fields the PUT can change (supplierId, invoice, note)
 * join the original money-only set. The handler writes no date
 * field, so none is diffed.
 */
export const PURCHASE_PUT_AUDIT_FIELDS = [
   "total",
   "due",
   "paid",
   "productAmount",
   "othersCost",
   "discount",
   "supplierId",
   "invoice",
   "note",
] as const;

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
 * Best-effort client IP / user-agent from the request.
 *
 * S-8 / P2-4 fix: the IP derivation is now THE SAME as the login
 * rate limiter's (`getClientIp` in lib/rateLimit) — `x-real-ip`
 * first, else the LAST `x-forwarded-for` hop. The previous code took
 * the FIRST forwarded hop, which is exactly the client-controlled,
 * spoofable value the limiter refuses to trust: the actor being
 * audited could forge their own logged IP. `getClientIp` returns
 * "unknown" when no proxy header exists; the audit column stores
 * NULL for that case, as before.
 */
export function requestAuditContext(
   request: NextRequest,
): AuditRequestContext {
   const ip = getClientIp(request);
   return {
      ipAddress: ip === "unknown" ? null : ip,
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
