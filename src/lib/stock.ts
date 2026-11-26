/**
 * Shared inventory / stock-movement engine.
 *
 * Centralises every stock effect so order create/update/cancel/delete,
 * purchase create/delete and recycle-bin restores all behave the same
 * way and can never drift apart (ORD-01, ORD-02, PUR-03, INV-01):
 *
 *  - Stock availability is validated INSIDE the caller's transaction
 *    when StoreSetting.enableStockValidation is on and the product
 *    does not allow negative stock (Product.allowNegativeStock).
 *  - Every quantity change writes a matching StockMovement row.
 *  - ProductWarehouseStock for the default warehouse (or the product's
 *    single warehouse row) is adjusted by the same delta so warehouse
 *    stock stays consistent with Product.quantity.
 *  - Crossing a product's lowStockAlert threshold downwards creates a
 *    single broadcast low-stock Notification when
 *    StoreSetting.enableLowStockAlert is enabled (NOTIF-02).
 *
 * Variant lines (INV-02, Phase 3A): a line may carry a variantId. The
 * invariant — already maintained by the product POST/PUT routes — is
 * that for a variable product, Product.quantity always equals the sum
 * of its variant quantities. The engine honours it by validating a
 * variant line against ProductVariant.quantity and then moving BOTH
 * the variant quantity and the product quantity by the same amount in
 * the same transaction. The movement row records the variantId (plain
 * string, matching StockMovement's loose order/purchase references).
 * Warehouse stock stays product-level and is mirrored by the product
 * delta exactly as before. Lines without a variantId behave exactly
 * as they did before INV-02.
 *
 * All functions take the caller's transaction client (`tx`) so the
 * stock change, movement record and business write commit or roll
 * back together.
 */

import { resolveStockOutProductCanOrder } from "@src/lib/productSettings";

// ── Phase 1E: courier-submission stock availability ──────────────────

export interface CourierShortage {
   productId: string;
   variantId: string | null;
   productName: string;
   required: number;
   available: number;
}

/**
 * Thrown by the single-order update paths when the Out Of Stock
 * can Submit Courier setting is OFF and an order being assigned a
 * courier does not have the stock to fulfil it. Mapped to a 400
 * by the route, like InsufficientStockError.
 */
export class CourierStockError extends Error {
   shortages: CourierShortage[];

   constructor(shortages: CourierShortage[]) {
      super(
         `Insufficient stock for courier submission: ${shortages
            .map((s) => `${s.productName} (need ${s.required}, have ${s.available})`)
            .join("; ")}`,
      );
      this.name = "CourierStockError";
      this.shortages = shortages;
   }
}

type CourierProductRow = {
   id: string;
   productName: string;
   quantity: number;
   trackInventory?: boolean | null;
   allowNegativeStock?: boolean | null;
   variants?: Array<{ id: string; quantity: number }> | null;
};

type CourierItemLine = {
   productId: string | null;
   variantId?: string | null;
   quantity: number;
   name?: string | null;
};

/**
 * Pure shortage computation for a courier submission. Required
 * quantities are aggregated per (productId, variantId) pool and
 * compared against the pool's CURRENT quantity plus whatever of
 * that pool the order itself already holds (heldItems — its own
 * deducted lines, whose units are already out of the pool and
 * reserved for it). Lines are skipped when the product does not
 * track inventory or allows negative stock (it can always be
 * fulfilled), and when the product no longer exists (nothing to
 * verify against — the stock engine skips those lines too). This
 * check deliberately ignores the Stock Out Product can Order
 * setting: courier submission is gated on physical availability.
 */
export function findCourierShortages(
   products: CourierProductRow[],
   items: CourierItemLine[],
   heldItems: CourierItemLine[] = [],
): CourierShortage[] {
   const productMap = new Map(products.map((p) => [p.id, p]));
   const pools = new Map<
      string,
      { product: CourierProductRow; variantId: string | null; required: number; held: number }
   >();
   const keyOf = (productId: string, variantId: string | null) =>
      `${productId}::${variantId ?? ""}`;

   const accumulate = (lines: CourierItemLine[], field: "required" | "held") => {
      for (const line of lines) {
         if (!line.productId) continue;
         const product = productMap.get(line.productId);
         if (!product) continue;
         if (product.trackInventory === false) continue;
         if (product.allowNegativeStock) continue;
         const key = keyOf(line.productId, line.variantId ?? null);
         const pool = pools.get(key) || {
            product,
            variantId: line.variantId ?? null,
            required: 0,
            held: 0,
         };
         pool[field] += line.quantity || 0;
         pools.set(key, pool);
      }
   };
   accumulate(items, "required");
   accumulate(heldItems, "held");

   const shortages: CourierShortage[] = [];
   for (const pool of pools.values()) {
      if (pool.required <= 0) continue;
      let available = pool.product.quantity;
      if (pool.variantId) {
         const variant = (pool.product.variants || []).find(
            (v) => v.id === pool.variantId,
         );
         available = variant ? variant.quantity : 0;
      }
      if (available + pool.held < pool.required) {
         shortages.push({
            productId: pool.product.id,
            variantId: pool.variantId,
            productName: pool.product.productName,
            required: pool.required,
            available: available + pool.held,
         });
      }
   }
   return shortages;
}

