import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";
import { addStockForPurchaseItems } from "@src/lib/stock";

export async function GET(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { searchParams } = new URL(request.url);
   const isExportAll = searchParams.get("all") === "true" || searchParams.get("export") === "true";
   const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
   const limit = isExportAll ? 10000 : Math.min(parseInt(searchParams.get("limit") || "20"), 100);
   const search = searchParams.get("search")?.trim() || "";
   const skip = isExportAll ? 0 : (page - 1) * limit;

   const where: any = { isDeleted: false };
   if (search) {
      where.OR = [
         { invoice: { contains: search } },
         { customId: { contains: search } },
         { supplier: { name: { contains: search } } },
      ];
   }

   try {
      const [purchases, total] = await Promise.all([
         prisma.purchase.findMany({
            where,
            skip,
            take: limit,
            include: {
               supplier: true,
               createdBy: { select: { id: true, name: true, email: true } },
               items: { include: { product: true } },
               attachments: true,
            },
            orderBy: { createdAt: "desc" },
         }),
         prisma.purchase.count({ where }),
      ]);

      return NextResponse.json({ purchases, total, page, limit });
   } catch {
      return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const body = await request.json();
      const {
         supplierId,
         invoice,
         items = [],
         othersCost = 0,
         discount = 0,
         paid = 0,
         note,
      } = body;

      if (!Array.isArray(items)) {
         return NextResponse.json(
            { error: "Purchase items must be an array" },
            { status: 400 },
         );
      }

      // Validate + normalise items, then recompute every total on the
      // server (PUR-02 fix: the client-sent productAmount is never
      // trusted — totals derive from validated items × prices).
      const safeMoney = (value: any) => {
         const n = Number(value);
         return Number.isFinite(n) ? Math.max(0, n) : 0;
      };

      const normalizedItems = items.map((item: any) => {
         const quantity = Math.max(1, parseInt(item.quantity) || 1);
         const price = safeMoney(item.price);
         return {
            productId: item.productId || null,
            name: item.name || "Unknown Item",
            code: item.code || null,
            quantity,
            price,
            subtotal: parseFloat((quantity * price).toFixed(2)),
         };
      });

      const productAmount = parseFloat(
         normalizedItems.reduce((sum, it) => sum + it.subtotal, 0).toFixed(2),
      );
      const others = safeMoney(othersCost);
      const disc = safeMoney(discount);
      const paidAmount = safeMoney(paid);
      const total = Math.max(0, productAmount + others - disc);
      const due = Math.max(0, total - paidAmount);

      // Validate references before writing anything (fix instruction
      // #14): supplier and every item product must exist.
      if (supplierId) {
         const supplier = await prisma.supplier.findUnique({
            where: { id: supplierId },
         });
         if (!supplier) {
            return NextResponse.json(
               { error: "Supplier not found" },
               { status: 400 },
            );
         }
      }

      const itemProductIds = Array.from(
         new Set(
            normalizedItems
               .map((it) => it.productId)
               .filter((id): id is string => Boolean(id)),
         ),
      );
      if (itemProductIds.length > 0) {
         const found = await prisma.product.findMany({
            where: { id: { in: itemProductIds } },
            select: { id: true },
         });
         const foundIds = new Set(found.map((p) => p.id));
         const invalid = itemProductIds.filter((id) => !foundIds.has(id));
         if (invalid.length > 0) {
            return NextResponse.json(
               {
                  error: "Invalid product reference",
                  message: `Product(s) not found: ${invalid.join(", ")}`,
               },
               { status: 400 },
            );
         }
      }

      const purchase = await prisma.$transaction(async (tx) => {
         const { customId } = await generateNextEntityId("PURCHASE", tx);
         // PUR-01 fix: never fabricate a supplier invoice number. The
         // column is non-nullable, so an absent supplier invoice is
         // stored as an empty string — visibly "not provided" instead
         // of a fake INV-<timestamp> that looks like a real invoice.
         const invoiceNumber = invoice && String(invoice).trim()
            ? String(invoice).trim()
            : "";

         const newPurchase = await tx.purchase.create({
            data: {
               customId,
               invoice: invoiceNumber,
               supplierId: supplierId || null,
               productAmount,
               othersCost: others,
               discount: disc,
               total,
               paid: paidAmount,
               due,
               note: note || undefined,
               createdById: session.id || undefined,
               items: {
                  create: normalizedItems,
               },
            },
            include: {
               items: true,
               supplier: true,
            },
         });

         // Increase inventory & record stock movements (shared engine —
         // also mirrors warehouse stock, INV-01).
         await addStockForPurchaseItems(
            tx,
            normalizedItems
               .filter((it) => it.productId)
               .map((it) => ({
                  productId: it.productId as string,
                  quantity: it.quantity,
               })),
            {
               purchaseId: newPurchase.id,
               note: `Purchase ${newPurchase.customId} (Invoice: ${invoiceNumber || "—"})`,
            },
         );

         return newPurchase;
      });

      return NextResponse.json(purchase, { status: 201 });
   } catch (error: any) {
      console.error("POST /api/purchases error:", error);
      // ORD-06 pattern: never leak raw internal error messages.
      return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 });
   }
}
