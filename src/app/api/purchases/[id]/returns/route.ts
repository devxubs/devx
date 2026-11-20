import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";
import {
   deductStockForPurchaseReturn,
   StockReversalUnsafeError,
} from "@src/lib/stock";
import {
   computeReturnSettlement,
   validateReturnQuantities,
   lockPurchaseRow,
   CASH_REFUND_EXPENSE_TYPE,
} from "@src/lib/purchaseReturns";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
   buildChanges,
} from "@src/lib/audit";

// Create a purchase return (Phase 4, D2 — approved design:
// DEVX_POS_PHASE4_SCHEMA_FINAL_DIFF.md §2.2).
//
// Permission-gated like supplier payments (the diff doc's §4
// instruction). Everything happens in ONE interactive transaction
// whose FIRST statement locks the parent Purchase row
// (SELECT … FOR UPDATE): quantity and due reads happen only after
// the lock, so two concurrent returns — or a return racing an
// allocated payment / purchase edit — can never both validate
// against the same stale state.
//
// Settlement (owner-corrected): dueAbsorbed = min(R, purchase.due);
// purchase.total is reduced by dueAbsorbed ONLY and due is
// recomputed as total − paid; the remainder becomes supplier
// credit (default) or a cash refund. A CASH_REFUND is booked into
// the cash/bank accounting as a NEGATIVE Expense row (money back
// in) in the same transaction, so Finance reporting sees the
// inflow through the existing expense totals — no parallel ledger.

const RETURN_GATE = [
   "suppliers",
   "supplier",
   "supplier_update",
   "purchases",
   "purchase_update",
];

class ReturnValidationError extends Error {
   status: number;
   constructor(message: string, status = 400) {
      super(message);
      this.name = "ReturnValidationError";
      this.status = status;
   }
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export async function POST(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, RETURN_GATE);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      const body = await request.json();
      const rawItems: any[] = Array.isArray(body.items) ? body.items : [];
      if (rawItems.length === 0) {
         return NextResponse.json(
            {
               error: "Validation error",
               message: "Select at least one item to return.",
            },
            { status: 400 },
         );
      }

      // Resolve the purchase (existence only — the authoritative
      // read happens inside the transaction, after the row lock).
      const purchaseRef = await prisma.purchase.findFirst({
         where: { OR: [{ id }, { customId: id }] },
         select: { id: true },
      });
      if (!purchaseRef) {
         return NextResponse.json(
            { error: "Purchase not found" },
            { status: 404 },
         );
      }
      const purchaseId = purchaseRef.id;

      // Merge duplicate lines for the same purchase item.
      const requestedByItem = new Map<string, number>();
      for (const raw of rawItems) {
         const purchaseItemId = raw?.purchaseItemId
            ? String(raw.purchaseItemId)
            : "";
         const quantity = Number(raw?.quantity);
         if (!purchaseItemId) {
            return NextResponse.json(
               {
                  error: "Validation error",
                  message: "Every return line must name a purchase item.",
               },
               { status: 400 },
            );
         }
         requestedByItem.set(
            purchaseItemId,
            (requestedByItem.get(purchaseItemId) || 0) + quantity,
         );
      }

      const auditCtx = requestAuditContext(request);