/**
 * Load the products behind the required lines and compute courier
 * shortages. `heldItems` are the lines whose units are already out
 * of stock for this order (its deducted lines — for an edit, the
 * PRE-edit lines; for a status/courier-only write, the same
 * lines). Works with any Prisma-like client.
 */
export async function checkCourierStockAvailability(
   db: any,
   items: CourierItemLine[],
   heldItems: CourierItemLine[] = [],
): Promise<CourierShortage[]> {
   const ids = Array.from(
      new Set(
         [...items, ...heldItems].map((i) => i.productId).filter(Boolean),
      ),
   ) as string[];
   if (ids.length === 0) return [];
   const products = await db.product.findMany({
      where: { id: { in: ids } },
      select: {
         id: true,
         productName: true,
         quantity: true,
         trackInventory: true,
         allowNegativeStock: true,
         variants: {
            where: { isDeleted: false },
            select: { id: true, quantity: true },
         },
      },
   });
   return findCourierShortages(products, items, heldItems);
}

export class InsufficientStockError extends Error {
   productId: string;
   productName: string;
   available: number;
   requested: number;

   constructor(productId: string, productName: string, available: number, requested: number) {
      super(
         `Insufficient stock for "${productName}": requested ${requested}, available ${available}`,
      );
      this.name = "InsufficientStockError";
      this.productId = productId;
      this.productName = productName;
      this.available = available;
      this.requested = requested;
   }
}

export class StockReversalUnsafeError extends Error {
   productName: string;
   constructor(productName: string, available: number, required: number) {
      super(
         `Cannot reverse purchase stock for "${productName}": ${required} unit(s) were added by the purchase but only ${available} remain in stock — the rest were already sold, so this reversal cannot be completed without making stock negative.`,
      );
      this.name = "StockReversalUnsafeError";
      this.productName = productName;
   }
}

/**
 * Thrown when a stock line names a variant that does not exist or does
 * not belong to the line's product. API handlers validate variant
 * ownership before opening their transaction (→ 400), so this is a
 * defence-in-depth guard for stored/programmatic lines.
 */
export class InvalidVariantError extends Error {
   constructor(message: string) {
      super(message);
      this.name = "InvalidVariantError";
   }
}

/**
 * QA fix (B1): find the first line that names a variable product
 * without naming one of its variants. A variant-less line is deducted
 * from the product pool only, which silently breaks the product-save
 * invariant (Product.quantity = Σ variant quantities) and overstates
 * every variant's stock — so the order/purchase write paths reject
 * such lines with a 400 before writing anything.
 *
 * "Variable" is decided exactly as the rest of the codebase decides
 * it (Order Create's useOrderCreate, Quick Edit's product hook, the
 * product save handlers): `productType === "Variable"` AND the
 * product has at least one live (not soft-deleted) variant — the
 * same variant set the products API returns to the pickers.
 *
 * Works with any Prisma-like client (root client or transaction
 * client). Returns the offending product's id + name, or null.
 */
export async function findVariantlessVariableLine(
   db: any,
   lines: Array<{ productId: string | null | undefined; variantId?: string | null }>,
): Promise<{ productId: string; productName: string } | null> {
   const candidateIds = Array.from(
      new Set(
         lines
            .filter((l) => l.productId && !l.variantId)
            .map((l) => l.productId as string),
      ),
   );
   if (candidateIds.length === 0) return null;

   const products = await db.product.findMany({
      where: { id: { in: candidateIds } },
      select: { id: true, productName: true, productType: true },
   });
   const variableIds = products
      .filter((p: any) => p.productType === "Variable")
      .map((p: any) => p.id as string);
   if (variableIds.length === 0) return null;

   const liveVariants = await db.productVariant.findMany({
      where: { productId: { in: variableIds }, isDeleted: false },
      select: { productId: true },
   });
   const withLiveVariants = new Set(liveVariants.map((v: any) => v.productId));
   const productById = new Map<string, any>(
      products.map((p: any) => [p.id, p] as [string, any]),
   );

   for (const line of lines) {
      if (!line.productId || line.variantId) continue;
      if (!withLiveVariants.has(line.productId)) continue;
      const product = productById.get(line.productId);
      return {
         productId: line.productId,
         productName: product?.productName || line.productId,
      };
   }
   return null;
}

export interface StockSettings {
   enableStockValidation: boolean;
   enableLowStockAlert: boolean;
   /**
    * Phase 1D (Product Settings → Stock Out Product can Order):
    * when true, order-side stock validation is relaxed — orders
    * may deduct past zero. Optional so existing callers/tests that
    * build settings literals keep the strict behaviour.
    */
   stockOutProductCanOrder?: boolean;
}

/**
 * The effective ORDER-side validation switch: the master
 * enableStockValidation column AND NOT the Stock Out Product can
 * Order setting. Per-product allowNegativeStock is applied
 * separately at each guard site, exactly as before. Purchase and
 * manual-adjustment paths do not use this helper — the setting
 * governs ordering only.
 */
