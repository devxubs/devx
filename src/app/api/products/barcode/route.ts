import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { resolveBarcodeLookup } from "@src/lib/barcodeLookup";

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
// Both pools are queried and resolved together (P2-17): a code
// carried by a variant AND a product is ambiguous — neither pool
// silently wins. Only live records participate (non-deleted
// variants of non-deleted products; non-deleted products), so a
// binned product's barcode stays reusable, matching the write-side
// uniqueness check.
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
      // 1 + 3: variant-level codes (barcode or sku).
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

      // 2 + 4: product-level codes (barcode, sku or code).
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

      const decision = resolveBarcodeLookup(code, variantMatches, productMatches);

      if (decision.type === "ambiguous") {
         return NextResponse.json(
            { error: decision.error, matches: decision.matches },
            { status: 409 },
         );
      }

      if (decision.type === "variant") {
         const variant = decision.variant;
         const product = await prisma.product.findFirst({
            where: { id: variant.productId, isDeleted: false },
            include: productInclude,
         });
         if (product) {
            return NextResponse.json({
               matchType: "variant",
               matchedOn: decision.matchedOn,
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
         // The variant's product vanished between the two reads
         // (deleted concurrently) — nothing sellable carries the code.
         return NextResponse.json(
            { error: "No product or variant carries this code" },
            { status: 404 },
         );
      }

      if (decision.type === "product") {
         return NextResponse.json({
            matchType: "product",
            matchedOn: decision.matchedOn,
            product: decision.product,
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