      const result = await prisma.$transaction(async (tx) => {
         // 1. FIRST statement: serialize on the Purchase row.
         const locked = await lockPurchaseRow(tx, purchaseId);
         if (!locked) throw new ReturnValidationError("Purchase not found", 404);

         // 2. Authoritative reads — only after the lock is held.
         const purchase = await tx.purchase.findUnique({
            where: { id: purchaseId },
            include: { items: true, supplier: { select: { name: true } } },
         });
         if (!purchase || purchase.isDeleted) {
            throw new ReturnValidationError("Purchase not found", 404);
         }

         const purchaseItemById = new Map(
            purchase.items.map((it) => [it.id, it]),
         );
         const lines: Array<{
            purchaseItem: (typeof purchase.items)[number];
            quantity: number;
         }> = [];
         for (const [purchaseItemId, quantity] of requestedByItem) {
            const purchaseItem = purchaseItemById.get(purchaseItemId);
            if (!purchaseItem) {
               throw new ReturnValidationError(
                  "A selected item does not belong to this purchase.",
               );
            }
            lines.push({ purchaseItem, quantity });
         }

         // Cumulative already-returned per purchase line (non-deleted
         // returns only) — read under the lock, so it is the latest
         // committed state, not a stale snapshot.
         const priorReturnItems = await tx.purchaseReturnItem.findMany({
            where: {
               purchaseItemId: { in: Array.from(requestedByItem.keys()) },
               purchaseReturn: { isDeleted: false },
            },
            select: { purchaseItemId: true, quantity: true },
         });
         const alreadyByItem = new Map<string, number>();
         for (const row of priorReturnItems) {
            alreadyByItem.set(
               row.purchaseItemId,
               (alreadyByItem.get(row.purchaseItemId) || 0) + row.quantity,
            );
         }

         // Current on-hand stock per line (product pool, or the
         // variant's own pool for variant lines), read under the
         // same lock. A return can never deduct units that were
         // already sold — the validator caps each line at the stock
         // still on hand and rejects with a clear business error
         // BEFORE anything is written, instead of surfacing the
         // stock engine's never-negative guard as a raw failure.
         // Lines whose product is missing or does not track
         // inventory get onHand = null (stock does not limit them —
         // the engine skips those lines too).
         const stockProductIds = Array.from(
            new Set(
               lines
                  .map(({ purchaseItem }) => purchaseItem.productId)
                  .filter((v): v is string => Boolean(v)),
            ),
         );
         const stockVariantIds = Array.from(
            new Set(
               lines
                  .map(({ purchaseItem }) => purchaseItem.variantId)
                  .filter((v): v is string => Boolean(v)),
            ),
         );
         const stockProducts = stockProductIds.length
            ? await tx.product.findMany({
                 where: { id: { in: stockProductIds } },
                 select: { id: true, quantity: true, trackInventory: true },
              })
            : [];
         const stockVariants = stockVariantIds.length
            ? await tx.productVariant.findMany({
                 where: { id: { in: stockVariantIds } },
                 select: { id: true, quantity: true },
              })
            : [];
         const stockProductById = new Map(
            stockProducts.map((p: any) => [p.id, p]),
         );
         const stockVariantById = new Map(
            stockVariants.map((v: any) => [v.id, v]),
         );
         const onHandFor = (purchaseItem: any): number | null => {
            if (!purchaseItem.productId) return null;
            const product = stockProductById.get(purchaseItem.productId);
            if (!product || product.trackInventory === false) return null;
            if (purchaseItem.variantId) {
               const variant = stockVariantById.get(purchaseItem.variantId);
               return variant ? Number(variant.quantity) || 0 : null;
            }
            return Number(product.quantity) || 0;
         };

         const quantityError = validateReturnQuantities(
            lines.map(({ purchaseItem, quantity }) => ({
               name: purchaseItem.name,
               purchased: purchaseItem.quantity,
               alreadyReturned: alreadyByItem.get(purchaseItem.id) || 0,
               requested: quantity,
               onHand: onHandFor(purchaseItem),
            })),
         );
         if (quantityError) throw new ReturnValidationError(quantityError);

         // 3. Settlement from the LOCKED purchase state.
         const itemRows = lines.map(({ purchaseItem, quantity }) => ({
            purchaseItemId: purchaseItem.id,
            productId: purchaseItem.productId,
            variantId: purchaseItem.variantId,
            name: purchaseItem.name,
            code: purchaseItem.code,
            quantity,
            price: Number(purchaseItem.price),
            subtotal: round2(quantity * Number(purchaseItem.price)),
         }));
         const totalAmount = round2(
            itemRows.reduce((sum, r) => sum + r.subtotal, 0),
         );

         let settlement;
         try {
            settlement = computeReturnSettlement(
               totalAmount,
               Number(purchase.due),
               body.settlement,
            );
         } catch (err: any) {
            throw new ReturnValidationError(err.message);
         }

         // 4. The return record (PRET_ id via the shared generator).
         const { customId: pretId } = await generateNextEntityId(
            "PURCHASE_RETURN",
            tx,
         );
         const created = await tx.purchaseReturn.create({
            data: {
               customId: pretId,
               purchaseId: purchase.id,
               supplierId: purchase.supplierId || null,
               totalAmount,
               settlement: settlement.settlement,
               creditConsumed: settlement.creditConsumed,
               reason: body.reason ? String(body.reason).trim() : null,
               note: body.note ? String(body.note).trim() : null,
               createdById: gate.userId,
               items: { create: itemRows },
            },
            include: { items: true },
         });

         // 5. Stock reversal — RETURN movements, negative
         // quantities, never-negative guard (throws → whole
         // transaction rolls back).
         await deductStockForPurchaseReturn(
            tx,
            itemRows
               .filter((r) => r.productId)
               .map((r) => ({
                  productId: r.productId as string,
                  quantity: r.quantity,
                  variantId: r.variantId,
               })),
            {
               purchaseId: purchase.id,
               note: `Purchase return ${pretId} (${purchase.customId || purchase.id})`,
            },
         );

         // 6. Purchase totals: reduce total by dueAbsorbed ONLY;
         // due follows the invariant due = total − paid.
         const newTotal = round2(Number(purchase.total) - settlement.dueAbsorbed);
         const newDue = round2(newTotal - Number(purchase.paid));
         await tx.purchase.update({
            where: { id: purchase.id },
            data: { total: newTotal, due: newDue },
         });

         // 7. CASH_REFUND accounting: money back in, booked as a
         // negative Expense (see file header) in the same
         // transaction so Finance reporting reflects the inflow.
         let refundExpenseId: string | null = null;
         if (settlement.settlement === "CASH_REFUND" && settlement.remainder > 0) {
            const { customId: expenseId } = await generateNextEntityId(
               "EXPENSE",
               tx,
            );
            const expense = await tx.expense.create({
               data: {
                  customId: expenseId,
                  type: CASH_REFUND_EXPENSE_TYPE,
                  amount: -settlement.remainder,
                  note: `Cash refund received for purchase return ${pretId} (${purchase.customId || purchase.id})`,
                  createdById: gate.userId,
               },
            });
            refundExpenseId = expense.customId;
         }

         // 8. Audit — same transaction (D1 rule).
         await logAudit(tx, {
            actor: auditActorFromContext(gate),
            action: "CREATE",
            entityType: "PURCHASE_RETURN",
            entityId: created.id,
            entityCustomId: pretId,
            summary: `Purchase return ${pretId} created for ${purchase.customId || purchase.id} — ${settlement.settlement.replace(/_/g, " ").toLowerCase()}, total ৳${totalAmount.toFixed(2)}`,
            changes: buildChanges(
               null,
               {
                  totalAmount,
                  settlement: settlement.settlement,
                  dueAbsorbed: settlement.dueAbsorbed,
                  remainder: settlement.remainder,
                  creditConsumed: settlement.creditConsumed,
                  // C4-4 (audit R-4 / P2-23): record WHICH expense
                  // row booked the cash refund, so return deletion
                  // resolves it by this id instead of relying on a
                  // mutable note substring. Null for non-refund
                  // settlements (buildChanges then omits the key).
                  refundExpenseCustomId: refundExpenseId,
               },
               [
                  "totalAmount",
                  "settlement",
                  "dueAbsorbed",
                  "remainder",
                  "creditConsumed",
                  "refundExpenseCustomId",
               ],
            ),
            ...auditCtx,
         });

         return {
            purchaseReturn: created,
            purchase: {
               id: purchase.id,
               customId: purchase.customId,
               total: newTotal,
               paid: Number(purchase.paid),
               due: newDue,
            },
            settlement,
            refundExpenseId,
         };
      });

