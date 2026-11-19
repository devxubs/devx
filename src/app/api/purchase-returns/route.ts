import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { parsePagination } from "@src/lib/pagination";
import { standingCreditOf } from "@src/lib/purchaseReturns";

// Purchase returns — read side (Phase 4, D2).
//
// Lists non-deleted returns for one purchase (?purchaseId=) or one
// supplier (?supplierId=), newest first, with their lines. Creation
// lives under /api/purchases/[id]/returns and reversal (delete)
// under /api/purchase-returns/[id]. Deleted returns disappear from
// lists exactly like voided supplier payments do; the audit log
// keeps the permanent trail.
//
// Follow-up round: the read side carries the SAME permission gate
// as the create/reverse routes (it was previously open to any
// active session) and is bounded through the shared pagination
// parser. The per-purchase / per-supplier lists are small, so the
// parser is called with a 100-row default/cap: existing consumers
// (purchase detail, return form) send no page params and receive
// the same { returns: [...] } shape as before, while a pathological
// filter can no longer pull an unbounded result set.

const RETURN_GATE = [
   "suppliers",
   "supplier",
   "supplier_update",
   "purchases",
   "purchase_update",
];

export async function GET(request: NextRequest) {
   const gate = await requirePermission(request, RETURN_GATE);
   if (gate instanceof NextResponse) return gate;

   const { searchParams } = new URL(request.url);
   const purchaseId = searchParams.get("purchaseId")?.trim() || "";
   const supplierId = searchParams.get("supplierId")?.trim() || "";
   const { limit, skip } = parsePagination(searchParams, 100, 100);

   if (!purchaseId && !supplierId) {
      return NextResponse.json(
         { error: "A purchaseId or supplierId filter is required" },
         { status: 400 },
      );
   }

   try {
      const returns = await prisma.purchaseReturn.findMany({
         where: {
            isDeleted: false,
            ...(purchaseId ? { purchaseId } : {}),
            ...(supplierId ? { supplierId } : {}),
         },
         include: {
            items: true,
            purchase: { select: { id: true, customId: true, invoice: true } },
            supplier: { select: { id: true, customId: true, name: true } },
            createdBy: { select: { id: true, name: true, customId: true } },
         },
         orderBy: { createdAt: "desc" },
         skip,
         take: limit,
      });

      return NextResponse.json({
         returns: returns.map((r) => ({
            id: r.id,
            customId: r.customId,
            purchaseId: r.purchaseId,
            purchaseCustomId: r.purchase?.customId || null,
            purchaseInvoice: r.purchase?.invoice || null,
            supplierId: r.supplierId,
            supplierName: r.supplier?.name || null,
            totalAmount: Number(r.totalAmount),
            settlement: r.settlement,
            creditConsumed: Number(r.creditConsumed),
            standingCredit: standingCreditOf(
               Number(r.totalAmount),
               Number(r.creditConsumed),
            ),
            reason: r.reason || "",
            note: r.note || "",
            createdByName: r.createdBy?.name || "",
            createdAt: r.createdAt,
            items: (r.items || []).map((it) => ({
               id: it.id,
               purchaseItemId: it.purchaseItemId,
               productId: it.productId,
               variantId: it.variantId,
               name: it.name,
               code: it.code || "",
               quantity: it.quantity,
               price: Number(it.price),
               subtotal: Number(it.subtotal),
            })),
         })),
      });
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch purchase returns" },
         { status: 500 },
      );
   }
}
