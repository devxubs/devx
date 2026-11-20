import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { restoreStockForPurchaseReturn } from "@src/lib/stock";
import {
   lockPurchaseRow,
   returnCreditWasConsumed,
   CASH_REFUND_EXPENSE_TYPE,
} from "@src/lib/purchaseReturns";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
   buildChanges,
} from "@src/lib/audit";

// Delete (reverse) a purchase return (Phase 4, D2 — approved
// design: DEVX_POS_PHASE4_SCHEMA_FINAL_DIFF.md §2.2 Lifecycle).
//
// Deleting a return is NOT a mere flag: in ONE transaction, under
// the same Purchase-row lock as creation, it reverses exactly what
// creation did — stock goes back in (positive RETURN movements),
// purchase.total grows back by the SAME dueAbsorbed creation
// recorded (never recomputed from current state), a CASH_REFUND's
// negative Expense row is soft-deleted, and the return itself is
// soft-deleted so its standing credit leaves the outstanding
// aggregate automatically.
//
// Refusals (409):
//  - any of a SUPPLIER_CREDIT return's standing credit has already
//    been consumed (creditConsumed beyond its creation value) —
//    that consumption cannot be unwound from here;
//  - a CASH_REFUND return whose refund Expense row can no longer
//    be found — the cash trail is broken and reversing the totals
//    would desync the accounting.
//
// The creation baseline (dueAbsorbed / initial creditConsumed) is
// read from the return's CREATE audit row, which creation wrote in
// its own transaction; settlement-derived fallbacks cover a
// missing audit row (DUE_REDUCTION: dueAbsorbed = totalAmount;
// SUPPLIER_CREDIT: assume unconsumed, dueAbsorbed = creditConsumed;
// CASH_REFUND: derived from the refund Expense row itself).
//
// Bin restore deliberately does NOT reapply purchase returns (see
// /api/bin): a deleted return stays deleted.

const RETURN_GATE = [
   "suppliers",
   "supplier",
   "supplier_update",
   "purchases",
   "purchase_update",
];