      return NextResponse.json(
         {
            purchaseReturn: {
               id: result.purchaseReturn.id,
               customId: result.purchaseReturn.customId,
               purchaseId: result.purchaseReturn.purchaseId,
               supplierId: result.purchaseReturn.supplierId,
               totalAmount: Number(result.purchaseReturn.totalAmount),
               settlement: result.purchaseReturn.settlement,
               creditConsumed: Number(result.purchaseReturn.creditConsumed),
               reason: result.purchaseReturn.reason || "",
               note: result.purchaseReturn.note || "",
               createdAt: result.purchaseReturn.createdAt,
               items: result.purchaseReturn.items.map((it: any) => ({
                  id: it.id,
                  purchaseItemId: it.purchaseItemId,
                  name: it.name,
                  quantity: it.quantity,
                  price: Number(it.price),
                  subtotal: Number(it.subtotal),
               })),
            },
            purchase: result.purchase,
            settlement: {
               dueAbsorbed: result.settlement.dueAbsorbed,
               remainder: result.settlement.remainder,
               settlement: result.settlement.settlement,
               standingCredit: result.settlement.standingCredit,
            },
            refundExpenseId: result.refundExpenseId,
         },
         { status: 201 },
      );
   } catch (err: any) {
      if (err instanceof ReturnValidationError) {
         return NextResponse.json(
            { error: "Validation error", message: err.message },
            { status: err.status },
         );
      }
      if (err instanceof StockReversalUnsafeError) {
         return NextResponse.json(
            { error: "Stock reversal unsafe", message: err.message },
            { status: 409 },
         );
      }
      console.error("POST /api/purchases/[id]/returns error:", err);
      return NextResponse.json(
         { error: "Failed to create purchase return" },
         { status: 500 },
      );
   }
}
