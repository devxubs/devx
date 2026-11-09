import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(
   _request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   const product = await prisma.product.findFirst({
      where: {
         OR: [{ id }, { customId: id }, { productCode: id }, { productSku: id }],
      },
      include: {
         category: true,
         primarySupplier: true,
         variants: {
            where: { isDeleted: false },
            orderBy: { createdAt: "asc" },
         },
         bundleItems: {
            include: {
               componentProduct: {
                  select: { id: true, productName: true, productCode: true, productSku: true, regularPrice: true, quantity: true },
               },
            },
         },
         warehouseStocks: {
            include: {
               warehouse: true,
            },
         },
         batches: {
            orderBy: { createdAt: "desc" },
         },
         priceHistories: {
            orderBy: { createdAt: "desc" },
            take: 20,
         },
         stockMovements: {
            orderBy: { createdAt: "desc" },
            take: 20,
         },
      },
   });

   if (!product || product.isDeleted) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
   }

   return NextResponse.json(product);
}

export async function PUT(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { id } = await params;

   try {
      const body = await request.json();
      const existing = await prisma.product.findUnique({
         where: { id },
         include: { variants: true, warehouseStocks: true },
      });

      if (!existing) {
         return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      // Check SKU / Barcode collisions if changed
      if (body.productSku && body.productSku !== existing.productSku) {
         const collision = await prisma.product.findFirst({
            where: { productSku: body.productSku, id: { not: id }, isDeleted: false },
         });
         if (collision) {
            return NextResponse.json({ error: `SKU "${body.productSku}" is already taken` }, { status: 409 });
         }
      }

      if (body.barcode && body.barcode !== existing.barcode) {
         const collision = await prisma.product.findFirst({
            where: { barcode: body.barcode, id: { not: id }, isDeleted: false },
         });
         if (collision) {
            return NextResponse.json({ error: `Barcode "${body.barcode}" is already taken` }, { status: 409 });
         }
      }

      // Price tracking
      const newRegularPrice = body.regularPrice !== undefined ? parseFloat(String(body.regularPrice)) : Number(existing.regularPrice);
      const newCostPrice = body.costPrice !== undefined ? parseFloat(String(body.costPrice)) : (existing.costPrice ? Number(existing.costPrice) : 0);
      const priceChanged = Number(existing.regularPrice) !== newRegularPrice || Number(existing.costPrice || 0) !== newCostPrice;

      // Quantity calculation
      let newQty = body.quantity !== undefined ? parseInt(String(body.quantity)) : existing.quantity;
      if (body.productType === "Variable" && Array.isArray(body.variants) && body.variants.length > 0) {
         newQty = body.variants.reduce(
            (acc: number, v: any) => acc + (Math.max(0, parseInt(String(v.quantity || 0)) || 0)),
            0,
         );
      }
      const qtyDiff = newQty - existing.quantity;

      const product = await prisma.$transaction(async (tx) => {
         const p = await tx.product.update({
            where: { id },
            data: {
               productName: body.productName !== undefined ? body.productName.trim() : undefined,
               subDescription: body.subDescription !== undefined ? (body.subDescription ? body.subDescription.trim() : null) : undefined,
               content: body.content !== undefined ? (body.content ? body.content.trim() : null) : undefined,
               images: Array.isArray(body.images) ? body.images : undefined,
               productCode: body.productCode !== undefined ? body.productCode.trim() : undefined,
               productSku: body.productSku !== undefined ? body.productSku.trim() : undefined,
               barcode: body.barcode !== undefined ? (body.barcode ? body.barcode.trim() : null) : undefined,
               quantity: Math.max(0, newQty),
               lowStockAlert: body.lowStockAlert !== undefined ? parseInt(String(body.lowStockAlert)) : undefined,
               categoryId: body.categoryId !== undefined ? (body.categoryId || null) : undefined,
               productType: body.productType !== undefined ? body.productType : undefined,
               colors: Array.isArray(body.colors) ? body.colors : undefined,
               sizes: Array.isArray(body.sizes) ? body.sizes : undefined,
               regularPrice: body.regularPrice !== undefined ? newRegularPrice : undefined,
               salePrice: body.salePrice !== undefined ? (body.salePrice ? parseFloat(String(body.salePrice)) : null) : undefined,
               costPrice: body.costPrice !== undefined ? newCostPrice : undefined,
               wholesalePrice: body.wholesalePrice !== undefined ? parseFloat(String(body.wholesalePrice)) : undefined,
               dealerPrice: body.dealerPrice !== undefined ? parseFloat(String(body.dealerPrice)) : undefined,
               taxRate: body.taxRate !== undefined ? parseFloat(String(body.taxRate)) : undefined,
               taxMode: body.taxMode !== undefined ? body.taxMode : undefined,
               discountPercentage: body.discountPercentage !== undefined ? parseFloat(String(body.discountPercentage)) : undefined,
               brand: body.brand !== undefined ? (body.brand ? body.brand.trim() : null) : undefined,
               manufacturer: body.manufacturer !== undefined ? (body.manufacturer ? body.manufacturer.trim() : null) : undefined,
               subcategory: body.subcategory !== undefined ? (body.subcategory ? body.subcategory.trim() : null) : undefined,
               status: body.status !== undefined ? body.status : undefined,
               isFeatured: body.isFeatured !== undefined ? Boolean(body.isFeatured) : undefined,
               baseUnit: body.baseUnit !== undefined ? (body.baseUnit ? body.baseUnit.trim() : null) : undefined,
               purchaseUnit: body.purchaseUnit !== undefined ? (body.purchaseUnit ? body.purchaseUnit.trim() : null) : undefined,
               salesUnit: body.salesUnit !== undefined ? (body.salesUnit ? body.salesUnit.trim() : null) : undefined,
               unitConversionRate: body.unitConversionRate !== undefined ? parseFloat(String(body.unitConversionRate)) : undefined,
               minStockLevel: body.minStockLevel !== undefined ? parseInt(String(body.minStockLevel)) : undefined,
               maxStockLevel: body.maxStockLevel !== undefined ? parseInt(String(body.maxStockLevel)) : undefined,
               rackLocation: body.rackLocation !== undefined ? (body.rackLocation ? body.rackLocation.trim() : null) : undefined,
               shelfLocation: body.shelfLocation !== undefined ? (body.shelfLocation ? body.shelfLocation.trim() : null) : undefined,
               hasBatchTracking: body.hasBatchTracking !== undefined ? Boolean(body.hasBatchTracking) : undefined,
               hasSerialTracking: body.hasSerialTracking !== undefined ? Boolean(body.hasSerialTracking) : undefined,
               primarySupplierId: body.primarySupplierId !== undefined ? (body.primarySupplierId || null) : undefined,
               supplierProductCode: body.supplierProductCode !== undefined ? (body.supplierProductCode ? body.supplierProductCode.trim() : null) : undefined,
               supplierPrice: body.supplierPrice !== undefined ? (body.supplierPrice ? parseFloat(String(body.supplierPrice)) : null) : undefined,
               leadTimeDays: body.leadTimeDays !== undefined ? (body.leadTimeDays ? parseInt(String(body.leadTimeDays)) : null) : undefined,
               warrantyPeriod: body.warrantyPeriod !== undefined ? (body.warrantyPeriod ? body.warrantyPeriod.trim() : null) : undefined,
               warrantyType: body.warrantyType !== undefined ? (body.warrantyType ? body.warrantyType.trim() : null) : undefined,
               modelNumber: body.modelNumber !== undefined ? (body.modelNumber ? body.modelNumber.trim() : null) : undefined,
               originCountry: body.originCountry !== undefined ? (body.originCountry ? body.originCountry.trim() : null) : undefined,
               specifications: body.specifications !== undefined ? body.specifications : undefined,
               tags: body.tags !== undefined ? body.tags : undefined,
               salesAccount: body.salesAccount !== undefined ? (body.salesAccount ? body.salesAccount.trim() : null) : undefined,
               purchaseAccount: body.purchaseAccount !== undefined ? (body.purchaseAccount ? body.purchaseAccount.trim() : null) : undefined,
               inventoryAccount: body.inventoryAccount !== undefined ? (body.inventoryAccount ? body.inventoryAccount.trim() : null) : undefined,
               cogsAccount: body.cogsAccount !== undefined ? (body.cogsAccount ? body.cogsAccount.trim() : null) : undefined,
               allowDiscount: body.allowDiscount !== undefined ? Boolean(body.allowDiscount) : undefined,
               allowPriceChangeAtPos: body.allowPriceChangeAtPos !== undefined ? Boolean(body.allowPriceChangeAtPos) : undefined,
               trackInventory: body.trackInventory !== undefined ? Boolean(body.trackInventory) : undefined,
               allowNegativeStock: body.allowNegativeStock !== undefined ? Boolean(body.allowNegativeStock) : undefined,
               availableForPos: body.availableForPos !== undefined ? Boolean(body.availableForPos) : undefined,
               availableForOnline: body.availableForOnline !== undefined ? Boolean(body.availableForOnline) : undefined,
            },
         });

         // Record Price History if price changed
         if (priceChanged) {
            await tx.productPriceHistory.create({
               data: {
                  productId: p.id,
                  previousCost: existing.costPrice,
                  newCost: newCostPrice,
                  previousPrice: existing.regularPrice,
                  newPrice: newRegularPrice,
                  priceType: "REGULAR",
                  changedBy: session.name || session.email || "System",
                  reason: body.priceChangeReason || "Product Edit",
               },
            });
         }

         // Record Stock Movement if quantity changed
         if (qtyDiff !== 0) {
            await tx.stockMovement.create({
               data: {
                  productId: p.id,
                  type: "ADJUSTMENT",
                  quantity: qtyDiff,
                  note: qtyDiff > 0 ? `Stock manual increment (+${qtyDiff})` : `Stock manual decrement (${qtyDiff})`,
               },
            });
         }

         // Update Variants (if Variable product)
         if (body.variants !== undefined && Array.isArray(body.variants)) {
            // Soft delete removed variants
            const incomingIds = body.variants.map((v: any) => v.id).filter(Boolean);
            await tx.productVariant.updateMany({
               where: {
                  productId: id,
                  id: { notIn: incomingIds },
               },
               data: { isDeleted: true },
            });

            // Upsert incoming variants
            for (let i = 0; i < body.variants.length; i++) {
               const v = body.variants[i];
               const variantSku = v.sku?.trim() || `${p.productSku}-V${i + 1}`;
               const variantData = {
                  variantName: v.variantName?.trim() || `Variant ${i + 1}`,
                  sku: variantSku,
                  barcode: v.barcode?.trim() || null,
                  regularPrice: v.regularPrice ? parseFloat(String(v.regularPrice)) : newRegularPrice,
                  salePrice: v.salePrice ? parseFloat(String(v.salePrice)) : null,
                  costPrice: v.costPrice ? parseFloat(String(v.costPrice)) : newCostPrice,
                  wholesalePrice: v.wholesalePrice ? parseFloat(String(v.wholesalePrice)) : 0,
                  quantity: Math.max(0, parseInt(String(v.quantity || 0)) || 0),
                  lowStockAlert: v.lowStockAlert ? parseInt(String(v.lowStockAlert)) : 5,
                  image: v.image || null,
                  status: v.status || "ACTIVE",
                  attributes: v.attributes || null,
                  isDeleted: false,
               };

               if (v.id) {
                  await tx.productVariant.update({
                     where: { id: v.id },
                     data: variantData,
                  });
               } else {
                  await tx.productVariant.create({
                     data: {
                        productId: id,
                        ...variantData,
                     },
                  });
               }
            }
         }

         // Update Bundle items (if provided)
         if (body.bundleItems !== undefined && Array.isArray(body.bundleItems)) {
            await tx.productBundleItem.deleteMany({ where: { bundleProductId: id } });
            for (const item of body.bundleItems) {
               if (item.componentProductId) {
                  await tx.productBundleItem.create({
                     data: {
                        bundleProductId: id,
                        componentProductId: item.componentProductId,
                        quantity: Math.max(1, parseInt(String(item.quantity || 1)) || 1),
                        unitPrice: item.unitPrice ? parseFloat(String(item.unitPrice)) : null,
                     },
                  });
               }
            }
         }

         return p;
      });

      return NextResponse.json(product);
   } catch (error: any) {
      if (error?.code === "P2002") {
         return NextResponse.json(
            { error: "Product SKU or barcode collision occurred" },
            { status: 409 },
         );
      }
      return NextResponse.json(
         { error: error?.message || "Failed to update product" },
         { status: 500 },
      );
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { id } = await params;
   try {
      await prisma.$transaction([
         prisma.product.update({
            where: { id },
            data: { isDeleted: true },
         }),
         prisma.productVariant.updateMany({
            where: { productId: id },
            data: { isDeleted: true },
         }),
      ]);

      return NextResponse.json({ success: true, message: "Product deleted" });
   } catch {
      return NextResponse.json(
         { error: "Failed to delete product" },
         { status: 500 },
      );
   }
}