export function orderStockValidationOn(settings: StockSettings): boolean {
   return settings.enableStockValidation && settings.stockOutProductCanOrder !== true;
}

/**
 * Read the stock-related store settings. Works with any Prisma-like
 * client (root client or transaction client).
 */
export async function loadStockSettings(db: any): Promise<StockSettings> {
   try {
      const s = await db.storeSetting.findUnique({ where: { id: "default" } });
      if (!s) {
         // Schema defaults: validation on, low-stock alerts on.
         return {
            enableStockValidation: true,
            enableLowStockAlert: true,
            stockOutProductCanOrder: false,
         };
      }
      return {
         enableStockValidation: s.enableStockValidation !== false,
         enableLowStockAlert: s.enableLowStockAlert !== false,
         stockOutProductCanOrder: resolveStockOutProductCanOrder(s.customConfig),
      };
   } catch {
      return {
         enableStockValidation: true,
         enableLowStockAlert: true,
         stockOutProductCanOrder: false,
      };
   }
}

/**
 * Keep ProductWarehouseStock consistent with a Product.quantity delta
 * (INV-01). The delta is applied to the default warehouse's row; if
 * the product has no row there but exactly one warehouse row overall,
 * that row is used. When a default warehouse exists but the product
 * has no row yet, one is created with the delta. Otherwise (multiple
 * warehouses, none default) the split is ambiguous and rows are left
 * untouched — Product.quantity remains the source of truth.
 */
export async function adjustWarehouseStock(
   tx: any,
   productId: string,
   delta: number,
): Promise<void> {
   if (!delta) return;
   try {
      const rows = await tx.productWarehouseStock.findMany({
         where: { productId },
      });
      const defaultWarehouse = await tx.warehouse.findFirst({
         where: { isDeleted: false, isDefault: true },
      });

      let target = defaultWarehouse
         ? rows.find((r: any) => r.warehouseId === defaultWarehouse.id)
         : undefined;
      if (!target && rows.length === 1) target = rows[0];

      if (target) {
         await tx.productWarehouseStock.update({
            where: { id: target.id },
            data: { quantity: { increment: delta } },
         });
      } else if (defaultWarehouse && rows.length === 0) {
         await tx.productWarehouseStock.create({
            data: {
               productId,
               warehouseId: defaultWarehouse.id,
               quantity: delta,
            },
         });
      }
   } catch {
      // Warehouse stock is a mirror of Product.quantity; never let a
      // mirror failure roll back the primary stock operation.
   }
}

interface StockLine {
   productId: string;
   quantity: number;
   variantId?: string | null;
}

interface AggregatedLine {
   productId: string;
   variantId: string | null;
   quantity: number;
}

/**
 * Aggregate lines by product + variant (INV-02): two lines naming the
 * same product but different variants are distinct stock pools and
 * must never be merged; two lines naming the same variant are.
 */
function aggregateLines(lines: StockLine[]): Map<string, AggregatedLine> {
   const map = new Map<string, AggregatedLine>();
   for (const line of lines) {
      if (!line.productId) continue;
      const qty = Math.max(0, Math.floor(Number(line.quantity) || 0));
      if (qty === 0) continue;
      const variantId = line.variantId || null;
      const key = `${line.productId}::${variantId ?? ""}`;
      const existing = map.get(key);
      if (existing) {
         existing.quantity += qty;
      } else {
         map.set(key, { productId: line.productId, variantId, quantity: qty });
      }
   }
   return map;
}

/**
 * Conditional product decrement (Phase C4, audit R-1 / P2-22).
 *
 * The availability pre-checks elsewhere in this engine read a
 * snapshot; two concurrent sales of the last unit could both pass
 * it and then both decrement unconditionally, driving stock
 * negative. When `guarded` (stock validation on and the product
 * does not allow negative stock), the decrement itself is the
 * race guard: an atomic updateMany that only applies while
 * quantity >= qty. count === 0 means a concurrent writer won the
 * race — throw InsufficientStockError (with a freshly-read
 * available figure) so the caller's transaction rolls back with
 * no partial writes. When not guarded, negative stock is allowed
 * by design and the decrement stays unconditional.
 */
async function decrementProductGuarded(
   tx: any,
   product: { id: string; productName: string },
   qty: number,
   guarded: boolean,
): Promise<void> {
   if (!guarded) {
      await tx.product.update({
         where: { id: product.id },
         data: { quantity: { decrement: qty } },
      });
      return;
   }
   const result = await tx.product.updateMany({
      where: { id: product.id, quantity: { gte: qty } },
      data: { quantity: { decrement: qty } },
   });
   if (!result || result.count === 0) {
      const fresh = await tx.product.findUnique({
         where: { id: product.id },
         select: { quantity: true },
      });
      throw new InsufficientStockError(
         product.id,
         product.productName,
         fresh?.quantity ?? 0,
         qty,
      );
   }
}

