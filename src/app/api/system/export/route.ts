import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(request: NextRequest) {
   // SEC-07 fix: this data export is administrator-only.
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

      // P2-5 (backup honesty): this is a PARTIAL data export, not a
      // backup — it covers the areas below only and omits users,
      // purchases, supplier payments, purchase returns, stock
      // movements, product variants, warehouses, notifications,
      // chat and audit logs. The manifest states that scope inside
      // the payload itself (additive field; the Settings download —
      // the only consumer — is unaffected), matching the deployment
      // guide §7 wording: a full backup requires a database dump
      // (mysqldump) by the administrator, and there is no in-app
      // restore for this JSON.
      const rowCounts = {
         settings: settings ? 1 : 0,
         products: products.length,
         categories: categories.length,
         units: units.length,
         orders: orders.length,
         customers: customers.length,
         suppliers: suppliers.length,
         expenses: expenses.length,
         assets: assets.length,
         roles: roles.length,
      };
      const manifest = {
         partial: true,
         scope:
            "Partial data export — NOT a complete backup. Only the tables in includedTables are present; users, purchases, supplier payments, purchase returns, stock movements, product variants, warehouses, notifications, chat and audit logs are NOT included. A full backup requires a database dump (mysqldump) by the administrator. There is no restore path for this file.",
         includedTables: Object.keys(rowCounts),
         rowCounts,
      };

      const backupData = {
         version: "1.0.0",
         exportedAt: new Date().toISOString(),
         exportedBy: session.email,
         manifest,
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
            "Content-Disposition": `attachment; filename="devx_pos_export_${Date.now()}.json"`,
         },
      });
   } catch {
      return NextResponse.json(
         { error: "Failed to generate data export" },
         { status: 500 },
      );
   }
}
