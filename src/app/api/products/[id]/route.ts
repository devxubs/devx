import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { adjustWarehouseStock } from "@src/lib/stock";
import {
   normalizeBarcode,
   findBarcodeConflict,
   findPayloadDuplicateBarcode,
   barcodeConflictMessage,
   assertBarcodeAvailable,
   BarcodeConflictError,
} from "@src/lib/barcodeUniqueness";
import { deleteUploadedFiles } from "@src/lib/uploadedFiles";

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

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
   const gate = await requirePermission(request, ["products", "product", "product_update"]);
   if (gate instanceof NextResponse) return gate;
   const session = gate.session;

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

      // Phase 4 (D6): same unified-namespace rule as product create
      // (lib/barcodeUniqueness) — the new code must not collide with
      // any other product's barcode or any variant's barcode. Only
      // checked when the value actually changes, so a pre-existing
      // legacy duplicate elsewhere never blocks an unrelated edit.
      // Two variants in the same save may not share a barcode
      // either (payload-internal, no DB state involved).
      if (Array.isArray(body.variants)) {
         const payloadDuplicate = findPayloadDuplicateBarcode(
            body.variants.map((v: any) => normalizeBarcode(v?.barcode)),
         );
         if (payloadDuplicate) {
            return NextResponse.json(
               {
                  error: `Barcode "${payloadDuplicate}" is used more than once in this product`,
               },
               { status: 409 },
            );
         }
      }

      const nextBarcode = normalizeBarcode(body.barcode);
      if (nextBarcode && nextBarcode !== normalizeBarcode(existing.barcode)) {
         const conflict = await findBarcodeConflict(prisma, nextBarcode, {
            excludeProductId: id,
         });
         if (conflict) {
            return NextResponse.json(
               { error: barcodeConflictMessage(conflict) },
               { status: 409 },
            );
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
            // INV-01: keep warehouse stock in step with direct edits.
            await adjustWarehouseStock(tx, p.id, qtyDiff);
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
               data: { isDeleted: true, deletedAt: new Date() },
            });

            // Phase 4 (D6): variant barcodes join the same unified
            // namespace check as product barcodes. Runs inside the
            // transaction AFTER the soft-delete above, so a code
            // freed by a removed variant can be reused in the same
            // save, and a conflict rolls the whole edit back. Each
            // incoming variant is excluded from its own check by id;
            // the parent product's own barcode (already updated
            // above) counts as a conflict like any other record.
            const incomingBarcodes = body.variants.map((v: any) =>
               normalizeBarcode(v?.barcode),
            );
            for (let i = 0; i < body.variants.length; i++) {
               const code = incomingBarcodes[i];
               if (!code) continue;
               await assertBarcodeAvailable(tx, code, {
                  excludeVariantId: body.variants[i]?.id || undefined,
               });
            }

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
                  deletedAt: null,
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

      // Phase 4 (D8): orphan cleanup — uploaded image files whose
      // URL this save dropped (product image removed from the
      // array, variant image replaced) are deleted from UPLOAD_DIR
      // so replaced images don't leak on disk forever. Runs only
      // after the update committed; best-effort (never throws);
      // data-URLs and external URLs are ignored by the helper, and
      // any URL still referenced by the saved product/variants is
      // kept. Soft-deleted variants keep their files, matching
      // soft-delete semantics.
      try {
         const keptProductImages: string[] = Array.isArray(body.images)
            ? body.images
            : Array.isArray((existing as any).images)
              ? (existing as any).images
              : [];
         const incomingVariantIds = new Set(
            Array.isArray(body.variants)
               ? body.variants.map((v: any) => v?.id).filter(Boolean)
               : [],
         );
         const keptVariantImages: string[] = Array.isArray(body.variants)
            ? [
                 ...body.variants.map((v: any) => v?.image).filter(Boolean),
                 // Variants dropped by this save are soft-deleted,
                 // not destroyed — their files stay with them.
                 ...(existing.variants || [])
                    .filter((v: any) => v.image && !incomingVariantIds.has(v.id))
                    .map((v: any) => v.image),
              ]
            : (existing.variants || [])
                 .filter((v: any) => !v.isDeleted)
                 .map((v: any) => v.image)
                 .filter(Boolean);
         const kept = new Set([...keptProductImages, ...keptVariantImages]);
         const orphans = new Set<string>();
         if (Array.isArray(body.images)) {
            for (const url of (existing as any).images || []) {
               if (typeof url === "string" && !kept.has(url)) orphans.add(url);
            }
         }
         if (Array.isArray(body.variants)) {
            const incomingById = new Map(
               body.variants
                  .filter((v: any) => v?.id)
                  .map((v: any) => [v.id, v?.image || null]),
            );
            for (const old of existing.variants || []) {
               if (old.isDeleted || !old.image) continue;
               if (!incomingById.has(old.id)) continue; // removed → soft-deleted, file kept
               if (incomingById.get(old.id) !== old.image && !kept.has(old.image)) {
                  orphans.add(old.image);
               }
            }
         }
         if (orphans.size > 0) await deleteUploadedFiles(orphans);
      } catch (cleanupError) {
         console.error("Product image orphan cleanup failed:", cleanupError);
      }

      return NextResponse.json(product);
   } catch (error: any) {
      if (error instanceof BarcodeConflictError) {
         return NextResponse.json(
            { error: error.message },
            { status: 409 },
         );
      }
      if (error?.code === "P2002") {
         return NextResponse.json(
            { error: "Product SKU or barcode collision occurred" },
            { status: 409 },
         );
      }
      // Phase 5 (§5.4): don't echo raw driver/ORM error text to the
      // client on a 500 — it can carry schema/column details. The
      // detail stays in the server log; the client gets the generic
      // message. (Domain errors elsewhere keep their safe messages.)
      console.error("Product update failed:", error);
      return NextResponse.json(
         { error: "Failed to update product" },
         { status: 500 },
      );
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, ["products", "product", "product_delete"]);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;
   try {
      // P0-2 (audit C-2): the product and the variants this delete
      // cascades to share ONE `deletedAt` timestamp — that shared
      // stamp is the delete-event linkage Bin restore matches on to
      // bring back exactly the cascade-deleted variants. Only
      // currently-live variants are stamped: a variant deleted
      // individually earlier keeps its own `deletedAt`, so restore
      // can tell the two apart (previously every variant's stamp
      // was overwritten, and restore un-flagged none of them).
      const deletedAt = new Date();
      await prisma.$transaction([
         prisma.product.update({
            where: { id },
            data: { isDeleted: true, deletedAt },
         }),
         prisma.productVariant.updateMany({
            where: { productId: id, isDeleted: false },
            data: { isDeleted: true, deletedAt },
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