/** Variant-pool equivalent of decrementProductGuarded. */
async function decrementVariantGuarded(
   tx: any,
   product: { id: string; productName: string },
   variant: { id: string; variantName: string },
   qty: number,
   guarded: boolean,
): Promise<void> {
   if (!guarded) {
      await tx.productVariant.update({
         where: { id: variant.id },
         data: { quantity: { decrement: qty } },
      });
      return;
   }
   const result = await tx.productVariant.updateMany({
      where: { id: variant.id, quantity: { gte: qty } },
      data: { quantity: { decrement: qty } },
   });
   if (!result || result.count === 0) {
      const fresh = await tx.productVariant.findUnique({
         where: { id: variant.id },
         select: { quantity: true },
      });
      throw new InsufficientStockError(
         product.id,
         `${product.productName} (${variant.variantName})`,
         fresh?.quantity ?? 0,
         qty,
      );
   }
}

async function loadVariantMap(
   tx: any,
   entries: AggregatedLine[],
): Promise<Map<string, any>> {
   const ids = Array.from(
      new Set(
         entries
            .map((e) => e.variantId)
            .filter((v): v is string => Boolean(v)),
      ),
   );
   if (ids.length === 0) return new Map();
   const variants = await tx.productVariant.findMany({
      where: { id: { in: ids } },
      select: {
         id: true,
         productId: true,
         variantName: true,
         quantity: true,
         lowStockAlert: true,
      },
   });
   return new Map<string, any>(variants.map((v: any) => [v.id, v] as [string, any]));
}

/**
 * Resolve the variant for an aggregated line, enforcing ownership.
 * Returns null for non-variant lines.
 */
function resolveVariant(variantMap: Map<string, any>, entry: AggregatedLine): any | null {
   if (!entry.variantId) return null;
   const variant = variantMap.get(entry.variantId);
   if (!variant || variant.productId !== entry.productId) {
      throw new InvalidVariantError(
         `Variant ${entry.variantId} does not belong to product ${entry.productId}`,
      );
   }
   return variant;
}

async function maybeNotifyLowStock(
   tx: any,
   settings: StockSettings,
   product: { id: string; productName: string; lowStockAlert: number | null },
   beforeQty: number,
   afterQty: number,
): Promise<void> {
   if (!settings.enableLowStockAlert) return;
   const threshold = product.lowStockAlert ?? 10;
   // Notify only on the downward crossing — restocking and further
   // sales below the threshold do not spam new notifications.
   if (beforeQty > threshold && afterQty <= threshold) {
      try {
         await tx.notification.create({
            data: {
               userId: null, // broadcast to all staff
               title: "Low stock alert",
               message: `"${product.productName}" is running low: ${afterQty} unit(s) remaining (alert threshold: ${threshold}).`,
               category: "Inventory",
               type: "warning",
               link: "/admin/products",
            },
         });
      } catch {
         // Notifications must never break a stock operation.
      }
   }
}

/**
 * Deduct stock for sold items (order create / un-cancel / bin restore
 * of an order). Validates availability inside the transaction when
 * stock validation is enabled — per variant for variant lines, per
 * product otherwise. Writes SALE movements (recording variantId) and
 * mirrors the delta into warehouse stock. Returns nothing; throws
 * InsufficientStockError (→ caller responds 400) on validation failure.
 */
export async function deductStockForItems(
   tx: any,
   lines: StockLine[],
   opts: {
      settings: StockSettings;
      orderId?: string | null;
      note: string;
   },
): Promise<void> {
   const aggregated = aggregateLines(lines);
   if (aggregated.size === 0) return;
   const entries = Array.from(aggregated.values());

   const products = await tx.product.findMany({
      where: { id: { in: Array.from(new Set(entries.map((e) => e.productId))) } },
      select: {
         id: true,
         productName: true,
         quantity: true,
         allowNegativeStock: true,
         trackInventory: true,
         lowStockAlert: true,
      },
   });
   const productMap = new Map<string, any>(products.map((p: any) => [p.id, p] as [string, any]));
   const variantMap = await loadVariantMap(tx, entries);
   // Running product quantities: several variant lines can belong to
   // one product, so low-stock notification math must track the
   // in-transaction balance rather than the initially-read value.
   const runningQty = new Map<string, number>(
      products.map((p: any) => [p.id, p.quantity] as [string, number]),
   );

   for (const entry of entries) {
      const product = productMap.get(entry.productId);
      if (!product) continue; // Unknown product id — snapshot-only line, no stock to move.
      if (product.trackInventory === false) continue;
      const variant = resolveVariant(variantMap, entry);
      const qty = entry.quantity;

      if (orderStockValidationOn(opts.settings) && !product.allowNegativeStock) {
         if (variant) {
            if (variant.quantity < qty) {
               throw new InsufficientStockError(
                  product.id,
                  `${product.productName} (${variant.variantName})`,
                  variant.quantity,
                  qty,
               );
            }
         } else if (product.quantity < qty) {
            throw new InsufficientStockError(
               product.id,
               product.productName,
               product.quantity,
               qty,
            );
         }
      }

      const beforeQty = runningQty.get(entry.productId) ?? product.quantity;
      // C4-5 (audit R-1 / P2-22): the decrements are conditional
      // (atomic quantity >= qty) whenever the pre-check above was
      // enforced, so a concurrent sale of the last unit cannot
      // slip past the snapshot check — the losing writer throws
      // and its transaction rolls back. The variant pool is
      // decremented first so a variant race leaves no partial
      // product write behind.
      const guarded =
         orderStockValidationOn(opts.settings) && !product.allowNegativeStock;
      if (variant) {
         await decrementVariantGuarded(tx, product, variant, qty, guarded);
      }
      await decrementProductGuarded(tx, product, qty, guarded);
      runningQty.set(entry.productId, beforeQty - qty);
      await adjustWarehouseStock(tx, entry.productId, -qty);
      await tx.stockMovement.create({
         data: {
            productId: entry.productId,
            type: "SALE",
            quantity: -qty,
            variantId: entry.variantId,
            orderId: opts.orderId || null,
            note: opts.note,
         },
      });
      await maybeNotifyLowStock(
         tx,
         opts.settings,
         product,
         beforeQty,
         beforeQty - qty,
      );
   }
}

