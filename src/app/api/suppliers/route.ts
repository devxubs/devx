import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";
import { parsePagination } from "@src/lib/pagination";
import { standingCreditOf } from "@src/lib/purchaseReturns";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
} from "@src/lib/audit";

export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const { searchParams } = new URL(request.url);

   try {
      // P4-2: pagination is now the DEFAULT (and only) shape — the
      // shared parsePagination bounds (default 20, max 100) always
      // apply and the response is always { suppliers, total, page,
      // limit }, with the aggregates below computed for just the
      // page's suppliers. The previous no-parameter bare enriched
      // array was an unbounded full-table load. Consumers that
      // render the full set (the Suppliers page, the export loader)
      // walk the bounded pages via lib/fetchAllPages, so the rows
      // and per-supplier totals they show are unchanged.
      const { page, limit, skip } = parsePagination(searchParams, 20);
      const total = await prisma.supplier.count({ where: { isDeleted: false } });
      const suppliers = await prisma.supplier.findMany({
         where: { isDeleted: false },
         include: { _count: { select: { purchases: true } } },
         orderBy: { name: "asc" },
         skip,
         take: limit,
      });
      const pageSupplierIds = suppliers.map((s) => s.id);

      // Phase 2 (§2.5): real per-supplier purchase totals. The list UI
      // previously displayed hard-coded zeros for Total / Pay / Due
      // because the API returned no aggregates. Totals are summed from
      // the purchases themselves (non-deleted only) — `due` is the
      // outstanding payable. Additive field; existing consumers are
      // unaffected.
      const aggregates = await prisma.purchase.groupBy({
         by: ["supplierId"],
         where: {
            isDeleted: false,
            supplierId: pageSupplierIds ? { in: pageSupplierIds } : { not: null },
         },
         _sum: { total: true, paid: true, due: true },
         _count: { id: true },
      });
      // Phase 3B (3.7): unallocated supplier payments stand as
      // credit, so the list's outstanding payable follows the same
      // definition as the supplier detail and the Finance report:
      // netPayable = Σ purchase due − Σ unallocated payments.
      // Allocated payments already reduced their purchase's due when
      // recorded, so they are not subtracted twice.
      // Phase 4 (D2): standing purchase-return credit joins the
      // credit term as its second documented source — the same one
      // definition, extended (dueAbsorbed already reduced purchase
      // due at return creation and is never subtracted again).
      const creditAggregates = await prisma.supplierPayment.groupBy({
         by: ["supplierId"],
         where: {
            isDeleted: false,
            purchaseId: null,
            ...(pageSupplierIds ? { supplierId: { in: pageSupplierIds } } : {}),
         },
         _sum: { amount: true },
      });
      const creditBySupplier = new Map(
         creditAggregates.map((a) => [a.supplierId, Number(a._sum.amount || 0)]),
      );
      const returnCreditAggregates = await prisma.purchaseReturn.groupBy({
         by: ["supplierId"],
         where: {
            isDeleted: false,
            supplierId: pageSupplierIds ? { in: pageSupplierIds } : { not: null },
         },
         _sum: { totalAmount: true, creditConsumed: true },
      });
      const returnCreditBySupplier = new Map(
         returnCreditAggregates.map((a) => [
            a.supplierId,
            standingCreditOf(
               Number(a._sum.totalAmount || 0),
               Number(a._sum.creditConsumed || 0),
            ),
         ]),
      );
      const totalsBySupplier = new Map(
         aggregates.map((a) => {
            const due = Number(a._sum.due || 0);
            const credit = creditBySupplier.get(a.supplierId as string) || 0;
            const returnCredit =
               returnCreditBySupplier.get(a.supplierId as string) || 0;
            return [
               a.supplierId,
               {
                  total: Number(a._sum.total || 0),
                  paid: Number(a._sum.paid || 0),
                  due,
                  credit,
                  returnCredit,
                  netPayable: Math.max(0, due - credit - returnCredit),
                  purchases: a._count.id,
               },
            ];
         }),
      );

      const enriched = suppliers.map((s) => {
         const credit = creditBySupplier.get(s.id) || 0;
         const returnCredit = returnCreditBySupplier.get(s.id) || 0;
         return {
            ...s,
            totals: totalsBySupplier.get(s.id) || {
               total: 0,
               paid: 0,
               due: 0,
               credit,
               returnCredit,
               netPayable: 0,
               purchases: 0,
            },
         };
      });

      return NextResponse.json({ suppliers: enriched, total, page, limit });
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch suppliers" },
         { status: 500 },
      );
   }
}

export async function POST(request: NextRequest) {
   const gate = await requirePermission(request, ["suppliers", "supplier", "supplier_create"]);
   if (gate instanceof NextResponse) return gate;

   try {
      const body = await request.json();
      const { name, email, phone, address } = body;

      if (!name) {
         return NextResponse.json(
            { error: "Supplier name is required" },
            { status: 400 },
         );
      }

      const { customId } = await generateNextEntityId("SUPPLIER");
      const auditCtx = requestAuditContext(request);

      // P2-4: supplier creation is audited in the same transaction.
      const supplier = await prisma.$transaction(async (tx) => {
         const created = await tx.supplier.create({
            data: {
               customId,
               name: name.trim(),
               email: email || null,
               phone: phone || null,
               address: address || null,
            },
         });

         await logAudit(tx, {
            actor: auditActorFromContext(gate),
            action: "CREATE",
            entityType: "SUPPLIER",
            entityId: created.id,
            entityCustomId: created.customId,
            summary: `Supplier ${created.customId || created.name} created — ${created.name}`,
            ...auditCtx,
         });

         return created;
      });

      return NextResponse.json(supplier, { status: 201 });
   } catch {
      return NextResponse.json(
         { error: "Failed to create supplier" },
         { status: 500 },
      );
   }
}
