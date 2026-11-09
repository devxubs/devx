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
   const category = searchParams.get("category")?.trim() || "";
   const stockStatus = searchParams.get("stockStatus")?.trim() || "";
   const productType = searchParams.get("productType")?.trim() || "";
   const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
   const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
   const skip = isExportAll ? 0 : (page - 1) * limit;

   const where: any = {
      isDeleted: false,
   };

   if (search) {
      where.OR = [
         { productName: { contains: search } },
         { productCode: { contains: search } },
         { productSku: { contains: search } },
         { barcode: { contains: search } },
         { customId: { contains: search } },
         { brand: { contains: search } },
      ];
   }

   if (category && category !== "All") {
      where.category = { name: { equals: category } };
   }

   if (productType && productType !== "All") {
      where.productType = { equals: productType };
   }

   if (stockStatus && stockStatus !== "All") {
      const lower = stockStatus.toLowerCase();
      if (lower.includes("out")) {
         where.quantity = 0;
      } else if (lower.includes("low")) {
         where.quantity = { gt: 0, lte: 10 };
      } else if (lower.includes("in")) {
         where.quantity = { gt: 0 };
      }
   }

   if (minPrice != null || maxPrice != null) {
      where.regularPrice = {};
      if (minPrice != null) where.regularPrice.gte = minPrice;
      if (maxPrice != null) where.regularPrice.lte = maxPrice;
   }

   try {
      const [products, total] = await Promise.all([
         prisma.product.findMany({
            where,
            skip,
            take: limit,
            include: {
               category: true,
               primarySupplier: true,
               variants: {
                  where: { isDeleted: false },
                  select: { id: true, variantName: true, sku: true, quantity: true, regularPrice: true },
               },
               _count: {
                  select: { variants: true, orderItems: true },
               },
            },
            orderBy: { id: "desc" },
         }),
         prisma.product.count({ where }),
      ]);

      return NextResponse.json({ products, total, page, limit });
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch products" },
         { status: 500 },
      );
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
         productName,
         subDescription,
         content,
         images,
         productCode,
         productSku,
         barcode,
         quantity,
         lowStockAlert,
         categoryId,
         productType = "Simple",
         colors,
         sizes,
         regularPrice,
         salePrice,
         costPrice,
         wholesalePrice,
         dealerPrice,
         taxRate,
         taxMode = "EXCLUSIVE",
         discountPercentage,
         brand,
         manufacturer,
         subcategory,
         status = "ACTIVE",
         isFeatured = false,
         baseUnit,
         purchaseUnit,
         salesUnit,
         unitConversionRate,
         minStockLevel,
         maxStockLevel,
         warehouseId,
         rackLocation,
         shelfLocation,
         hasBatchTracking = false,
         hasSerialTracking = false,
         batchNumber,
         mfgDate,
         expDate,
         batchQuantity,
         primarySupplierId,
         supplierProductCode,
         supplierPrice,
         leadTimeDays,
         warrantyPeriod,
         warrantyType,
         modelNumber,
         originCountry,
         specifications,
         tags,
         salesAccount,
         purchaseAccount,
         inventoryAccount,
         cogsAccount,
         allowDiscount = true,
         allowPriceChangeAtPos = false,
         trackInventory = true,
         allowNegativeStock = false,
         availableForPos = true,
         availableForOnline = true,
         variants = [],
         bundleItems = [],
      } = body;

      if (!productName || !productName.trim()) {
         return NextResponse.json(
            { error: "Product name is required" },
            { status: 400 },
         );
      }

      if (regularPrice === undefined || regularPrice === null || isNaN(Number(regularPrice))) {
         return NextResponse.json(
            { error: "Regular price is required and must be a valid number" },
            { status: 400 },
         );
      }

      const { customId } = await generateNextEntityId("PRODUCT");
      const finalCode = productCode?.trim() || customId;
      const finalSku = productSku?.trim() || customId;
      const finalBarcode = barcode?.trim() || null;

      // Duplicate validations
      const existingSku = await prisma.product.findFirst({
         where: { productSku: finalSku, isDeleted: false },
      });
      if (existingSku) {
         return NextResponse.json(
            { error: `SKU "${finalSku}" is already in use by another product` },
            { status: 409 },
         );
      }

      if (finalBarcode) {
         const existingBarcode = await prisma.product.findFirst({
            where: { barcode: finalBarcode, isDeleted: false },
         });
         if (existingBarcode) {
            return NextResponse.json(
               { error: `Barcode "${finalBarcode}" is already in use by another product` },
               { status: 409 },
            );
         }
      }

      // Category resolution
      let resolvedCategoryId = categoryId || body.category || null;
      if (resolvedCategoryId) {
         const existingCat = await prisma.category.findFirst({
            where: { OR: [{ id: resolvedCategoryId }, { name: resolvedCategoryId }] },
         });
         if (existingCat) {
            resolvedCategoryId = existingCat.id;
         } else {
            const { customId: catCustomId } = await generateNextEntityId("CATEGORY");
            const newCat = await prisma.category.create({ data: { customId: catCustomId, name: resolvedCategoryId } });
            resolvedCategoryId = newCat.id;
         }
      }

      // Supplier resolution
      let resolvedSupplierId = primarySupplierId || null;
      if (resolvedSupplierId) {
         const existingSup = await prisma.supplier.findFirst({
            where: { OR: [{ id: resolvedSupplierId }, { name: resolvedSupplierId }] },
         });
         if (existingSup) {
            resolvedSupplierId = existingSup.id;
         }
      }

      // Warehouse resolution
      let resolvedWarehouseId = warehouseId || null;
      if (!resolvedWarehouseId && trackInventory && productType !== "Service") {
         const defaultWh = await prisma.warehouse.findFirst({
            where: { isDeleted: false, isDefault: true },
         });
         if (defaultWh) {
            resolvedWarehouseId = defaultWh.id;
         } else {
            const firstWh = await prisma.warehouse.findFirst({ where: { isDeleted: false } });
            if (firstWh) resolvedWarehouseId = firstWh.id;
         }
      }

      // Total quantity calculation
      let initialQty = Math.max(parseInt(String(quantity || 0)) || 0, 0);
      if (productType === "Variable" && Array.isArray(variants) && variants.length > 0) {
         initialQty = variants.reduce(
            (acc: number, v: any) => acc + (Math.max(0, parseInt(String(v.quantity || 0)) || 0)),
            0,
         );
      } else if (productType === "Service") {
         initialQty = 0;
      }

      // Execute comprehensive database write in a single safe transaction
      const product = await prisma.$transaction(async (tx) => {
         const p = await tx.product.create({
            data: {
               customId,
               productCode: finalCode,
               productSku: finalSku,
               barcode: finalBarcode,
               productName: productName.trim(),
               subDescription: subDescription?.trim() || null,
               content: content?.trim() || null,
               images: Array.isArray(images) ? images : [],
               quantity: initialQty,
               lowStockAlert: parseInt(String(lowStockAlert || "10")) || 10,
               categoryId: resolvedCategoryId,
               productType: productType || "Simple",
               colors: Array.isArray(colors) ? colors : (body.color || []),
               sizes: Array.isArray(sizes) ? sizes : (body.unit || []),
               regularPrice: parseFloat(String(regularPrice)),
               salePrice: salePrice ? parseFloat(String(salePrice)) : null,
               costPrice: costPrice ? parseFloat(String(costPrice)) : 0,
               wholesalePrice: wholesalePrice ? parseFloat(String(wholesalePrice)) : 0,
               dealerPrice: dealerPrice ? parseFloat(String(dealerPrice)) : 0,
               taxRate: taxRate ? parseFloat(String(taxRate)) : 0,
               taxMode: taxMode || "EXCLUSIVE",
               discountPercentage: discountPercentage ? parseFloat(String(discountPercentage)) : 0,
               brand: brand?.trim() || null,
               manufacturer: manufacturer?.trim() || null,
               subcategory: subcategory?.trim() || null,
               status: status || "ACTIVE",
               isFeatured: Boolean(isFeatured),
               baseUnit: baseUnit?.trim() || (Array.isArray(sizes) && sizes.length > 0 ? sizes[0] : null),
               purchaseUnit: purchaseUnit?.trim() || null,
               salesUnit: salesUnit?.trim() || null,
               unitConversionRate: unitConversionRate ? parseFloat(String(unitConversionRate)) : 1,
               minStockLevel: minStockLevel ? parseInt(String(minStockLevel)) : 5,
               maxStockLevel: maxStockLevel ? parseInt(String(maxStockLevel)) : 1000,
               rackLocation: rackLocation?.trim() || null,
               shelfLocation: shelfLocation?.trim() || null,
               hasBatchTracking: Boolean(hasBatchTracking),
               hasSerialTracking: Boolean(hasSerialTracking),
               primarySupplierId: resolvedSupplierId,
               supplierProductCode: supplierProductCode?.trim() || null,
               supplierPrice: supplierPrice ? parseFloat(String(supplierPrice)) : null,
               leadTimeDays: leadTimeDays ? parseInt(String(leadTimeDays)) : null,
               warrantyPeriod: warrantyPeriod?.trim() || null,
               warrantyType: warrantyType?.trim() || null,
               modelNumber: modelNumber?.trim() || null,
               originCountry: originCountry?.trim() || null,
               specifications: Array.isArray(specifications) ? specifications : undefined,
               tags: Array.isArray(tags) ? tags : undefined,
               salesAccount: salesAccount?.trim() || null,
               purchaseAccount: purchaseAccount?.trim() || null,
               inventoryAccount: inventoryAccount?.trim() || null,
               cogsAccount: cogsAccount?.trim() || null,
               allowDiscount: allowDiscount !== false,
               allowPriceChangeAtPos: Boolean(allowPriceChangeAtPos),
               trackInventory: trackInventory !== false && productType !== "Service",
               allowNegativeStock: Boolean(allowNegativeStock),
               availableForPos: availableForPos !== false,
               availableForOnline: availableForOnline !== false,
            },
         });

         // 1. Initial Stock Movement
         if (initialQty > 0 && productType !== "Service") {
            await tx.stockMovement.create({
               data: {
                  productId: p.id,
                  type: "ADJUSTMENT",
                  quantity: initialQty,
                  note: "Initial opening stock",
               },
            });
         }

         // 2. Initial Price History Record
         await tx.productPriceHistory.create({
            data: {
               productId: p.id,
               previousCost: null,
               newCost: costPrice ? parseFloat(String(costPrice)) : 0,
               previousPrice: null,
               newPrice: parseFloat(String(regularPrice)),
               priceType: "REGULAR",
               changedBy: session.name || session.email || "System",
               reason: "Initial Product Creation",
            },
         });

         // 3. Warehouse Stock Assignment
         if (resolvedWarehouseId && initialQty > 0) {
            await tx.productWarehouseStock.upsert({
               where: {
                  productId_warehouseId: {
                     productId: p.id,
                     warehouseId: resolvedWarehouseId,
                  },
               },
               update: {
                  quantity: initialQty,
                  rackLocation: rackLocation?.trim() || null,
                  shelfLocation: shelfLocation?.trim() || null,
               },
               create: {
                  productId: p.id,
                  warehouseId: resolvedWarehouseId,
                  quantity: initialQty,
                  rackLocation: rackLocation?.trim() || null,
                  shelfLocation: shelfLocation?.trim() || null,
               },
            });
         }

         // 4. Batch Record
         if (hasBatchTracking && batchNumber?.trim()) {
            await tx.stockBatch.create({
               data: {
                  productId: p.id,
                  batchNumber: batchNumber.trim(),
                  quantity: batchQuantity ? parseInt(String(batchQuantity)) : initialQty,
                  mfgDate: mfgDate ? new Date(mfgDate) : null,
                  expDate: expDate ? new Date(expDate) : null,
                  warehouseId: resolvedWarehouseId,
               },
            });
         }

         // 5. Product Variants (if Variable Product)
         if (productType === "Variable" && Array.isArray(variants) && variants.length > 0) {
            for (let idx = 0; idx < variants.length; idx++) {
               const v = variants[idx];
               const variantSku = v.sku?.trim() || `${finalSku}-V${idx + 1}`;
               const variantBarcode = v.barcode?.trim() || null;
               const variantQty = Math.max(0, parseInt(String(v.quantity || 0)) || 0);

               await tx.productVariant.create({
                  data: {
                     productId: p.id,
                     variantName: v.variantName?.trim() || `Variant ${idx + 1}`,
                     sku: variantSku,
                     barcode: variantBarcode,
                     regularPrice: v.regularPrice ? parseFloat(String(v.regularPrice)) : parseFloat(String(regularPrice)),
                     salePrice: v.salePrice ? parseFloat(String(v.salePrice)) : null,
                     costPrice: v.costPrice ? parseFloat(String(v.costPrice)) : (costPrice ? parseFloat(String(costPrice)) : 0),
                     wholesalePrice: v.wholesalePrice ? parseFloat(String(v.wholesalePrice)) : 0,
                     quantity: variantQty,
                     lowStockAlert: v.lowStockAlert ? parseInt(String(v.lowStockAlert)) : 5,
                     image: v.image || null,
                     status: v.status || "ACTIVE",
                     attributes: v.attributes || null,
                  },
               });
            }
         }

         // 6. Bundle Components (if Bundle Product)
         if (productType === "Bundle" && Array.isArray(bundleItems) && bundleItems.length > 0) {
            for (const item of bundleItems) {
               if (item.componentProductId) {
                  await tx.productBundleItem.create({
                     data: {
                        bundleProductId: p.id,
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

      return NextResponse.json(product, { status: 201 });
   } catch (error: any) {
      if (error?.code === "P2002") {
         return NextResponse.json(
            { error: "Product code, SKU or barcode already exists in database" },
            { status: 409 },
         );
      }
      return NextResponse.json(
         { error: error?.message || "Failed to create product" },
         { status: 500 },
      );
   }
}