/**
 * Return stock for items (order cancel/delete, order item reduction).
 * Writes RETURN movements with positive quantities, mirroring the
 * existing order-PUT convention, and mirrors warehouse stock. Variant
 * lines restore both the variant and the product quantity.
 */
export async function restoreStockForItems(
   tx: any,
   lines: StockLine[],
   opts: {
      orderId?: string | null;
      note: string;
   },
): Promise<void> {
   const aggregated = aggregateLines(lines);
   if (aggregated.size === 0) return;
   const entries = Array.from(aggregated.values());

   const products = await tx.product.findMany({
      where: { id: { in: Array.from(new Set(entries.map((e) => e.productId))) } },
      select: { id: true, trackInventory: true },
   });
   const productMap = new Map<string, any>(products.map((p: any) => [p.id, p] as [string, any]));
   const variantMap = await loadVariantMap(tx, entries);

   for (const entry of entries) {
      const product = productMap.get(entry.productId);
      if (!product) continue;
      if (product.trackInventory === false) continue;
      const variant = resolveVariant(variantMap, entry);

      await tx.product.update({
         where: { id: entry.productId },
         data: { quantity: { increment: entry.quantity } },
      });
      if (variant) {
         await tx.productVariant.update({
            where: { id: variant.id },
            data: { quantity: { increment: entry.quantity } },
         });
      }
      await adjustWarehouseStock(tx, entry.productId, entry.quantity);
      await tx.stockMovement.create({
         data: {
            productId: entry.productId,
            type: "RETURN",
            quantity: entry.quantity,
            variantId: entry.variantId,
            orderId: opts.orderId || null,
            note: opts.note,
         },
      });
   }
}

/**
 * Apply a signed net stock difference for one product (order PUT
 * netting). Positive diff = more units ordered (deduct, validated);
 * negative diff = units returned to stock. When opts.variantId is
 * set, the difference applies to that variant: validation is against
 * the variant's quantity and both quantities move together (INV-02).
 */
export async function applyStockDifference(
   tx: any,
   productId: string,
   diff: number,
   opts: {
      settings: StockSettings;
      orderId?: string | null;
      variantId?: string | null;
      increaseNote: string | ((qty: number) => string);
      decreaseNote: string | ((qty: number) => string);
   },
): Promise<void> {
   if (!diff || !productId) return;

   const product = await tx.product.findUnique({
      where: { id: productId },
      select: {
         id: true,
         productName: true,
         quantity: true,
         allowNegativeStock: true,
         trackInventory: true,
         lowStockAlert: true,
      },
   });
   if (!product || product.trackInventory === false) return;

   let variant: any | null = null;
   if (opts.variantId) {
      variant = await tx.productVariant.findUnique({
         where: { id: opts.variantId },
         select: {
            id: true,
            productId: true,
            variantName: true,
            quantity: true,
            lowStockAlert: true,
         },
      });
      if (!variant || variant.productId !== productId) {
         throw new InvalidVariantError(
            `Variant ${opts.variantId} does not belong to product ${productId}`,
         );
      }
   }

   if (diff > 0) {
      if (orderStockValidationOn(opts.settings) && !product.allowNegativeStock) {
         if (variant) {
            if (variant.quantity < diff) {
               throw new InsufficientStockError(
                  product.id,
                  `${product.productName} (${variant.variantName})`,
                  variant.quantity,
                  diff,
               );
            }
         } else if (product.quantity < diff) {
            throw new InsufficientStockError(
               product.id,
               product.productName,
               product.quantity,
               diff,
            );
         }
      }
      const beforeQty = product.quantity;
      // C4-5 (audit R-1 / P2-22): conditional decrement, same race
      // guard as deductStockForItems (variant pool first).
      const guarded =
         orderStockValidationOn(opts.settings) && !product.allowNegativeStock;
      if (variant) {
         await decrementVariantGuarded(tx, product, variant, diff, guarded);
      }
      await decrementProductGuarded(tx, product, diff, guarded);
      await adjustWarehouseStock(tx, productId, -diff);
      await tx.stockMovement.create({
         data: {
            productId,
            type: "SALE",
            quantity: -diff,
            variantId: opts.variantId || null,
            orderId: opts.orderId || null,
            note:
               typeof opts.increaseNote === "function"
                  ? opts.increaseNote(diff)
                  : opts.increaseNote,
         },
      });
      await maybeNotifyLowStock(
         tx,
         opts.settings,
         product,
         beforeQty,
         beforeQty - diff,
      );
   } else {
      const returnedQty = -diff;
      await tx.product.update({
         where: { id: productId },
         data: { quantity: { increment: returnedQty } },
      });
      if (variant) {
         await tx.productVariant.update({
            where: { id: variant.id },
            data: { quantity: { increment: returnedQty } },
         });
      }
      await adjustWarehouseStock(tx, productId, returnedQty);
      await tx.stockMovement.create({
         data: {
            productId,
            type: "RETURN",
            quantity: returnedQty,
            variantId: opts.variantId || null,
            orderId: opts.orderId || null,
            note:
               typeof opts.decreaseNote === "function"
                  ? opts.decreaseNote(returnedQty)
                  : opts.decreaseNote,
         },
      });
   }
}

