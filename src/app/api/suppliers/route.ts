import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";

export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   try {
      const suppliers = await prisma.supplier.findMany({
         where: { isDeleted: false },
         include: { _count: { select: { purchases: true } } },
         orderBy: { name: "asc" },
      });

      // Phase 2 (§2.5): real per-supplier purchase totals. The list UI
      // previously displayed hard-coded zeros for Total / Pay / Due
      // because the API returned no aggregates. Totals are summed from
      // the purchases themselves (non-deleted only) — `due` is the
      // outstanding payable. Additive field; existing consumers are
      // unaffected.
      const aggregates = await prisma.purchase.groupBy({
         by: ["supplierId"],
         where: { isDeleted: false, supplierId: { not: null } },
         _sum: { total: true, paid: true, due: true },
         _count: { id: true },
      });
      // Phase 3B (3.7): unallocated supplier payments stand as
      // credit, so the list's outstanding payable follows the same
      // definition as the supplier detail and the Finance report:
      // netPayable = Σ purchase due − Σ unallocated payments.
      // Allocated payments already reduced their purchase's due when
      // recorded, so they are not subtracted twice.
      const creditAggregates = await prisma.supplierPayment.groupBy({
         by: ["supplierId"],
         where: { isDeleted: false, purchaseId: null },
         _sum: { amount: true },
      });
      const creditBySupplier = new Map(
         creditAggregates.map((a) => [a.supplierId, Number(a._sum.amount || 0)]),
      );
      const totalsBySupplier = new Map(
         aggregates.map((a) => {
            const due = Number(a._sum.due || 0);
            const credit = creditBySupplier.get(a.supplierId as string) || 0;
            return [
               a.supplierId,
               {
                  total: Number(a._sum.total || 0),
                  paid: Number(a._sum.paid || 0),
                  due,
                  credit,
                  netPayable: Math.max(0, due - credit),
                  purchases: a._count.id,
               },
            ];
         }),
      );

      return NextResponse.json(
         suppliers.map((s) => {
            const credit = creditBySupplier.get(s.id) || 0;
            return {
               ...s,
               totals: totalsBySupplier.get(s.id) || {
                  total: 0,
                  paid: 0,
                  due: 0,
                  credit,
                  netPayable: 0,
                  purchases: 0,
               },
            };
         }),
      );
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

      const supplier = await prisma.supplier.create({
         data: {
            customId,
            name: name.trim(),
            email: email || null,
            phone: phone || null,
            address: address || null,
         },
      });

      return NextResponse.json(supplier, { status: 201 });
   } catch {
      return NextResponse.json(
         { error: "Failed to create supplier" },
         { status: 500 },
      );
   }
}
