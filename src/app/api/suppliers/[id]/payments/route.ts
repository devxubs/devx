import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";
import {
   lockPurchaseRow,
   lockSupplierRow,
   standingCreditOf,
   getStandingReturnCredit,
   planReturnCreditApplication,
   RETURN_CREDIT_PAYMENT_METHOD,
} from "@src/lib/purchaseReturns";
import {
   isMobilePaymentMethod,
   findSupplierPaymentWithTxId,
   supplierTxIdClashMessage,
   DuplicateSupplierTxIdError,
} from "@src/lib/payments";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
} from "@src/lib/audit";
import { parsePagination } from "@src/lib/pagination";

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
   // Read gate (B3, audit S-1 / P1-9): the PAYMENT_GATE family (the
   // supplier/purchase write family) guards this read because the
   // ledger exposes payment amounts and transaction IDs.
   const gate = await requirePermission(request, PAYMENT_GATE);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

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

      // P4-2: the ledger rows are paginated with the shared
      // parsePagination bounds (default 100, max 100); the response
      // gains total/page/limit. The summary below stays a GLOBAL
      // aggregate over the supplier's whole ledger (unchanged
      // figures). The ledger UI walks the bounded pages and renders
      // the same complete list as the old unbounded response.
      const { page, limit, skip } = parsePagination(searchParams, 100);
      const paymentsWhere: any = {
         supplierId: supplier.id,
         isDeleted: false,
         ...(startDate || endDate ? { paymentDate: dateFilter } : {}),
      };
      const [payments, paymentsTotal] = await Promise.all([
         prisma.supplierPayment.findMany({
            where: paymentsWhere,
            include: {
               purchase: { select: { id: true, customId: true, invoice: true } },
               createdBy: { select: { id: true, name: true, customId: true } },
            },
            orderBy: { paymentDate: "desc" },
            skip,
            take: limit,
         }),
         prisma.supplierPayment.count({ where: paymentsWhere }),
      ]);

      const summary = await payableSummary(prisma, supplier.id);

      return NextResponse.json({
         supplierId: supplier.id,
         total: paymentsTotal,
         page,
         limit,
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

      // B2-3 (audit C-9 / P1-7): a payment settles a purchase due
      // with cash (`amount`, as always) and/or standing purchase-
      // return credit (`applyReturnCredit`, allocated payments
      // only). Credit is not cash: it is recorded as its own ledger
      // row (method "Return Credit", no TxID) and consumes the
      // supplier's SUPPLIER_CREDIT returns oldest-first, so Σdue
      // and Σstanding credit fall by the same amount and netPayable
      // moves only by the cash part — every approved payable
      // formula stays true.
      const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
      const creditAmount = round2(Number(body.applyReturnCredit ?? 0));
      if (!Number.isFinite(creditAmount) || creditAmount < 0) {
         return NextResponse.json(
            { error: "Validation error", message: "Return credit amount cannot be negative." },
            { status: 400 },
         );
      }
      const cashAmount =
         body.amount === undefined && creditAmount > 0 ? 0 : Number(body.amount);
      if (creditAmount > 0) {
         if (!Number.isFinite(cashAmount) || cashAmount < 0) {
            return NextResponse.json(
               { error: "Validation error", message: "Payment amount cannot be negative." },
               { status: 400 },
            );
         }
         if (!body.purchaseId) {
            return NextResponse.json(
               {
                  error: "Validation error",
                  message: "Return credit can only be applied to a payment allocated to a purchase.",
               },
               { status: 400 },
            );
         }
      } else if (!Number.isFinite(cashAmount) || cashAmount <= 0) {
         return NextResponse.json(
            { error: "Validation error", message: "Payment amount must be greater than zero." },
            { status: 400 },
         );
      }
      const amountCents = Math.round(cashAmount * 100);
      const creditCents = Math.round(creditAmount * 100);
      const totalCents = amountCents + creditCents;

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
         if (totalCents > dueCents) {
            return NextResponse.json(
               {
                  error: "Validation error",
                  message: `Payment exceeds the outstanding due on this purchase (${Number(purchase.due).toFixed(2)}). Record the remainder as an unallocated payment if it is an advance.`,
               },
               { status: 400 },
            );
         }
      }

      // Fast path for credit: the authoritative check re-runs
      // inside the transaction from locked, freshly-read rows.
      if (creditAmount > 0) {
         const standing = await getStandingReturnCredit(prisma, supplier.id);
         if (creditCents > Math.round(standing * 100)) {
            return NextResponse.json(
               {
                  error: "Validation error",
                  message: `Return credit of ৳${creditAmount.toFixed(2)} exceeds this supplier's standing return credit (৳${standing.toFixed(2)}).`,
               },
               { status: 400 },
            );
         }
      }

      // B2-4 (audit R-2 / P1-8): duplicate-TxID check, mirroring
      // the order side — pre-transaction here, re-checked inside
      // the transaction below. Mobile-money methods only; cash and
      // empty TxIDs are never rejected.
      const paymentMethod = body.paymentMethod
         ? String(body.paymentMethod).trim()
         : null;
      const paymentTxId = body.paymentTxId
         ? String(body.paymentTxId).trim()
         : null;
      if (paymentTxId && isMobilePaymentMethod(paymentMethod)) {
         const clash = await findSupplierPaymentWithTxId(paymentTxId);
         const clashMessage = supplierTxIdClashMessage(
            paymentMethod,
            paymentTxId,
            clash,
         );
         if (clashMessage) {
            return NextResponse.json(
               { error: "Duplicate transaction ID", message: clashMessage },
               { status: 409 },
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
            if (totalCents > freshDueCents) {
               return {
                  ok: false as const,
                  message: `Payment exceeds the outstanding due on this purchase (${Number(freshPurchase.due).toFixed(2)}). Record the remainder as an unallocated payment if it is an advance.`,
               };
            }
         }

         // B2-3: credit consumption is serialized per supplier —
         // the consumed return rows may belong to other purchases
         // of this supplier, which the purchase lock alone does
         // not cover. Lock order is always purchase → supplier.
         if (creditAmount > 0) {
            await lockSupplierRow(tx, supplier.id);
         }

         // B2-4: in-transaction duplicate-TxID re-check (narrows
         // the race exactly like the order side's S1 fix).
         if (paymentTxId && isMobilePaymentMethod(paymentMethod)) {
            const clash = await findSupplierPaymentWithTxId(
               paymentTxId,
               undefined,
               tx,
            );
            if (clash) throw new DuplicateSupplierTxIdError(paymentTxId, clash);
         }

         // B2-3: plan the credit consumption from freshly-read
         // live returns (oldest first) and apply the increments.
         // Validation happens before any write below, so a refusal
         // persists nothing.
         let creditAllocations: ReturnType<typeof planReturnCreditApplication> = [];
         if (creditAmount > 0 && freshPurchase) {
            const liveCreditReturns = await tx.purchaseReturn.findMany({
               where: {
                  supplierId: supplier.id,
                  isDeleted: false,
                  settlement: "SUPPLIER_CREDIT",
               },
               orderBy: { createdAt: "asc" },
               select: {
                  id: true,
                  customId: true,
                  totalAmount: true,
                  creditConsumed: true,
               },
            });
            try {
               creditAllocations = planReturnCreditApplication(
                  liveCreditReturns.map((r: any) => ({
                     id: r.id,
                     customId: r.customId,
                     totalAmount: Number(r.totalAmount),
                     creditConsumed: Number(r.creditConsumed),
                  })),
                  creditAmount,
                  Math.max(
                     0,
                     round2(Number(freshPurchase.due || 0) - amountCents / 100),
                  ),
               );
            } catch (err: any) {
               return { ok: false as const, message: err.message };
            }
            for (const alloc of creditAllocations) {
               await tx.purchaseReturn.update({
                  where: { id: alloc.returnId },
                  data: { creditConsumed: alloc.newCreditConsumed },
               });
            }
         }

         let payment: any = null;
         if (amountCents > 0 || creditAmount <= 0) {
            const { customId } = await generateNextEntityId("SUPPLIER_PAYMENT", tx);
            payment = await tx.supplierPayment.create({
               data: {
                  customId,
                  supplierId: supplier.id,
                  purchaseId: freshPurchase ? freshPurchase.id : null,
                  amount: amountCents / 100,
                  paymentMethod,
                  paymentTxId,
                  paymentDate,
                  note: body.note ? String(body.note).trim() : null,
                  createdById: gate.userId,
               },
            });
         }

         // The credit leg is its own ledger row: no cash moved, so
         // it carries the dedicated method and no TxID, with the
         // consumed returns named in its note.
         let creditPayment: any = null;
         if (creditAmount > 0) {
            const { customId: creditCustomId } =
               await generateNextEntityId("SUPPLIER_PAYMENT", tx);
            const creditNote =
               `Return credit applied: ` +
               creditAllocations
                  .map(
                     (a) =>
                        `${a.returnCustomId || a.returnId} ৳${a.amount.toFixed(2)}`,
                  )
                  .join(", ");
            creditPayment = await tx.supplierPayment.create({
               data: {
                  customId: creditCustomId,
                  supplierId: supplier.id,
                  purchaseId: freshPurchase ? freshPurchase.id : null,
                  amount: creditCents / 100,
                  paymentMethod: RETURN_CREDIT_PAYMENT_METHOD,
                  paymentTxId: null,
                  paymentDate,
                  note: body.note
                     ? `${creditNote} — ${String(body.note).trim()}`
                     : creditNote,
                  createdById: gate.userId,
               },
            });
         }

         if (freshPurchase) {
            const newPaid = Number(freshPurchase.paid || 0) + totalCents / 100;
            const newDue = Math.max(0, Number(freshPurchase.total || 0) - newPaid);
            await tx.purchase.update({
               where: { id: freshPurchase.id },
               data: { paid: newPaid, due: newDue },
            });
         }

         // Phase 4 (D1): audit in the same transaction.
         if (payment) {
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
         }
         if (creditPayment) {
            await logAudit(tx, {
               actor: auditActorFromContext(gate),
               action: "PAYMENT",
               entityType: "SUPPLIER_PAYMENT",
               entityId: creditPayment.id,
               entityCustomId: creditPayment.customId,
               summary: `Supplier payment ${creditPayment.customId} applied ৳${creditAmount.toFixed(2)} of standing return credit to purchase ${freshPurchase?.customId || freshPurchase?.id} (${creditAllocations.map((a) => `${a.returnCustomId || a.returnId} ৳${a.amount.toFixed(2)}`).join(", ")})`,
               // The per-return distribution is the machine-readable
               // record the void route reverses from (buildChanges
               // stores scalars only, so it rides as a JSON string).
               changes: {
                  returnCreditApplied: { from: null, to: creditAmount },
                  creditApplications: {
                     from: null,
                     to: JSON.stringify(
                        creditAllocations.map((a) => ({
                           returnId: a.returnId,
                           amount: a.amount,
                        })),
                     ),
                  },
               },
               ...auditCtx,
            });
         }

         const summary = await payableSummary(tx, supplier.id);
         return {
            ok: true as const,
            payment: payment || creditPayment,
            creditPayment,
            appliedReturnCredit: creditAmount,
            creditAllocations,
            summary,
         };
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
            creditPayment: result.creditPayment
               ? {
                    id: result.creditPayment.id,
                    customId: result.creditPayment.customId,
                    amount: Number(result.creditPayment.amount),
                    paymentMethod: result.creditPayment.paymentMethod || "",
                    paymentDate: result.creditPayment.paymentDate,
                    note: result.creditPayment.note || "",
                    purchaseId: result.creditPayment.purchaseId,
                 }
               : null,
            appliedReturnCredit: result.appliedReturnCredit,
            creditAllocations: result.creditAllocations.map((a) => ({
               returnId: a.returnId,
               returnCustomId: a.returnCustomId,
               amount: a.amount,
            })),
            summary: result.summary,
         },
         { status: 201 },
      );
   } catch (err) {
      if (err instanceof DuplicateSupplierTxIdError) {
         return NextResponse.json(
            { error: "Duplicate transaction ID", message: err.message },
            { status: 409 },
         );
      }
      return NextResponse.json(
         { error: "Failed to record supplier payment" },
         { status: 500 },
      );
   }
}