/**
 * Add stock for purchased items (purchase create / bin restore of a
 * purchase). Writes PURCHASE movements and mirrors warehouse stock.
 * Variant lines increment both the variant and the product quantity.
 */
export async function addStockForPurchaseItems(
   tx: any,
   lines: StockLine[],
   opts: { purchaseId?: string | null; note: string },
): Promise<void> {
   const aggregated = aggregateLines(lines);
   if (aggregated.size === 0) return;
   const entries = Array.from(aggregated.values());

   const products = await tx.product.findMany({
      where: { id: { in: Array.from(new Set(entries.map((e) => e.productId))) } },
      select: { id: true, trackInventory: true },
   });
   const productMap = new Map<string, any>(products.map((p: any) => [p.id, p] as [string, any]));
   const variantMap = await loadVariantMap(tx, entries);

   for (const entry of entries) {
      const product = productMap.get(entry.productId);
      if (!product) continue;
      if (product.trackInventory === false) continue;
      const variant = resolveVariant(variantMap, entry);

      await tx.product.update({
         where: { id: entry.productId },
         data: { quantity: { increment: entry.quantity } },
      });
      if (variant) {
         await tx.productVariant.update({
            where: { id: variant.id },
            data: { quantity: { increment: entry.quantity } },
         });
      }
      await adjustWarehouseStock(tx, entry.productId, entry.quantity);
      await tx.stockMovement.create({
         data: {
            productId: entry.productId,
            type: "PURCHASE",
            quantity: entry.quantity,
            variantId: entry.variantId,
            purchaseId: opts.purchaseId || null,
            note: opts.note,
         },
      });
   }
}

/**
 * Reverse the stock a purchase added (purchase soft-delete). Safety
 * rule (fix instruction #15): if any purchased units have already
 * been sold — i.e. reversing would push stock below zero — the whole
 * reversal is rejected with StockReversalUnsafeError so inventory is
 * never silently corrupted. The check runs per product AND per
 * variant (INV-02): a variant whose units were sold blocks reversal
 * even when the product total would survive. Writes ADJUSTMENT
 * movements with negative quantities so the original PURCHASE
 * movements stay in history.
 */
export async function reverseStockForPurchaseItems(
   tx: any,
   lines: StockLine[],
   opts: { purchaseId?: string | null; note: string },
): Promise<void> {
   const aggregated = aggregateLines(lines);
   if (aggregated.size === 0) return;
   const entries = Array.from(aggregated.values());

   const products = await tx.product.findMany({
      where: { id: { in: Array.from(new Set(entries.map((e) => e.productId))) } },
      select: { id: true, productName: true, quantity: true, trackInventory: true },
   });
   const productMap = new Map<string, any>(products.map((p: any) => [p.id, p] as [string, any]));
   const variantMap = await loadVariantMap(tx, entries);

   // Pre-check ALL lines before mutating anything. Product totals are
   // summed across the product's entries so several variant lines of
   // one product cannot each pass against the same stale total.
   const productTotals = new Map<string, number>();
   for (const entry of entries) {
      productTotals.set(
         entry.productId,
         (productTotals.get(entry.productId) || 0) + entry.quantity,
      );
   }
   for (const [productId, qty] of productTotals.entries()) {
      const product = productMap.get(productId);
      if (!product || product.trackInventory === false) continue;
      if (product.quantity < qty) {
         throw new StockReversalUnsafeError(product.productName, product.quantity, qty);
      }
   }
   for (const entry of entries) {
      const product = productMap.get(entry.productId);
      if (!product || product.trackInventory === false) continue;
      const variant = resolveVariant(variantMap, entry);
      if (variant && variant.quantity < entry.quantity) {
         throw new StockReversalUnsafeError(
            `${product.productName} (${variant.variantName})`,
            variant.quantity,
            entry.quantity,
         );
      }
   }

   for (const entry of entries) {
      const product = productMap.get(entry.productId);
      if (!product || product.trackInventory === false) continue;
      const variant = resolveVariant(variantMap, entry);

      await tx.product.update({
         where: { id: entry.productId },
         data: { quantity: { decrement: entry.quantity } },
      });
      if (variant) {
         await tx.productVariant.update({
            where: { id: variant.id },
            data: { quantity: { decrement: entry.quantity } },
         });
      }
      await adjustWarehouseStock(tx, entry.productId, -entry.quantity);
      await tx.stockMovement.create({
         data: {
            productId: entry.productId,
            type: "ADJUSTMENT",
            quantity: -entry.quantity,
            variantId: entry.variantId,
            purchaseId: opts.purchaseId || null,
            note: opts.note,
         },
      });
   }
}

