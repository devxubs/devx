import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const { searchParams } = new URL(request.url);
   const q = searchParams.get("q")?.trim() || "";

   if (!q || q.length < 1) {
      return NextResponse.json({
         results: {
            products: [],
            categories: [],
            units: [],
            orders: [],
            customers: [],
            employees: [],
            suppliers: [],
            purchases: [],
            expenses: [],
            assets: [],
            settings: [],
         },
         totalMatches: 0,
      });
   }

   try {
      const [
         products,
         categories,
         units,
         orders,
         customers,
         employees,
         suppliers,
         purchases,
         expenses,
         assets,
      ] = await Promise.all([
         // 1. Products
         prisma.product.findMany({
            where: {
               isDeleted: false,
               OR: [
                  { productName: { contains: q } },
                  { customId: { contains: q } },
                  { productCode: { contains: q } },
                  { productSku: { contains: q } },
               ],
            },
            take: 5,
            select: {
               id: true,
               customId: true,
               productName: true,
               productCode: true,
               regularPrice: true,
               quantity: true,
            },
         }),

         // 2. Categories
         prisma.category.findMany({
            where: {
               OR: [
                  { name: { contains: q } },
                  { customId: { contains: q } },
               ],
            },
            take: 4,
            select: {
               id: true,
               customId: true,
               name: true,
            },
         }),

         // 3. Units
         prisma.unit.findMany({
            where: {
               OR: [
                  { name: { contains: q } },
                  { customId: { contains: q } },
               ],
            },
            take: 4,
            select: {
               id: true,
               customId: true,
               name: true,
            },
         }),

         // 4. Orders
         prisma.order.findMany({
            where: {
               isDeleted: false,
               OR: [
                  { orderCode: { contains: q } },
                  { orderId: { contains: q } },
                  { customId: { contains: q } },
                  { invoiceNo: { contains: q } },
                  { customer: { name: { contains: q } } },
               ],
            },
            take: 5,
            select: {
               id: true,
               orderCode: true,
               customId: true,
               orderId: true,
               invoiceNo: true,
               total: true,
               status: true,
               customer: { select: { name: true } },
            },
         }),

         // 5. Customers
         prisma.customer.findMany({
            where: {
               OR: [
                  { name: { contains: q } },
                  { customId: { contains: q } },
                  { phone: { contains: q } },
                  { email: { contains: q } },
               ],
            },
            take: 5,
            select: {
               id: true,
               customId: true,
               name: true,
               phone: true,
               email: true,
            },
         }),

         // 6. Employees / Users
         prisma.user.findMany({
            where: {
               OR: [
                  { name: { contains: q } },
                  { customId: { contains: q } },
                  { email: { contains: q } },
                  { phoneNumber: { contains: q } },
               ],
            },
            take: 5,
            select: {
               id: true,
               customId: true,
               name: true,
               email: true,
               role: { select: { name: true } },
            },
         }),

         // 7. Suppliers
         prisma.supplier.findMany({
            where: {
               isDeleted: false,
               OR: [
                  { name: { contains: q } },
                  { customId: { contains: q } },
                  { phone: { contains: q } },
                  { email: { contains: q } },
               ],
            },
            take: 5,
            select: {
               id: true,
               customId: true,
               name: true,
               phone: true,
            },
         }),

         // 8. Purchases
         prisma.purchase.findMany({
            where: {
               isDeleted: false,
               OR: [
                  { invoice: { contains: q } },
                  { customId: { contains: q } },
                  { supplier: { name: { contains: q } } },
               ],
            },
            take: 5,
            select: {
               id: true,
               customId: true,
               invoice: true,
               total: true,
               supplier: { select: { name: true } },
            },
         }),

         // 9. Expenses
         prisma.expense.findMany({
            where: {
               isDeleted: false,
               OR: [
                  { type: { contains: q } },
                  { customId: { contains: q } },
                  { note: { contains: q } },
               ],
            },
            take: 5,
            select: {
               id: true,
               customId: true,
               type: true,
               amount: true,
               note: true,
            },
         }),

         // 10. Assets
         prisma.asset.findMany({
            where: {
               isDeleted: false,
               OR: [
                  { name: { contains: q } },
                  { customId: { contains: q } },
                  { category: { contains: q } },
               ],
            },
            take: 5,
            select: {
               id: true,
               customId: true,
               name: true,
               category: true,
               value: true,
            },
         }),
      ]);

      // 11. Searchable Settings Pages
      const settingsPages = [
         { name: "General Store Settings", tab: "general", keywords: "store currency logo timezone date" },
         { name: "POS & Sales Settings", tab: "sales", keywords: "discount tax vat delivery payment invoice pos" },
         { name: "Products & Inventory Settings", tab: "products", keywords: "stock threshold category barcode sku" },
         { name: "Customer & Supplier Settings", tab: "customers", keywords: "customer supplier phone address default" },
         { name: "Purchases & Expenses Settings", tab: "purchases", keywords: "purchase expense category budget" },
         { name: "Invoice & Printing Settings", tab: "invoice", keywords: "invoice printing receipt header footer paper layout" },
         { name: "Roles & Permissions", tab: "permissions", keywords: "roles permissions admin cashier manager access" },
         { name: "Appearance & Theme", tab: "appearance", keywords: "theme color dark mode light mode font layout" },
         { name: "Notifications & System Alerts", tab: "notifications", keywords: "notifications alerts sound low stock backup" },
         { name: "Entity ID Prefixes & Numbering", tab: "prefixes", keywords: "prefix sequential format id custom id" },
      ];

      const qLower = q.toLowerCase();
      const matchedSettings = settingsPages.filter(
         (s) => s.name.toLowerCase().includes(qLower) || s.keywords.includes(qLower) || s.tab.includes(qLower),
      );

      // BUG-G2 (Full Live QA Audit 2026-11-25): global search
      // returned every entity type to any signed-in account —
      // including employees, suppliers, purchases, expenses and
      // assets the caller cannot see anywhere else in the app.
      // Sections are now filtered by the same permissions that gate
      // their own list endpoints. (Categories/units are reference
      // data shared by all staff forms and stay visible.)
      const can = (keys: string[]) => sessionGate.hasPermission(keys);
      const vProducts = can(["products", "product", "products_read", "product_view_product"]) ? products : [];
      const vOrders = can(["orders", "order", "order_view_order"]) ? orders : [];
      const vCustomers = can(["customers", "customer", "customer_view_customer"]) ? customers : [];
      const vEmployees = can(["users", "user", "user_view_user"]) ? employees : [];
      const vSuppliers = can(["suppliers", "supplier", "supplier_view_supplier"]) ? suppliers : [];
      const vPurchases = can(["purchases", "purchase", "purchase_view_purchase"]) ? purchases : [];
      const vExpenses = can(["expenses", "expense", "expense_view_expense"]) ? expenses : [];
      const vAssets = can(["assets", "asset", "asset_view_asset"]) ? assets : [];
      const vSettings = can(["settings", "setting", "setting_view_setting"]) ? matchedSettings : [];

      const totalMatches =
         vProducts.length +
         categories.length +
         units.length +
         vOrders.length +
         vCustomers.length +
         vEmployees.length +
         vSuppliers.length +
         vPurchases.length +
         vExpenses.length +
         vAssets.length +
         vSettings.length;

      return NextResponse.json({
         results: {
            products: vProducts,
            categories,
            units,
            orders: vOrders,
            customers: vCustomers,
            employees: vEmployees,
            suppliers: vSuppliers,
            purchases: vPurchases,
            expenses: vExpenses,
            assets: vAssets,
            settings: vSettings,
         },
         totalMatches,
      });
   } catch {
      return NextResponse.json({ error: "Failed to perform global search" }, { status: 500 });
   }
}
