import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";

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
         productAmount = 0,
         othersCost = 0,
         discount = 0,
         paid = 0,
         note,
      } = body;

      const total = Number(productAmount) + Number(othersCost) - Number(discount);
      const due = Math.max(0, total - Number(paid));

      const purchase = await prisma.$transaction(async (tx) => {
         const { customId } = await generateNextEntityId("PURCHASE", tx);
         const invoiceNumber = (invoice && String(invoice).trim())
            ? String(invoice).trim()
            : `INV-${Date.now().toString().slice(-6)}`;

         const newPurchase = await tx.purchase.create({
            data: {
               customId,
               invoice: invoiceNumber,
               supplierId: supplierId || null,
               productAmount,
               othersCost,
               discount,
               total,
               paid,
               due,
               note: note || undefined,
               createdById: session.id || undefined,
               items: {
                  create: items.map((item: any) => ({
                     productId: item.productId || null,
                     name: item.name || "Unknown Item",
                     code: item.code || null,
                     quantity: parseInt(item.quantity) || 1,
                     price: parseFloat(item.price) || 0,
                     subtotal: (parseInt(item.quantity) || 1) * (parseFloat(item.price) || 0),
                  })),
               },
            },
            include: {
               items: true,
               supplier: true,
            },
         });

         // Increase inventory & create stock movement for matched products
         for (const item of items) {
            if (item.productId) {
               const qty = parseInt(item.quantity) || 1;
               await tx.product.update({
                  where: { id: item.productId },
                  data: { quantity: { increment: qty } },
               });

               await tx.stockMovement.create({
                  data: {
                     productId: item.productId,
                     type: "PURCHASE",
                     quantity: qty,
                     note: `Purchase ${newPurchase.customId} (Invoice: ${invoiceNumber})`,
                     purchaseId: newPurchase.id,
                  },
               });
            }
         }

         return newPurchase;
      });

      return NextResponse.json(purchase, { status: 201 });
   } catch (error: any) {
      return NextResponse.json({ error: error.message || "Failed to create purchase" }, { status: 500 });
   }
}