/**
 * Deduct stock for a purchase return (Phase 4, D2). Same
 * never-negative safety rule as reverseStockForPurchaseItems — the
 * pre-check runs per product AND per variant over the aggregated
 * lines and throws StockReversalUnsafeError before anything is
 * written when units were already sold — but the movements use the
 * RETURN type with NEGATIVE quantities (R4 in the schema diff: the
 * sign + the PRET_ id in the note + purchaseId make the direction
 * unambiguous against order-side RETURN restores, which are
 * positive).
 */
export async function deductStockForPurchaseReturn(
   tx: any,
   lines: StockLine[],
   opts: { purchaseId?: string | null; note: string },
): Promise<void> {
   const aggregated = aggregateLines(lines);
   if (aggregated.size === 0) return;
   const entries = Array.from(aggregated.values());

   const products = await tx.product.findMany({
      where: { id: { in: Array.from(new Set(entries.map((e) => e.productId))) } },
      select: { id: true, productName: true, quantity: true, trackInventory: true },
   });
   const productMap = new Map<string, any>(products.map((p: any) => [p.id, p] as [string, any]));
   const variantMap = await loadVariantMap(tx, entries);

   const productTotals = new Map<string, number>();
   for (const entry of entries) {
      productTotals.set(
         entry.productId,
         (productTotals.get(entry.productId) || 0) + entry.quantity,
      );
   }
   for (const [productId, qty] of productTotals.entries()) {
      const product = productMap.get(productId);
      if (!product || product.trackInventory === false) continue;
      if (product.quantity < qty) {
         throw new StockReversalUnsafeError(product.productName, product.quantity, qty);
      }
   }
   for (const entry of entries) {
      const product = productMap.get(entry.productId);
      if (!product || product.trackInventory === false) continue;
      const variant = resolveVariant(variantMap, entry);
      if (variant && variant.quantity < entry.quantity) {
         throw new StockReversalUnsafeError(
            `${product.productName} (${variant.variantName})`,
            variant.quantity,
            entry.quantity,
         );
      }
   }

   for (const entry of entries) {
      const product = productMap.get(entry.productId);
      if (!product || product.trackInventory === false) continue;
      const variant = resolveVariant(variantMap, entry);

      await tx.product.update({
         where: { id: entry.productId },
         data: { quantity: { decrement: entry.quantity } },
      });
      if (variant) {
         await tx.productVariant.update({
            where: { id: variant.id },
            data: { quantity: { decrement: entry.quantity } },
         });
      }
      await adjustWarehouseStock(tx, entry.productId, -entry.quantity);
      await tx.stockMovement.create({
         data: {
            productId: entry.productId,
            type: "RETURN",
            quantity: -entry.quantity,
            variantId: entry.variantId,
            purchaseId: opts.purchaseId || null,
            note: opts.note,
         },
      });
   }
}

/**
 * Put stock back when a purchase return is deleted (Phase 4, D2) —
 * the exact inverse of deductStockForPurchaseReturn: RETURN
 * movements with POSITIVE quantities referencing the same PRET_ id,
 * so the movement ledger shows the return and its reversal as a
 * matched pair. No availability check: stock only ever increases.
 */
export async function restoreStockForPurchaseReturn(
   tx: any,
   lines: StockLine[],
   opts: { purchaseId?: string | null; note: string },
): Promise<void> {
   const aggregated = aggregateLines(lines);
   if (aggregated.size === 0) return;
   const entries = Array.from(aggregated.values());

   const products = await tx.product.findMany({
      where: { id: { in: Array.from(new Set(entries.map((e) => e.productId))) } },
      select: { id: true, trackInventory: true },
   });
   const productMap = new Map<string, any>(products.map((p: any) => [p.id, p] as [string, any]));
   const variantMap = await loadVariantMap(tx, entries);

   for (const entry of entries) {
      const product = productMap.get(entry.productId);
      if (!product) continue;
      if (product.trackInventory === false) continue;
      const variant = resolveVariant(variantMap, entry);

      await tx.product.update({
         where: { id: entry.productId },
         data: { quantity: { increment: entry.quantity } },
      });
      if (variant) {
         await tx.productVariant.update({
            where: { id: variant.id },
            data: { quantity: { increment: entry.quantity } },
         });
      }
      await adjustWarehouseStock(tx, entry.productId, entry.quantity);
      await tx.stockMovement.create({
         data: {
            productId: entry.productId,
            type: "RETURN",
            quantity: entry.quantity,
            variantId: entry.variantId,
            purchaseId: opts.purchaseId || null,
            note: opts.note,
         },
      });
   }
}

