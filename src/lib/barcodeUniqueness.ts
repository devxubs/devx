/**
 * Barcode uniqueness (Phase 4, D6) — application-level validation.
 *
 * Barcodes live in ONE namespace for scanning purposes: the exact
 * lookup (`GET /api/products/barcode`) resolves a scanned code
 * against variant barcodes and product barcodes together, and
 * answers 409 when a code matches more than one sellable. A code
 * shared by a product and a variant (or two variants) is therefore
 * already ambiguous at scan time — this module keeps NEW writes
 * from creating such duplicates in the first place:
 *
 *   - product create / edit and variant create / edit validate the
 *     barcode against every non-deleted Product.barcode and every
 *     non-deleted ProductVariant.barcode (of a non-deleted product)
 *     and fail with 409 naming the conflicting product.
 *
 * There is deliberately NO database unique constraint yet: the
 * owner's existing data may already contain duplicates, and adding
 * `@unique` would make `db push` fail until a cleanup pass runs
 * (see DEVX_POS_PHASE4_SCHEMA_PROPOSALS_D6_D7.md). Application-level
 * checks narrow the race but cannot fully close it — two concurrent
 * creates can both pass the check before either writes; only the
 * proposed DB constraint eliminates that window.
 */

export interface BarcodeConflict {
   kind: "product" | "variant";
   barcode: string;
   productId: string;
   productName: string;
   variantId?: string;
   variantName?: string;
}

export class BarcodeConflictError extends Error {
   conflict: BarcodeConflict;
   statusCode = 409;
   constructor(conflict: BarcodeConflict) {
      super(barcodeConflictMessage(conflict));
      this.name = "BarcodeConflictError";
      this.conflict = conflict;
   }
}

/** Trim a raw barcode input; empty/blank becomes null (no barcode). */
export function normalizeBarcode(value: unknown): string | null {
   if (value === null || value === undefined) return null;
   const trimmed = String(value).trim();
   return trimmed ? trimmed : null;
}

/** Human-readable 409 message naming the conflicting product. */
export function barcodeConflictMessage(conflict: BarcodeConflict): string {
   if (conflict.kind === "variant") {
      return `Barcode "${conflict.barcode}" is already in use by variant "${conflict.variantName}" of product "${conflict.productName}"`;
   }
   return `Barcode "${conflict.barcode}" is already in use by product "${conflict.productName}"`;
}

/**
 * First barcode that appears more than once inside one payload
 * (e.g. two variants of the same product being saved together, or
 * a variant repeating the parent product's own barcode), or null.
 * Pure — the routes feed it the normalized codes of one request.
 */
export function findPayloadDuplicateBarcode(
   barcodes: Array<string | null | undefined>,
): string | null {
   const seen = new Set<string>();
   for (const raw of barcodes) {
      const code = normalizeBarcode(raw);
      if (!code) continue;
      if (seen.has(code)) return code;
      seen.add(code);
   }
   return null;
}

/**
 * Look up `barcode` in the unified namespace. Returns the first
 * conflict found (variants first — the scan lookup also resolves
 * variant barcodes first), or null when the code is free.
 *
 * `excludeProductId` / `excludeVariantId` remove the record being
 * edited from its own check (keeping your own barcode is not a
 * conflict). Works with any Prisma-like client (root or tx).
 */
export async function findBarcodeConflict(
   db: any,
   barcode: string,
   opts: { excludeProductId?: string; excludeVariantId?: string } = {},
): Promise<BarcodeConflict | null> {
   const code = normalizeBarcode(barcode);
   if (!code) return null;

   const variant = await db.productVariant.findFirst({
      where: {
         barcode: code,
         isDeleted: false,
         product: { isDeleted: false },
         ...(opts.excludeVariantId
            ? { id: { not: opts.excludeVariantId } }
            : {}),
      },
      select: {
         id: true,
         variantName: true,
         product: { select: { id: true, productName: true } },
      },
   });
   if (variant) {
      return {
         kind: "variant",
         barcode: code,
         productId: variant.product.id,
         productName: variant.product.productName,
         variantId: variant.id,
         variantName: variant.variantName,
      };
   }

   const product = await db.product.findFirst({
      where: {
         barcode: code,
         isDeleted: false,
         ...(opts.excludeProductId
            ? { id: { not: opts.excludeProductId } }
            : {}),
      },
      select: { id: true, productName: true },
   });
   if (product) {
      return {
         kind: "product",
         barcode: code,
         productId: product.id,
         productName: product.productName,
      };
   }

   return null;
}

/** Throwing form of findBarcodeConflict, for in-transaction use. */
export async function assertBarcodeAvailable(
   db: any,
   barcode: string | null | undefined,
   opts: { excludeProductId?: string; excludeVariantId?: string } = {},
): Promise<void> {
   const code = normalizeBarcode(barcode);
   if (!code) return;
   const conflict = await findBarcodeConflict(db, code, opts);
   if (conflict) throw new BarcodeConflictError(conflict);
}
