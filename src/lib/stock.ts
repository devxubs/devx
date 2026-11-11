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
 * All functions take the caller's transaction client (`tx`) so the
 * stock change, movement record and business write commit or roll
 * back together.
 */

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
         `Cannot reverse purchase stock for "${productName}": ${required} unit(s) were added by the purchase but only ${available} remain in stock (the rest were already sold). Adjust stock manually instead.`,
      );
      this.name = "StockReversalUnsafeError";
      this.productName = productName;
   }
}

export interface StockSettings {
   enableStockValidation: boolean;
   enableLowStockAlert: boolean;
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
         return { enableStockValidation: true, enableLowStockAlert: true };
      }
      return {
         enableStockValidation: s.enableStockValidation !== false,
         enableLowStockAlert: s.enableLowStockAlert !== false,
      };
   } catch {
      return { enableStockValidation: true, enableLowStockAlert: true };
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
}

function aggregateLines(lines: StockLine[]): Map<string, number> {
   const map = new Map<string, number>();
   for (const line of lines) {
      if (!line.productId) continue;
      const qty = Math.max(0, Math.floor(Number(line.quantity) || 0));
      if (qty === 0) continue;
      map.set(line.productId, (map.get(line.productId) || 0) + qty);
   }
   return map;
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
 * stock validation is enabled. Writes SALE movements and mirrors the
 * delta into warehouse stock. Returns nothing; throws
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

   const products = await tx.product.findMany({
      where: { id: { in: Array.from(aggregated.keys()) } },
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

   for (const [productId, qty] of aggregated.entries()) {
      const product = productMap.get(productId);
      if (!product) continue; // Unknown product id — snapshot-only line, no stock to move.
      if (product.trackInventory === false) continue;

      if (
         opts.settings.enableStockValidation &&
         !product.allowNegativeStock &&
         product.quantity < qty
      ) {
         throw new InsufficientStockError(
            product.id,
            product.productName,
            product.quantity,
            qty,
         );
      }

      const beforeQty = product.quantity;
      await tx.product.update({
         where: { id: productId },
         data: { quantity: { decrement: qty } },
      });
      await adjustWarehouseStock(tx, productId, -qty);
      await tx.stockMovement.create({
         data: {
            productId,
            type: "SALE",
            quantity: -qty,
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
 * existing order-PUT convention, and mirrors warehouse stock.
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

   const products = await tx.product.findMany({
      where: { id: { in: Array.from(aggregated.keys()) } },
      select: { id: true, trackInventory: true },
   });
   const productMap = new Map<string, any>(products.map((p: any) => [p.id, p] as [string, any]));

   for (const [productId, qty] of aggregated.entries()) {
      const product = productMap.get(productId);
      if (!product) continue;
      if (product.trackInventory === false) continue;

      await tx.product.update({
         where: { id: productId },
         data: { quantity: { increment: qty } },
      });
      await adjustWarehouseStock(tx, productId, qty);
      await tx.stockMovement.create({
         data: {
            productId,
            type: "RETURN",
            quantity: qty,
            orderId: opts.orderId || null,
            note: opts.note,
         },
      });
   }
}

/**
 * Apply a signed net stock difference for one product (order PUT
 * netting). Positive diff = more units ordered (deduct, validated);
 * negative diff = units returned to stock.
 */
export async function applyStockDifference(
   tx: any,
   productId: string,
   diff: number,
   opts: {
      settings: StockSettings;
      orderId?: string | null;
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

   if (diff > 0) {
      if (
         opts.settings.enableStockValidation &&
         !product.allowNegativeStock &&
         product.quantity < diff
      ) {
         throw new InsufficientStockError(
            product.id,
            product.productName,
            product.quantity,
            diff,
         );
      }
      const beforeQty = product.quantity;
      await tx.product.update({
         where: { id: productId },
         data: { quantity: { decrement: diff } },
      });
      await adjustWarehouseStock(tx, productId, -diff);
      await tx.stockMovement.create({
         data: {
            productId,
            type: "SALE",
            quantity: -diff,
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
      await adjustWarehouseStock(tx, productId, returnedQty);
      await tx.stockMovement.create({
         data: {
            productId,
            type: "RETURN",
            quantity: returnedQty,
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
 */
export async function addStockForPurchaseItems(
   tx: any,
   lines: StockLine[],
   opts: { purchaseId?: string | null; note: string },
): Promise<void> {
   const aggregated = aggregateLines(lines);
   if (aggregated.size === 0) return;

   const products = await tx.product.findMany({
      where: { id: { in: Array.from(aggregated.keys()) } },
      select: { id: true, trackInventory: true },
   });
   const productMap = new Map<string, any>(products.map((p: any) => [p.id, p] as [string, any]));

   for (const [productId, qty] of aggregated.entries()) {
      const product = productMap.get(productId);
      if (!product) continue;
      if (product.trackInventory === false) continue;

      await tx.product.update({
         where: { id: productId },
         data: { quantity: { increment: qty } },
      });
      await adjustWarehouseStock(tx, productId, qty);
      await tx.stockMovement.create({
         data: {
            productId,
            type: "PURCHASE",
            quantity: qty,
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
 * never silently corrupted. Writes ADJUSTMENT movements with negative
 * quantities so the original PURCHASE movements stay in history.
 */
export async function reverseStockForPurchaseItems(
   tx: any,
   lines: StockLine[],
   opts: { purchaseId?: string | null; note: string },
): Promise<void> {
   const aggregated = aggregateLines(lines);
   if (aggregated.size === 0) return;

   const products = await tx.product.findMany({
      where: { id: { in: Array.from(aggregated.keys()) } },
      select: { id: true, productName: true, quantity: true, trackInventory: true },
   });
   const productMap = new Map<string, any>(products.map((p: any) => [p.id, p] as [string, any]));

   // Pre-check ALL lines before mutating anything.
   for (const [productId, qty] of aggregated.entries()) {
      const product = productMap.get(productId);
      if (!product || product.trackInventory === false) continue;
      if (product.quantity < qty) {
         throw new StockReversalUnsafeError(product.productName, product.quantity, qty);
      }
   }

   for (const [productId, qty] of aggregated.entries()) {
      const product = productMap.get(productId);
      if (!product || product.trackInventory === false) continue;

      await tx.product.update({
         where: { id: productId },
         data: { quantity: { decrement: qty } },
      });
      await adjustWarehouseStock(tx, productId, -qty);
      await tx.stockMovement.create({
         data: {
            productId,
            type: "ADJUSTMENT",
            quantity: -qty,
            purchaseId: opts.purchaseId || null,
            note: opts.note,
         },
      });
   }
}

/**
 * An order "holds" stock while it is neither cancelled nor deleted.
 * Stock transitions must key off this predicate so each deduction is
 * reversed exactly once (ORD-02 duplicate-prevention).
 */
export function orderHoldsStock(order: {
   status: string;
   isDeleted: boolean;
}): boolean {
   return !order.isDeleted && order.status !== "CANCELLED";
}
