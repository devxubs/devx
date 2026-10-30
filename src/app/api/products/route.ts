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
         { customId: { contains: search } },
      ];
   }

   if (category && category !== "All") {
      where.category = { name: { equals: category } };
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
            include: { category: true },
            orderBy: { createdAt: "desc" },
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
         quantity,
         lowStockAlert,
         categoryId,
         productType,
         colors,
         sizes,
         regularPrice,
         salePrice,
      } = body;

      if (!productName || regularPrice === undefined) {
         return NextResponse.json(
            { error: "Product name and regular price are required" },
            { status: 400 },
         );
      }

      const { customId } = await generateNextEntityId("PRODUCT");
      const finalCode = productCode ? String(productCode).trim() : customId;
      const finalSku = productSku ? String(productSku).trim() : customId;

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

      const product = await prisma.product.create({
         data: {
            customId,
            productName,
            subDescription: subDescription || null,
            content: content || null,
            images: Array.isArray(images) ? images : [],
            productCode: finalCode,
            productSku: finalSku,
            quantity: Math.max(parseInt(quantity) || 0, 0),
            lowStockAlert: parseInt(lowStockAlert) || 10,
            categoryId: resolvedCategoryId,
            productType: productType || null,
            colors: Array.isArray(colors) ? colors : (body.color || []),
            sizes: Array.isArray(sizes) ? sizes : (body.unit || []),
            regularPrice: parseFloat(regularPrice),
            salePrice: salePrice ? parseFloat(salePrice) : null,
         },
      });

      return NextResponse.json(product, { status: 201 });
   } catch (error: any) {
      if (error?.code === "P2002") {
         return NextResponse.json(
            { error: "Product code or SKU already exists" },
            { status: 409 },
         );
      }
      return NextResponse.json(
         { error: "Failed to create product" },
         { status: 500 },
      );
   }
}
