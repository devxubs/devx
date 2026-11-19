import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";
import {
   lockPurchaseRow,
   standingCreditOf,
} from "@src/lib/purchaseReturns";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
} from "@src/lib/audit";

// Supplier payment ledger (Phase 3B, roadmap 3.7 / schema plan §3).
//
// A payment is always TO a supplier; allocation to a specific
// purchase is optional:
//  - Allocated: the same transaction increments that purchase's
//    `paid` and recomputes its `due` — the fields every existing
//    screen and report already reads, so no other math changes.
//  - Unallocated: the payment stands as supplier credit.
// Outstanding payable = Σ purchase due (non-deleted) − Σ unallocated
// payments − Σ standing purchase-return credit (Phase 4, D2: the
// one definition, extended by its second documented credit source;
// dueAbsorbed is already inside purchase.due and is never
// subtracted twice). Payments are voided (soft delete), never
// hard-deleted, and voiding reverses the allocation in the same
// transaction. Allocated creates/voids take the Purchase-row
// FOR UPDATE lock first (Phase 4 §2.2) so they serialize against
// purchase returns and purchase edits of the same purchase.

const PAYMENT_GATE = [
   "suppliers",
   "supplier",
   "supplier_update",
   "purchases",
   "purchase_update",
];

async function resolveSupplier(id: string) {
   return prisma.supplier.findFirst({
      where: { OR: [{ id }, { customId: id }], isDeleted: false },
   });
}

async function payableSummary(db: any, supplierId: string) {
   const [dueAgg, creditAgg, paidAgg, returnAgg] = await Promise.all([
      db.purchase.aggregate({
         where: { supplierId, isDeleted: false },
         _sum: { total: true, paid: true, due: true },
      }),
      db.supplierPayment.aggregate({
         where: { supplierId, isDeleted: false, purchaseId: null },
         _sum: { amount: true },
      }),
      db.supplierPayment.aggregate({
         where: { supplierId, isDeleted: false },
         _sum: { amount: true },
      }),
      // Phase 4 (D2): standing purchase-return credit — Σ
      // (totalAmount − creditConsumed) over non-deleted returns,
      // from stored columns alone (lib/purchaseReturns).
      db.purchaseReturn.aggregate({
         where: { supplierId, isDeleted: false },
         _sum: { totalAmount: true, creditConsumed: true },
      }),
   ]);
   const totalPurchased = Number(dueAgg._sum.total || 0);
   const purchasePaid = Number(dueAgg._sum.paid || 0);
   const totalDue = Number(dueAgg._sum.due || 0);
   const credit = Number(creditAgg._sum.amount || 0);
   const returnCredit = standingCreditOf(
      Number(returnAgg._sum.totalAmount || 0),
      Number(returnAgg._sum.creditConsumed || 0),
   );
   return {
      totalPurchased,
      purchasePaid,
      totalDue,
      credit,
      returnCredit,
      netPayable: Math.max(0, totalDue - credit - returnCredit),
      ledgerPaymentsTotal: Number(paidAgg._sum.amount || 0),
   };
}

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   try {
      const supplier = await resolveSupplier(id);
      if (!supplier) {
         return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }

      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) {
         const end = new Date(endDate);
         end.setHours(23, 59, 59, 999);
         dateFilter.lte = end;
      }

      const payments = await prisma.supplierPayment.findMany({
         where: {
            supplierId: supplier.id,
            isDeleted: false,
            ...(startDate || endDate ? { paymentDate: dateFilter } : {}),
         },
         include: {
            purchase: { select: { id: true, customId: true, invoice: true } },
            createdBy: { select: { id: true, name: true, customId: true } },
         },
         orderBy: { paymentDate: "desc" },
      });

      const summary = await payableSummary(prisma, supplier.id);

      return NextResponse.json({
         supplierId: supplier.id,
         payments: payments.map((p) => ({
            id: p.id,
            customId: p.customId,
            amount: Number(p.amount),
            paymentMethod: p.paymentMethod || "",
            paymentTxId: p.paymentTxId || "",
            paymentDate: p.paymentDate,
            note: p.note || "",
            purchaseId: p.purchaseId,
            purchaseCustomId: p.purchase?.customId || null,
            purchaseInvoice: p.purchase?.invoice || null,
            createdByName: p.createdBy?.name || "",
            createdAt: p.createdAt,
         })),
         summary,
      });
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch supplier payments" },
         { status: 500 },
      );
   }
}

