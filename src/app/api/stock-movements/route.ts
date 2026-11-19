import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { parsePagination } from "@src/lib/pagination";

// Phase 3A (3.2): read API for the Stock workspace Movements tab.
// StockMovement stores: productId, type, SIGNED quantity, note,
// orderId / purchaseId, variantId (plain string), createdAt. It has
// NO resulting-stock column and NO user column — this endpoint only
// returns what exists; variant names and order/purchase references
// (customId) are resolved with lookups.
export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const { searchParams } = new URL(request.url);
   const { page, limit } = parsePagination(searchParams, 20);
   const skip = (page - 1) * limit;
   const productId = searchParams.get("productId")?.trim() || "";
   const type = searchParams.get("type")?.trim() || "";
   const search = searchParams.get("search")?.trim() || "";
   const startDate = searchParams.get("startDate")?.trim() || "";
   const endDate = searchParams.get("endDate")?.trim() || "";

   const where: any = {};

   if (productId) where.productId = productId;
   if (type && type !== "All") where.type = type;

   if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
         const d = new Date(startDate);
         if (!Number.isNaN(d.getTime())) where.createdAt.gte = d;
      }
      if (endDate) {
         const d = new Date(endDate);
         if (!Number.isNaN(d.getTime())) {
            // Inclusive of the whole end day.
            d.setHours(23, 59, 59, 999);
            where.createdAt.lte = d;
         }
      }
      if (Object.keys(where.createdAt).length === 0) delete where.createdAt;
   }

   try {
      // Search matches an order/purchase reference (customId) or a
      // product name — resolve to ids first, then filter movements.
      if (search) {
         const [orders, purchases, products] = await Promise.all([
            prisma.order.findMany({
               where: { customId: { contains: search } },
               select: { id: true },
               take: 200,
            }),
            prisma.purchase.findMany({
               where: { customId: { contains: search } },
               select: { id: true },
               take: 200,
            }),
            prisma.product.findMany({
               where: { productName: { contains: search } },
               select: { id: true },
               take: 200,
            }),
         ]);
         where.OR = [
            { orderId: { in: orders.map((o) => o.id) } },
            { purchaseId: { in: purchases.map((p) => p.id) } },
            { productId: { in: products.map((p) => p.id) } },
         ];
      }

      const [movements, total] = await Promise.all([
         prisma.stockMovement.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
               product: {
                  select: {
                     id: true,
                     productName: true,
                     productSku: true,
                     customId: true,
                  },
               },
            },
         }),
         prisma.stockMovement.count({ where }),
      ]);

      // Resolve variant names + order/purchase references for this page.
      const variantIds = Array.from(
         new Set(movements.map((m) => m.variantId).filter(Boolean)),
      ) as string[];
      const orderIds = Array.from(
         new Set(movements.map((m) => m.orderId).filter(Boolean)),
      ) as string[];
      const purchaseIds = Array.from(
         new Set(movements.map((m) => m.purchaseId).filter(Boolean)),
      ) as string[];

      const [variants, orders, purchases] = await Promise.all([
         variantIds.length
            ? prisma.productVariant.findMany({
                 where: { id: { in: variantIds } },
                 select: { id: true, variantName: true, sku: true },
              })
            : Promise.resolve([]),
         orderIds.length
            ? prisma.order.findMany({
                 where: { id: { in: orderIds } },
                 select: { id: true, customId: true },
              })
            : Promise.resolve([]),
         purchaseIds.length
            ? prisma.purchase.findMany({
                 where: { id: { in: purchaseIds } },
                 select: { id: true, customId: true },
              })
            : Promise.resolve([]),
      ]);

      const variantMap = new Map(variants.map((v) => [v.id, v]));
      const orderMap = new Map(orders.map((o) => [o.id, o.customId]));
      const purchaseMap = new Map(purchases.map((p) => [p.id, p.customId]));

      const rows = movements.map((m) => ({
         id: m.id,
         createdAt: m.createdAt,
         type: m.type,
         // Signed by the engine: SALE/negative = out, PURCHASE/RETURN/
         // positive = in.
         quantity: m.quantity,
         note: m.note,
         product: m.product,
         variant: m.variantId ? variantMap.get(m.variantId) || null : null,
         reference: m.orderId
            ? { kind: "order", customId: orderMap.get(m.orderId) || null }
            : m.purchaseId
              ? {
                   kind: "purchase",
                   customId: purchaseMap.get(m.purchaseId) || null,
                }
              : null,
      }));

      return NextResponse.json({ movements: rows, total, page, limit });
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch stock movements" },
         { status: 500 },
      );
   }
}
