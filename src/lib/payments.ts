import { prisma } from "./prisma";

/**
 * Payment reconciliation helpers (Phase 3B, roadmap 3.6 / schema
 * plan §2).
 *
 * An order carries at most one mobile-money transaction reference
 * (`paymentTxId` + `paymentSenderNumber`, added in Phase 3A) and a
 * verification state (`paymentStatus`: UNVERIFIED / VERIFIED /
 * MISMATCHED). Duplicate TxIDs are rejected at the application level
 * with a 409 — deliberately NOT a database unique constraint, so a
 * staff typo surfaces as a readable error naming the other order
 * instead of a raw DB failure mid-sale, and one payment legitimately
 * covering two orders can still be recorded after review (the check
 * only fires on the write paths that set a TxID).
 */

/** Methods for which a TxID / sender number is meaningful. */
export const MOBILE_PAYMENT_METHODS = ["bKash", "Nagad", "Rocket"];

export function isMobilePaymentMethod(method?: string | null): boolean {
   if (!method) return false;
   const normalized = method.trim().toLowerCase();
   return MOBILE_PAYMENT_METHODS.some((m) => m.toLowerCase() === normalized);
}

/**
 * Find a non-deleted order (other than `excludeOrderId`) that already
 * carries the given non-empty transaction ID. Returns null when the
 * TxID is empty or unused. Accepts any Prisma-like client so write
 * paths can re-run the check inside their transaction (QA fix S1).
 */
export async function findOrderWithTxId(
   txId: string,
   excludeOrderId?: string,
   db: any = prisma,
) {
   const clean = String(txId || "").trim();
   if (!clean) return null;
   return db.order.findFirst({
      where: {
         paymentTxId: clean,
         isDeleted: false,
         ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
      },
      select: { id: true, orderId: true, orderCode: true, customId: true },
   });
}

/**
 * Thrown by order write paths when the in-transaction duplicate-TxID
 * re-check finds a clash; handlers map it to the same 409 body the
 * pre-transaction check returns.
 */
export class DuplicateTxIdError extends Error {
   txId: string;
   clash: { id?: string; orderId?: string | null; orderCode?: string | null; customId?: string | null };
   constructor(
      txId: string,
      clash: { id?: string; orderId?: string | null; orderCode?: string | null; customId?: string | null },
   ) {
      super(duplicateTxIdMessage(txId, clash));
      this.name = "DuplicateTxIdError";
      this.txId = txId;
      this.clash = clash;
   }
}

export function duplicateTxIdMessage(
   txId: string,
   clash: { id?: string; orderId?: string | null; orderCode?: string | null; customId?: string | null },
): string {
   const label = clash.orderId || clash.orderCode || clash.customId || clash.id;
   return `Transaction ID "${txId}" is already recorded on order ${label}. Check for a duplicate entry before saving.`;
}

// ─────────────────────────────────────────────
// Supplier payments (B2-4, audit R-2 / P1-8): the same app-level
// duplicate-TxID discipline the order side has always had, applied
// to SupplierPayment rows. Deliberately NOT a database unique
// constraint either — the 409 names the clashing payment.
// ─────────────────────────────────────────────

/**
 * Find a non-deleted supplier payment (other than
 * `excludePaymentId`) that already carries the given non-empty
 * transaction ID. Returns null when the TxID is empty or unused.
 * Accepts any Prisma-like client so write paths can re-run the
 * check inside their transaction, mirroring findOrderWithTxId.
 */
export async function findSupplierPaymentWithTxId(
   txId: string,
   excludePaymentId?: string,
   db: any = prisma,
) {
   const clean = String(txId || "").trim();
   if (!clean) return null;
   return db.supplierPayment.findFirst({
      where: {
         paymentTxId: clean,
         isDeleted: false,
         ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
      },
      select: { id: true, customId: true },
   });
}

export function duplicateSupplierTxIdMessage(
   txId: string,
   clash: { id?: string; customId?: string | null },
): string {
   const label = clash.customId || clash.id;
   return `Transaction ID "${txId}" is already recorded on supplier payment ${label}. Check for a duplicate entry before saving.`;
}

/**
 * Thrown by supplier-payment write paths when the in-transaction
 * duplicate-TxID re-check finds a clash; handlers map it to the
 * same 409 body the pre-transaction check returns.
 */
export class DuplicateSupplierTxIdError extends Error {
   txId: string;
   clash: { id?: string; customId?: string | null };
   constructor(txId: string, clash: { id?: string; customId?: string | null }) {
      super(duplicateSupplierTxIdMessage(txId, clash));
      this.name = "DuplicateSupplierTxIdError";
      this.txId = txId;
      this.clash = clash;
   }
}

/**
 * Pure duplicate decision for supplier payments: a clash matters
 * only for the mobile-money methods a TxID is meaningful for, and
 * only when the TxID is non-empty and another live payment carries
 * it. Cash payments and empty TxIDs are never rejected. Returns the
 * 409 message, or null when the payment may proceed. The route
 * feeds it the clash row from findSupplierPaymentWithTxId (queried
 * both before and inside the transaction).
 */
export function supplierTxIdClashMessage(
   method: string | null | undefined,
   txId: string | null | undefined,
   clash: { id?: string; customId?: string | null } | null | undefined,
): string | null {
   const clean = String(txId || "").trim();
   if (!clean || !clash) return null;
   if (!isMobilePaymentMethod(method)) return null;
   return duplicateSupplierTxIdMessage(clean, clash);
}
