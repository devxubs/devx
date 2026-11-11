import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(request: NextRequest) {
   // SEC-07 fix: a full-database export is administrator-only.
   const gate = await requireAdmin(request);
   if (gate instanceof NextResponse) return gate;
   const session = gate.session;

   try {
      const [
         settings,
         products,
         categories,
         units,
         orders,
         customers,
         suppliers,
         expenses,
         assets,
         roles,
      ] = await Promise.all([
         prisma.storeSetting.findUnique({ where: { id: "default" } }),
         prisma.product.findMany({ where: { isDeleted: false } }),
         prisma.category.findMany(),
         prisma.unit.findMany(),
         prisma.order.findMany({
            where: { isDeleted: false },
            include: { items: true, customer: true },
         }),
         prisma.customer.findMany(),
         prisma.supplier.findMany({ where: { isDeleted: false } }),
         prisma.expense.findMany({ where: { isDeleted: false } }),
         prisma.asset.findMany({ where: { isDeleted: false } }),
         prisma.role.findMany(),
      ]);

      const backupData = {
         version: "1.0.0",
         exportedAt: new Date().toISOString(),
         exportedBy: session.email,
         settings,
         products,
         categories,
         units,
         orders,
         customers,
         suppliers,
         expenses,
         assets,
         roles,
      };

      const jsonString = JSON.stringify(backupData, null, 2);

      return new NextResponse(jsonString, {
         status: 200,
         headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="devx_pos_backup_${Date.now()}.json"`,
         },
      });
   } catch {
      return NextResponse.json(
         { error: "Failed to generate database backup" },
         { status: 500 },
      );
   }
}
