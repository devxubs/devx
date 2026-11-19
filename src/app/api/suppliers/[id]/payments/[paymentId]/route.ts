import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { lockPurchaseRow } from "@src/lib/purchaseReturns";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
} from "@src/lib/audit";

// Void a supplier payment (Phase 3B, roadmap 3.7 / schema plan §3).
// Payments are financial records: they are soft-deleted (voided),
// never hard-deleted. Voiding reverses the payment's allocation in
// the same transaction — an allocated payment decrements its
// purchase's `paid` and recomputes `due`; an unallocated payment
// simply stops counting as supplier credit. Phase 4 (§2.2): an
// allocated void takes the Purchase-row FOR UPDATE lock before
// writing, serializing against concurrent purchase returns/edits.

const PAYMENT_GATE = [
   "suppliers",
   "supplier",
   "supplier_update",
   "purchases",
   "purchase_update",
];

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
   const gate = await requirePermission(request, PAYMENT_GATE);
   if (gate instanceof NextResponse) return gate;

   const { id, paymentId } = await params;

   try {
      const supplier = await prisma.supplier.findFirst({
         where: { OR: [{ id }, { customId: id }], isDeleted: false },
      });
      if (!supplier) {
         return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }

      const auditCtx = requestAuditContext(request);

      const result = await prisma.$transaction(async (tx) => {
         const payment = await tx.supplierPayment.findFirst({
            where: { id: paymentId, supplierId: supplier.id },
         });
         if (!payment) return { status: 404 as const };
         if (payment.isDeleted) return { status: 200 as const, alreadyVoided: true };

         // Phase 4 (§2.2): lock the purchase row before reversing
         // an allocation — the same lock purchase returns take.
         if (payment.purchaseId) {
            await lockPurchaseRow(tx, payment.purchaseId);
         }

         await tx.supplierPayment.update({
            where: { id: payment.id },
            // QA fix (B2): stamp deletedAt alongside isDeleted, the
            // BIN-03 standard every other soft-delete model follows.
            data: { isDeleted: true, deletedAt: new Date() },
         });

         if (payment.purchaseId) {
            const purchase = await tx.purchase.findUnique({
               where: { id: payment.purchaseId },
            });
            if (purchase && !purchase.isDeleted) {
               const newPaid = Math.max(
                  0,
                  Number(purchase.paid || 0) - Number(payment.amount || 0),
               );
               const newDue = Math.max(0, Number(purchase.total || 0) - newPaid);
               await tx.purchase.update({
                  where: { id: purchase.id },
                  data: { paid: newPaid, due: newDue },
               });
            }
         }

         // Phase 4 (D1): audit in the same transaction.
         await logAudit(tx, {
            actor: auditActorFromContext(gate),
            action: "PAYMENT",
            entityType: "SUPPLIER_PAYMENT",
            entityId: payment.id,
            entityCustomId: payment.customId,
            summary: `Supplier payment ${payment.customId || payment.id} of ৳${Number(payment.amount || 0).toFixed(2)} voided${payment.purchaseId ? " — allocation reversed" : ""}`,
            ...auditCtx,
         });

         return { status: 200 as const, alreadyVoided: false };
      });

      if (result.status === 404) {
         return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      return NextResponse.json({
         message: result.alreadyVoided
            ? "Payment was already voided"
            : "Payment voided",
      });
   } catch {
      return NextResponse.json(
         { error: "Failed to void supplier payment" },
         { status: 500 },
      );
   }
}
