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
      include: { category: true },
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
      const product = await prisma.product.update({
         where: { id },
         data: {
            productName: body.productName,
            subDescription: body.subDescription,
            content: body.content,
            images: Array.isArray(body.images) ? body.images : undefined,
            productCode: body.productCode,
            productSku: body.productSku,
            quantity: body.quantity !== undefined ? parseInt(body.quantity) : undefined,
            lowStockAlert: body.lowStockAlert !== undefined ? parseInt(body.lowStockAlert) : undefined,
            categoryId: body.categoryId || null,
            productType: body.productType,
            colors: Array.isArray(body.colors) ? body.colors : undefined,
            sizes: Array.isArray(body.sizes) ? body.sizes : undefined,
            regularPrice: body.regularPrice !== undefined ? parseFloat(body.regularPrice) : undefined,
            salePrice: body.salePrice !== undefined ? (body.salePrice ? parseFloat(body.salePrice) : null) : undefined,
         },
      });

      return NextResponse.json(product);
   } catch {
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
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { id } = await params;
   try {
      // Soft-delete
      await prisma.product.update({
         where: { id },
         data: { isDeleted: true },
      });
      return NextResponse.json({ success: true, message: "Product deleted" });
   } catch {
      return NextResponse.json(
         { error: "Failed to delete product" },
         { status: 500 },
      );
   }
}
