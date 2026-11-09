import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { searchParams } = new URL(request.url);
   const sku = searchParams.get("sku")?.trim();
   const barcode = searchParams.get("barcode")?.trim();
   const currentProductId = searchParams.get("productId")?.trim();

   const results: {
      skuAvailable?: boolean;
      barcodeAvailable?: boolean;
      skuMessage?: string;
      barcodeMessage?: string;
   } = {};

   try {
      if (sku) {
         // Check in Product table
         const productWithSku = await prisma.product.findFirst({
            where: {
               productSku: sku,
               isDeleted: false,
               ...(currentProductId ? { id: { not: currentProductId } } : {}),
            },
            select: { id: true, productName: true },
         });

         // Check in ProductVariant table
         const variantWithSku = await prisma.productVariant.findFirst({
            where: {
               sku,
               isDeleted: false,
               ...(currentProductId ? { productId: { not: currentProductId } } : {}),
            },
            select: { id: true, variantName: true },
         });

         if (productWithSku) {
            results.skuAvailable = false;
            results.skuMessage = `SKU "${sku}" is already in use by product: ${productWithSku.productName}`;
         } else if (variantWithSku) {
            results.skuAvailable = false;
            results.skuMessage = `SKU "${sku}" is already in use by variant: ${variantWithSku.variantName}`;
         } else {
            results.skuAvailable = true;
            results.skuMessage = "SKU is available";
         }
      }

      if (barcode) {
         // Check in Product table
         const productWithBarcode = await prisma.product.findFirst({
            where: {
               barcode,
               isDeleted: false,
               ...(currentProductId ? { id: { not: currentProductId } } : {}),
            },
            select: { id: true, productName: true },
         });

         // Check in ProductVariant table
         const variantWithBarcode = await prisma.productVariant.findFirst({
            where: {
               barcode,
               isDeleted: false,
               ...(currentProductId ? { productId: { not: currentProductId } } : {}),
            },
            select: { id: true, variantName: true },
         });

         if (productWithBarcode) {
            results.barcodeAvailable = false;
            results.barcodeMessage = `Barcode "${barcode}" is already assigned to: ${productWithBarcode.productName}`;
         } else if (variantWithBarcode) {
            results.barcodeAvailable = false;
            results.barcodeMessage = `Barcode "${barcode}" is already assigned to: ${variantWithBarcode.variantName}`;
         } else {
            results.barcodeAvailable = true;
            results.barcodeMessage = "Barcode is available";
         }
      }

      return NextResponse.json(results);
   } catch {
      return NextResponse.json(
         { error: "Failed to validate availability" },
         { status: 500 },
      );
   }
}