/**
 * Manual stock adjustment (Stock workspace, Phase 3A): move a single
 * product's — or a single variant's — stock by a signed delta with a
 * mandatory reason. Positive delta = stock in, negative = stock out.
 * A negative adjustment is validated against the available quantity
 * (variant-level for variant adjustments) unless the product allows
 * negative stock. Writes one ADJUSTMENT movement carrying the reason
 * as its note, and mirrors warehouse stock by the product delta.
 * Returns the resulting product (and variant) quantities.
 */
export async function adjustStock(
   tx: any,
   args: {
      productId: string;
      variantId?: string | null;
      delta: number;
      reason: string;
      settings: StockSettings;
   },
): Promise<{ productQuantity: number; variantQuantity: number | null }> {
   const { productId, delta, reason, settings } = args;
   if (!delta || !Number.isFinite(delta)) {
      throw new Error("Adjustment quantity must be a non-zero number");
   }
   if (!reason || !reason.trim()) {
      throw new Error("A reason is required for a manual stock adjustment");
   }

   const product = await tx.product.findUnique({
      where: { id: productId },
      select: {
         id: true,
         productName: true,
         quantity: true,
         allowNegativeStock: true,
         trackInventory: true,
         lowStockAlert: true,
      },
   });
   if (!product) {
      throw new Error("Product not found");
   }
   if (product.trackInventory === false) {
      throw new Error(`"${product.productName}" does not track inventory`);
   }

   let variant: any | null = null;
   if (args.variantId) {
      variant = await tx.productVariant.findUnique({
         where: { id: args.variantId },
         select: {
            id: true,
            productId: true,
            variantName: true,
            quantity: true,
            lowStockAlert: true,
         },
      });
      if (!variant || variant.productId !== productId) {
         throw new InvalidVariantError(
            `Variant ${args.variantId} does not belong to product ${productId}`,
         );
      }
   }

   if (delta < 0 && settings.enableStockValidation && !product.allowNegativeStock) {
      if (variant) {
         if (variant.quantity < -delta) {
            throw new InsufficientStockError(
               product.id,
               `${product.productName} (${variant.variantName})`,
               variant.quantity,
               -delta,
            );
         }
      } else if (product.quantity < -delta) {
         throw new InsufficientStockError(
            product.id,
            product.productName,
            product.quantity,
            -delta,
         );
      }
   }

   const beforeQty = product.quantity;
   await tx.product.update({
      where: { id: productId },
      data: { quantity: { increment: delta } },
   });
   let variantQuantity: number | null = null;
   if (variant) {
      const updatedVariant = await tx.productVariant.update({
         where: { id: variant.id },
         data: { quantity: { increment: delta } },
         select: { quantity: true },
      });
      variantQuantity = updatedVariant.quantity;
   }
   await adjustWarehouseStock(tx, productId, delta);
   await tx.stockMovement.create({
      data: {
         productId,
         type: "ADJUSTMENT",
         quantity: delta,
         variantId: args.variantId || null,
         note: reason.trim(),
      },
   });
   if (delta < 0) {
      await maybeNotifyLowStock(
         tx,
         settings,
         product,
         beforeQty,
         beforeQty + delta,
      );
   }

   return {
      productQuantity: beforeQty + delta,
      variantQuantity,
   };
}

/**
 * An order "holds" stock while it is neither cancelled, failed nor
 * deleted. FAILED is TERMINAL (Phase B1, audit C-4 / P1-1 — the
 * owner's decision): every statistic already treated it as terminal,
 * so it is treated exactly like CANCELLED here and in every caller —
 * creating an order directly in FAILED deducts nothing, moving into
 * FAILED restores exactly once, moving out of FAILED re-deducts with
 * validation, deleting a FAILED order restores nothing, and a Bin
 * restore of a FAILED order deducts nothing. Stock transitions must
 * key off this predicate so each deduction is reversed exactly once
 * (ORD-02 duplicate-prevention).
 *
 * Phase 1B note: this predicate is the PRE-1B rule, retained for
 * reference and for the historical backfill
 * (scripts/backfill-stock-deducted.js), whose status-based
 * expectation it defines. Order write paths no longer decide from
 * it — the recorded Order.stockDeducted flag plus
 * decideStockHolding (lib/productSettings) are authoritative,
 * because a configurable trigger cannot be derived from status
 * alone (HOLD is reachable from both sides of any trigger).
 */
export function orderHoldsStock(order: {
   status: string;
   isDeleted: boolean;
}): boolean {
   return (
      !order.isDeleted &&
      order.status !== "CANCELLED" &&
      order.status !== "FAILED"
   );
}