class ReturnReversalError extends Error {
   status: number;
   constructor(message: string, status = 409) {
      super(message);
      this.name = "ReturnReversalError";
      this.status = status;
   }
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, RETURN_GATE);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;
   const auditCtx = requestAuditContext(request);

   try {
      const result = await prisma.$transaction(async (tx) => {
         // Routing read: find the return to learn its purchase.
         const ref = await tx.purchaseReturn.findFirst({
            where: { OR: [{ id }, { customId: id }] },
            select: { id: true, purchaseId: true, isDeleted: true },
         });
         if (!ref) throw new ReturnReversalError("Purchase return not found", 404);
         if (ref.isDeleted) return { alreadyDeleted: true as const };

         // Serialize against concurrent returns / payments / edits
         // of the same purchase, exactly as creation does.
         const locked = await lockPurchaseRow(tx, ref.purchaseId);
         if (!locked) throw new ReturnReversalError("Purchase not found", 404);

         // Authoritative reads — only after the lock is held.
         const purchaseReturn = await tx.purchaseReturn.findUnique({
            where: { id: ref.id },
            include: { items: true },
         });
         if (!purchaseReturn || purchaseReturn.isDeleted) {
            return { alreadyDeleted: true as const };
         }
         const purchase = await tx.purchase.findUnique({
            where: { id: purchaseReturn.purchaseId },
         });
         if (!purchase) throw new ReturnReversalError("Purchase not found", 404);

         const totalAmount = Number(purchaseReturn.totalAmount);
         const creditConsumed = Number(purchaseReturn.creditConsumed);

         // Creation baseline from the CREATE audit row.
         const createAudit = await tx.auditLog.findFirst({
            where: {
               entityType: "PURCHASE_RETURN",
               entityId: purchaseReturn.id,
               action: "CREATE",
            },
            orderBy: { createdAt: "asc" },
            select: { changes: true },
         });
         const auditChanges: any = createAudit?.changes || null;
         const auditDueAbsorbed =
            auditChanges && typeof auditChanges.dueAbsorbed?.to === "number"
               ? auditChanges.dueAbsorbed.to
               : null;
         const auditCreditConsumed =
            auditChanges && typeof auditChanges.creditConsumed?.to === "number"
               ? auditChanges.creditConsumed.to
               : null;

         let dueAbsorbed: number;
         let refundExpense: any = null;

         if (purchaseReturn.settlement === "SUPPLIER_CREDIT") {
            const baseline = auditCreditConsumed ?? creditConsumed;
            // B2-3: this guard is now LIVE — allocated supplier
            // payments consume standing credit by incrementing
            // creditConsumed beyond this creation baseline.
            if (returnCreditWasConsumed(baseline, creditConsumed)) {
               throw new ReturnReversalError(
                  `This return cannot be deleted: ৳${round2(creditConsumed - baseline).toFixed(2)} of its supplier credit has already been consumed by later transactions, which cannot be unwound here.`,
               );
            }
            dueAbsorbed = auditDueAbsorbed ?? baseline;
         } else if (purchaseReturn.settlement === "CASH_REFUND") {
            refundExpense = await tx.expense.findFirst({
               where: {
                  type: CASH_REFUND_EXPENSE_TYPE,
                  isDeleted: false,
                  note: { contains: purchaseReturn.customId || purchaseReturn.id },
               },
               orderBy: { createdAt: "asc" },
            });
            if (!refundExpense) {
               throw new ReturnReversalError(
                  "This return cannot be deleted: its cash-refund accounting record was not found, so the refund cannot be reversed safely.",
               );
            }
            const remainder = Math.abs(Number(refundExpense.amount));
            dueAbsorbed = auditDueAbsorbed ?? round2(totalAmount - remainder);
         } else {
            // DUE_REDUCTION: the whole amount was absorbed by due.
            dueAbsorbed = auditDueAbsorbed ?? totalAmount;
         }

         // Reverse the stock deduction.
         await restoreStockForPurchaseReturn(
            tx,
            purchaseReturn.items
               .filter((it) => it.productId)
               .map((it) => ({
                  productId: it.productId as string,
                  quantity: it.quantity,
                  variantId: it.variantId,
               })),
            {
               purchaseId: purchase.id,
               note: `Purchase return ${purchaseReturn.customId || purchaseReturn.id} deleted — stock restored`,
            },
         );

         // Restore the purchase totals by the recorded dueAbsorbed.
         if (!purchase.isDeleted) {
            const restoredTotal = round2(Number(purchase.total) + dueAbsorbed);
            const restoredDue = round2(restoredTotal - Number(purchase.paid));
            await tx.purchase.update({
               where: { id: purchase.id },
               data: { total: restoredTotal, due: restoredDue },
            });
         }

         // Reverse the cash-refund accounting entry.
         if (refundExpense) {
            await tx.expense.update({
               where: { id: refundExpense.id },
               data: { isDeleted: true, deletedAt: new Date() },
            });
         }

         // Soft-delete the return itself (BIN-03 pattern).
         await tx.purchaseReturn.update({
            where: { id: purchaseReturn.id },
            data: { isDeleted: true, deletedAt: new Date() },
         });

         await logAudit(tx, {
            actor: auditActorFromContext(gate),
            action: "DELETE",
            entityType: "PURCHASE_RETURN",
            entityId: purchaseReturn.id,
            entityCustomId: purchaseReturn.customId,
            summary: `Purchase return ${purchaseReturn.customId || purchaseReturn.id} deleted and reversed — total ৳${totalAmount.toFixed(2)}, due restored ৳${round2(dueAbsorbed).toFixed(2)}`,
            changes: buildChanges(
               {
                  totalAmount,
                  settlement: purchaseReturn.settlement,
                  dueAbsorbed: round2(dueAbsorbed),
               },
               {
                  totalAmount: 0,
                  settlement: purchaseReturn.settlement,
                  dueAbsorbed: 0,
               },
               ["totalAmount", "dueAbsorbed"],
            ),
            ...auditCtx,
         });

         return { alreadyDeleted: false as const };
      });

      return NextResponse.json({
         message: result.alreadyDeleted
            ? "Purchase return was already deleted"
            : "Purchase return deleted and its stock and financial effects reversed",
      });
   } catch (err: any) {
      if (err instanceof ReturnReversalError) {
         return NextResponse.json(
            { error: "Cannot delete purchase return", message: err.message },
            { status: err.status },
         );
      }
      console.error("DELETE /api/purchase-returns/[id] error:", err);
      return NextResponse.json(
         { error: "Failed to delete purchase return" },
         { status: 500 },
      );
   }
}
