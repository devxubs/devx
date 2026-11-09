import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

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

      const totalMatches =
         products.length +
         categories.length +
         units.length +
         orders.length +
         customers.length +
         employees.length +
         suppliers.length +
         purchases.length +
         expenses.length +
         assets.length +
         matchedSettings.length;

      return NextResponse.json({
         results: {
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
            settings: matchedSettings,
         },
         totalMatches,
      });
   } catch {
      return NextResponse.json({ error: "Failed to perform global search" }, { status: 500 });
   }
}