export async function POST(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, PAYMENT_GATE);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      const supplier = await resolveSupplier(id);
      if (!supplier) {
         return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }

      const body = await request.json();
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
         return NextResponse.json(
            { error: "Validation error", message: "Payment amount must be greater than zero." },
            { status: 400 },
         );
      }
      const amountCents = Math.round(amount * 100);

      const purchaseId = body.purchaseId ? String(body.purchaseId) : null;
      let purchase: any = null;
      if (purchaseId) {
         purchase = await prisma.purchase.findFirst({
            where: { id: purchaseId, supplierId: supplier.id, isDeleted: false },
         });
         if (!purchase) {
            return NextResponse.json(
               {
                  error: "Validation error",
                  message: "The selected purchase does not belong to this supplier.",
               },
               { status: 400 },
            );
         }
         const dueCents = Math.round(Number(purchase.due || 0) * 100);
         if (amountCents > dueCents) {
            return NextResponse.json(
               {
                  error: "Validation error",
                  message: `Payment exceeds the outstanding due on this purchase (${Number(purchase.due).toFixed(2)}). Record the remainder as an unallocated payment if it is an advance.`,
               },
               { status: 400 },
            );
         }
      }

      const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
      if (Number.isNaN(paymentDate.getTime())) {
         return NextResponse.json(
            { error: "Validation error", message: "Invalid payment date." },
            { status: 400 },
         );
      }

      const auditCtx = requestAuditContext(request);

      const result = await prisma.$transaction(async (tx) => {
         // QA fix (S2): re-read the purchase INSIDE the transaction
         // and validate + compute from that fresh row. Previously the
         // due was validated from a read taken before the transaction
         // and `paid` was computed from the same stale object, so two
         // simultaneous allocated payments could both validate
         // against one due and desync paid/due from the payment
         // records. The pre-transaction check above stays as the fast
         // path; this in-transaction check is the authoritative one.
         // Validation runs before any write, so a failure returns
         // without persisting anything.
         //
         // Phase 4 (§2.2 companion): an allocated payment takes the
         // Purchase-row FOR UPDATE lock as its first statement —
         // the QA re-read above is a snapshot read and does not by
         // itself serialize against a concurrent purchase return or
         // purchase edit rewriting the same paid/due.
         let freshPurchase: any = null;
         if (purchase) {
            const locked = await lockPurchaseRow(tx, purchase.id);
            if (!locked) {
               return {
                  ok: false as const,
                  message: "The selected purchase does not belong to this supplier.",
               };
            }
            freshPurchase = await tx.purchase.findFirst({
               where: { id: purchase.id, supplierId: supplier.id, isDeleted: false },
            });
            if (!freshPurchase) {
               return {
                  ok: false as const,
                  message: "The selected purchase does not belong to this supplier.",
               };
            }
            const freshDueCents = Math.round(Number(freshPurchase.due || 0) * 100);
            if (amountCents > freshDueCents) {
               return {
                  ok: false as const,
                  message: `Payment exceeds the outstanding due on this purchase (${Number(freshPurchase.due).toFixed(2)}). Record the remainder as an unallocated payment if it is an advance.`,
               };
            }
         }

         const { customId } = await generateNextEntityId("SUPPLIER_PAYMENT", tx);
         const payment = await tx.supplierPayment.create({
            data: {
               customId,
               supplierId: supplier.id,
               purchaseId: freshPurchase ? freshPurchase.id : null,
               amount: amountCents / 100,
               paymentMethod: body.paymentMethod
                  ? String(body.paymentMethod).trim()
                  : null,
               paymentTxId: body.paymentTxId
                  ? String(body.paymentTxId).trim()
                  : null,
               paymentDate,
               note: body.note ? String(body.note).trim() : null,
               createdById: gate.userId,
            },
         });

         if (freshPurchase) {
            const newPaid = Number(freshPurchase.paid || 0) + amountCents / 100;
            const newDue = Math.max(0, Number(freshPurchase.total || 0) - newPaid);
            await tx.purchase.update({
               where: { id: freshPurchase.id },
               data: { paid: newPaid, due: newDue },
            });
         }

         // Phase 4 (D1): audit in the same transaction.
         await logAudit(tx, {
            actor: auditActorFromContext(gate),
            action: "PAYMENT",
            entityType: "SUPPLIER_PAYMENT",
            entityId: payment.id,
            entityCustomId: payment.customId,
            summary: freshPurchase
               ? `Supplier payment ${payment.customId} of ৳${(amountCents / 100).toFixed(2)} allocated to purchase ${freshPurchase.customId || freshPurchase.id}`
               : `Supplier payment ${payment.customId} of ৳${(amountCents / 100).toFixed(2)} recorded as unallocated credit`,
            ...auditCtx,
         });

         const summary = await payableSummary(tx, supplier.id);
         return { ok: true as const, payment, summary };
      });

      if (!result.ok) {
         return NextResponse.json(
            { error: "Validation error", message: result.message },
            { status: 400 },
         );
      }

      return NextResponse.json(
         {
            payment: {
               id: result.payment.id,
               customId: result.payment.customId,
               amount: Number(result.payment.amount),
               paymentMethod: result.payment.paymentMethod || "",
               paymentTxId: result.payment.paymentTxId || "",
               paymentDate: result.payment.paymentDate,
               note: result.payment.note || "",
               purchaseId: result.payment.purchaseId,
            },
            summary: result.summary,
         },
         { status: 201 },
      );
   } catch {
      return NextResponse.json(
         { error: "Failed to record supplier payment" },
         { status: 500 },
      );
   }
}
