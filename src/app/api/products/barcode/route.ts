import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

// Exact code lookup for barcode scanning (Phase 4, §4.1).
//
// GET /api/products/barcode?code=<scanned code>
//
// A scanner needs ONE unambiguous answer, not a fuzzy search page,
// so this endpoint matches the code EXACTLY, in specificity order:
//   1. ProductVariant.barcode  (the label on a specific variant)
//   2. Product.barcode         (the label on a simple product)
//   3. ProductVariant.sku      (labels printed from the SKU — the
//   4. Product.productSku / productCode   label-printing view encodes
//      barcode || sku, so scans of SKU labels must resolve too)
//
// Responses:
//   200 { matchType: "variant" | "product", matchedOn, product, variant }
//       — `product` carries the same include shape as GET /api/products
//         (live variants + category), so the order form can add it
//         exactly like a search result; `variant` is set only for
//         variant matches so the caller can preselect it.
//   409 { error, matches } — the code is assigned to more than one
//       sellable item; the caller must disambiguate manually.
//   404 { error } — nothing carries this code.

const productInclude = {
   category: true,
   primarySupplier: true,
   variants: {
      where: { isDeleted: false },
      select: {
         id: true,
         variantName: true,
         sku: true,
         barcode: true,
         quantity: true,
         regularPrice: true,
         salePrice: true,
         costPrice: true,
         attributes: true,
      },
   },
   _count: { select: { variants: true, orderItems: true } },
} as const;

export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const code = new URL(request.url).searchParams.get("code")?.trim() || "";
   if (!code) {
      return NextResponse.json(
         { error: "A barcode value is required" },
         { status: 400 },
      );
   }

   try {
      // 1 + 3: variant-level codes (barcode first, then sku).
      const variantMatches = await prisma.productVariant.findMany({
         where: {
            isDeleted: false,
            product: { isDeleted: false },
            OR: [{ barcode: code }, { sku: code }],
         },
         select: {
            id: true,
            variantName: true,
            sku: true,
            barcode: true,
            quantity: true,
            regularPrice: true,
            salePrice: true,
            productId: true,
         },
         take: 3,
      });
      // Barcode matches outrank sku matches for the same code.
      const variantBarcodeMatches = variantMatches.filter((v) => v.barcode === code);
      const variantPool = variantBarcodeMatches.length > 0 ? variantBarcodeMatches : variantMatches;
      if (variantPool.length > 1) {
         return NextResponse.json(
            {
               error: "This code is assigned to more than one variant",
               matches: variantPool.map((v) => ({
                  variantId: v.id,
                  variantName: v.variantName,
                  productId: v.productId,
               })),
            },
            { status: 409 },
         );
      }
      if (variantPool.length === 1) {
         const variant = variantPool[0];
         const product = await prisma.product.findFirst({
            where: { id: variant.productId, isDeleted: false },
            include: productInclude,
         });
         if (product) {
            return NextResponse.json({
               matchType: "variant",
               matchedOn: variant.barcode === code ? "variant.barcode" : "variant.sku",
               product,
               variant: {
                  id: variant.id,
                  variantName: variant.variantName,
                  sku: variant.sku,
                  barcode: variant.barcode,
                  quantity: variant.quantity,
                  regularPrice: variant.regularPrice,
                  salePrice: variant.salePrice,
               },
            });
         }
      }

      // 2 + 4: product-level codes (barcode first, then sku / code).
      const productMatches = await prisma.product.findMany({
         where: {
            isDeleted: false,
            OR: [
               { barcode: code },
               { productSku: code },
               { productCode: code },
            ],
         },
         include: productInclude,
         take: 3,
      });
      const productBarcodeMatches = productMatches.filter((p) => p.barcode === code);
      const productPool = productBarcodeMatches.length > 0 ? productBarcodeMatches : productMatches;
      if (productPool.length > 1) {
         return NextResponse.json(
            {
               error: "This code is assigned to more than one product",
               matches: productPool.map((p) => ({
                  productId: p.id,
                  productName: p.productName,
               })),
            },
            { status: 409 },
         );
      }
      if (productPool.length === 1) {
         const product = productPool[0];
         const matchedOn =
            product.barcode === code
               ? "product.barcode"
               : product.productSku === code
                 ? "product.productSku"
                 : "product.productCode";
         return NextResponse.json({
            matchType: "product",
            matchedOn,
            product,
            variant: null,
         });
      }

      return NextResponse.json(
         { error: "No product or variant carries this code" },
         { status: 404 },
      );
   } catch {
      return NextResponse.json(
         { error: "Barcode lookup failed" },
         { status: 500 },
      );
   }
}
