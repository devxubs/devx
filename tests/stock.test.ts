import { describe, it, expect } from "vitest";
import {
   deductStockForItems,
   restoreStockForItems,
   applyStockDifference,
   addStockForPurchaseItems,
   reverseStockForPurchaseItems,
   adjustStock,
   findVariantlessVariableLine,
   orderHoldsStock,
   InsufficientStockError,
   StockReversalUnsafeError,
   InvalidVariantError,
   type StockSettings,
} from "@src/lib/stock";
import { makeFakeTx } from "./helpers/fakeTx";

const VALIDATED: StockSettings = {
   enableStockValidation: true,
   enableLowStockAlert: true,
};
const UNVALIDATED: StockSettings = {
   enableStockValidation: false,
   enableLowStockAlert: false,
};

describe("deductStockForItems", () => {
   it("deducts the product quantity and writes a SALE movement", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Rice", quantity: 20 }],
      });
      await deductStockForItems(
         f.tx,
         [{ productId: "p1", quantity: 3 }],
         { settings: VALIDATED, orderId: "o1", note: "sale" },
      );
      expect(f.productQty("p1")).toBe(17);
      expect(f.movements).toHaveLength(1);
      expect(f.movements[0]).toMatchObject({
         productId: "p1",
         type: "SALE",
         quantity: -3,
         orderId: "o1",
      });
   });

   it("aggregates duplicate lines for the same product before validating", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Rice", quantity: 5 }],
      });
      await expect(
         deductStockForItems(
            f.tx,
            [
               { productId: "p1", quantity: 3 },
               { productId: "p1", quantity: 3 },
            ],
            { settings: VALIDATED, note: "sale" },
         ),
      ).rejects.toBeInstanceOf(InsufficientStockError);
      expect(f.productQty("p1")).toBe(5);
      expect(f.movements).toHaveLength(0);
   });

   it("throws InsufficientStockError when stock is short and validation is on", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Rice", quantity: 2 }],
      });
      await expect(
         deductStockForItems(
            f.tx,
            [{ productId: "p1", quantity: 5 }],
            { settings: VALIDATED, note: "sale" },
         ),
      ).rejects.toMatchObject({
         name: "InsufficientStockError",
         available: 2,
         requested: 5,
      });
      expect(f.movements).toHaveLength(0);
   });

   it("allows negative stock when validation is off", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Rice", quantity: 2 }],
      });
      await deductStockForItems(
         f.tx,
         [{ productId: "p1", quantity: 5 }],
         { settings: UNVALIDATED, note: "sale" },
      );
      expect(f.productQty("p1")).toBe(-3);
   });

   it("allows negative stock for products flagged allowNegativeStock", async () => {
      const f = makeFakeTx({
         products: [
            { id: "p1", productName: "Rice", quantity: 1, allowNegativeStock: true },
         ],
      });
      await deductStockForItems(
         f.tx,
         [{ productId: "p1", quantity: 4 }],
         { settings: VALIDATED, note: "sale" },
      );
      expect(f.productQty("p1")).toBe(-3);
   });

   it("skips products that do not track inventory", async () => {
      const f = makeFakeTx({
         products: [
            { id: "p1", productName: "Service", quantity: 0, trackInventory: false },
         ],
      });
      await deductStockForItems(
         f.tx,
         [{ productId: "p1", quantity: 1 }],
         { settings: VALIDATED, note: "sale" },
      );
      expect(f.movements).toHaveLength(0);
   });

   it("deducts BOTH the variant and the product for a variant line (INV-02 invariant)", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Shirt", quantity: 10 }],
         variants: [
            { id: "v1", productId: "p1", variantName: "M", quantity: 4 },
            { id: "v2", productId: "p1", variantName: "L", quantity: 6 },
         ],
      });
      await deductStockForItems(
         f.tx,
         [{ productId: "p1", quantity: 3, variantId: "v1" }],
         { settings: VALIDATED, orderId: "o9", note: "sale" },
      );
      expect(f.variantQty("v1")).toBe(1);
      expect(f.variantQty("v2")).toBe(6);
      expect(f.productQty("p1")).toBe(7); // 10 − 3, still Σ variants (1 + 6)
      expect(f.movements[0]).toMatchObject({ type: "SALE", quantity: -3, variantId: "v1" });
   });

   it("validates a variant line against the VARIANT quantity, not the product total", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Shirt", quantity: 10 }],
         variants: [{ id: "v1", productId: "p1", variantName: "M", quantity: 2 }],
      });
      await expect(
         deductStockForItems(
            f.tx,
            [{ productId: "p1", quantity: 5, variantId: "v1" }],
            { settings: VALIDATED, note: "sale" },
         ),
      ).rejects.toBeInstanceOf(InsufficientStockError);
   });

   it("rejects a variant that belongs to a different product", async () => {
      const f = makeFakeTx({
         products: [
            { id: "p1", productName: "Shirt", quantity: 10 },
            { id: "p2", productName: "Pants", quantity: 10 },
         ],
         variants: [{ id: "v9", productId: "p2", variantName: "32", quantity: 5 }],
      });
      await expect(
         deductStockForItems(
            f.tx,
            [{ productId: "p1", quantity: 1, variantId: "v9" }],
            { settings: VALIDATED, note: "sale" },
         ),
      ).rejects.toBeInstanceOf(InvalidVariantError);
   });

   it("creates exactly one low-stock notification on the downward threshold crossing", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Oil", quantity: 12, lowStockAlert: 10 }],
      });
      await deductStockForItems(
         f.tx,
         [{ productId: "p1", quantity: 2 }],
         { settings: VALIDATED, note: "sale" },
      );
      expect(f.productQty("p1")).toBe(10);
      expect(f.notifications).toHaveLength(1);
      expect(f.notifications[0]).toMatchObject({ category: "Inventory", type: "warning" });

      // Already at/below the threshold: further sales do not re-notify.
      const g = makeFakeTx({
         products: [{ id: "p1", productName: "Oil", quantity: 10, lowStockAlert: 10 }],
      });
      await deductStockForItems(
         g.tx,
         [{ productId: "p1", quantity: 1 }],
         { settings: VALIDATED, note: "sale" },
      );
      expect(g.notifications).toHaveLength(0);
   });
});

describe("restoreStockForItems", () => {
   it("restores product + variant quantities and writes a RETURN movement", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Shirt", quantity: 7 }],
         variants: [{ id: "v1", productId: "p1", variantName: "M", quantity: 1 }],
      });
      await restoreStockForItems(
         f.tx,
         [{ productId: "p1", quantity: 3, variantId: "v1" }],
         { orderId: "o1", note: "cancel" },
      );
      expect(f.productQty("p1")).toBe(10);
      expect(f.variantQty("v1")).toBe(4);
      expect(f.movements[0]).toMatchObject({ type: "RETURN", quantity: 3, variantId: "v1" });
   });
});

describe("applyStockDifference", () => {
   it("deducts for a positive diff and restores for a negative diff", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Rice", quantity: 10 }],
      });
      await applyStockDifference(f.tx, "p1", 4, {
         settings: VALIDATED,
         increaseNote: "more",
         decreaseNote: "less",
      });
      expect(f.productQty("p1")).toBe(6);
      await applyStockDifference(f.tx, "p1", -2, {
         settings: VALIDATED,
         increaseNote: "more",
         decreaseNote: "less",
      });
      expect(f.productQty("p1")).toBe(8);
      expect(f.movements.map((m) => m.type)).toEqual(["SALE", "RETURN"]);
   });

   it("is a no-op for a zero diff", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Rice", quantity: 10 }],
      });
      await applyStockDifference(f.tx, "p1", 0, {
         settings: VALIDATED,
         increaseNote: "more",
         decreaseNote: "less",
      });
      expect(f.movements).toHaveLength(0);
   });
});

describe("purchase stock", () => {
   it("addStockForPurchaseItems increments and writes a PURCHASE movement", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Rice", quantity: 5 }],
      });
      await addStockForPurchaseItems(
         f.tx,
         [{ productId: "p1", quantity: 40 }],
         { purchaseId: "pu1", note: "purchase" },
      );
      expect(f.productQty("p1")).toBe(45);
      expect(f.movements[0]).toMatchObject({ type: "PURCHASE", quantity: 40, purchaseId: "pu1" });
   });

   it("reverseStockForPurchaseItems refuses to push stock below zero (units already sold)", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Rice", quantity: 3 }],
      });
      await expect(
         reverseStockForPurchaseItems(
            f.tx,
            [{ productId: "p1", quantity: 10 }],
            { purchaseId: "pu1", note: "delete purchase" },
         ),
      ).rejects.toBeInstanceOf(StockReversalUnsafeError);
      expect(f.productQty("p1")).toBe(3);
      expect(f.movements).toHaveLength(0);
   });

   it("reverseStockForPurchaseItems writes a negative ADJUSTMENT when safe", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Rice", quantity: 30 }],
      });
      await reverseStockForPurchaseItems(
         f.tx,
         [{ productId: "p1", quantity: 10 }],
         { purchaseId: "pu1", note: "delete purchase" },
      );
      expect(f.productQty("p1")).toBe(20);
      expect(f.movements[0]).toMatchObject({ type: "ADJUSTMENT", quantity: -10 });
   });
});

describe("adjustStock", () => {
   it("requires a reason and a non-zero delta", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Rice", quantity: 10 }],
      });
      await expect(
         adjustStock(f.tx, { productId: "p1", delta: 1, reason: "  ", settings: VALIDATED }),
      ).rejects.toThrow(/reason is required/i);
      await expect(
         adjustStock(f.tx, { productId: "p1", delta: 0, reason: "count", settings: VALIDATED }),
      ).rejects.toThrow(/non-zero/i);
   });

   it("applies a signed delta and returns the new quantities", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Rice", quantity: 10 }],
      });
      const result = await adjustStock(f.tx, {
         productId: "p1",
         delta: -4,
         reason: "Damaged goods",
         settings: VALIDATED,
      });
      expect(result.productQuantity).toBe(6);
      expect(f.movements[0]).toMatchObject({ type: "ADJUSTMENT", quantity: -4, note: "Damaged goods" });
   });

   it("blocks a negative adjustment beyond available stock when validation is on", async () => {
      const f = makeFakeTx({
         products: [{ id: "p1", productName: "Rice", quantity: 2 }],
      });
      await expect(
         adjustStock(f.tx, { productId: "p1", delta: -5, reason: "count", settings: VALIDATED }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
   });
});

describe("findVariantlessVariableLine (QA B1 rule)", () => {
   const makeDb = (products: any[], variants: any[]) => ({
      product: {
         findMany: async ({ where }: any) =>
            products.filter((p) => (where.id.in as string[]).includes(p.id)),
      },
      productVariant: {
         findMany: async ({ where }: any) =>
            variants.filter(
               (v) =>
                  (where.productId.in as string[]).includes(v.productId) &&
                  (where.isDeleted === undefined || v.isDeleted === where.isDeleted),
            ),
      },
   });

   it("flags a variable product line without a variantId", async () => {
      const db = makeDb(
         [{ id: "p1", productName: "Shirt", productType: "Variable" }],
         [{ productId: "p1", isDeleted: false }],
      );
      const found = await findVariantlessVariableLine(db, [
         { productId: "p1", variantId: null },
      ]);
      expect(found).toEqual({ productId: "p1", productName: "Shirt" });
   });

   it("accepts a variable product line that names a variant", async () => {
      const db = makeDb(
         [{ id: "p1", productName: "Shirt", productType: "Variable" }],
         [{ productId: "p1", isDeleted: false }],
      );
      const found = await findVariantlessVariableLine(db, [
         { productId: "p1", variantId: "v1" },
      ]);
      expect(found).toBeNull();
   });

   it("accepts a simple product line without a variantId", async () => {
      const db = makeDb(
         [{ id: "p1", productName: "Rice", productType: "Standard" }],
         [],
      );
      const found = await findVariantlessVariableLine(db, [
         { productId: "p1", variantId: null },
      ]);
      expect(found).toBeNull();
   });

   it("accepts a variable product with no live variants (nothing to pick)", async () => {
      const db = makeDb(
         [{ id: "p1", productName: "Shirt", productType: "Variable" }],
         [{ productId: "p1", isDeleted: true }],
      );
      const found = await findVariantlessVariableLine(db, [
         { productId: "p1", variantId: null },
      ]);
      expect(found).toBeNull();
   });
});

describe("orderHoldsStock", () => {
   it("holds stock for live, non-cancelled orders only", () => {
      expect(orderHoldsStock({ status: "PENDING", isDeleted: false })).toBe(true);
      expect(orderHoldsStock({ status: "DELIVERED", isDeleted: false })).toBe(true);
      expect(orderHoldsStock({ status: "CANCELLED", isDeleted: false })).toBe(false);
      expect(orderHoldsStock({ status: "PENDING", isDeleted: true })).toBe(false);
   });

   // Phase B1 (P1-1): FAILED is terminal — it mirrors CANCELLED in
   // every exactly-once transition the callers derive from this
   // predicate (was/will pairs).
   it("treats FAILED exactly like CANCELLED (terminal)", () => {
      expect(orderHoldsStock({ status: "FAILED", isDeleted: false })).toBe(false);
      expect(orderHoldsStock({ status: "FAILED", isDeleted: true })).toBe(false);
      expect(orderHoldsStock({ status: "CANCELLED", isDeleted: true })).toBe(false);
   });

   it("create-in-FAILED deducts nothing, like create-in-CANCELLED", () => {
      // The create path deducts iff orderHoldsStock(new order).
      for (const status of ["CANCELLED", "FAILED"]) {
         expect(orderHoldsStock({ status, isDeleted: false })).toBe(false);
      }
      expect(orderHoldsStock({ status: "PENDING", isDeleted: false })).toBe(true);
   });

   it("→FAILED restores once and FAILED→other re-deducts, mirroring CANCELLED", () => {
      for (const terminal of ["CANCELLED", "FAILED"]) {
         // Into terminal: was holding, will not → restore exactly once.
         expect(orderHoldsStock({ status: "PENDING", isDeleted: false })).toBe(true);
         expect(orderHoldsStock({ status: terminal, isDeleted: false })).toBe(false);
         // Out of terminal: was not holding, will → re-deduct (validated).
         expect(orderHoldsStock({ status: "CONFIRMED", isDeleted: false })).toBe(true);
         // Terminal → terminal: neither side holds → no movement.
         expect(orderHoldsStock({ status: terminal, isDeleted: false })).toBe(false);
      }
      // FAILED → CANCELLED and CANCELLED → FAILED also move nothing.
      expect(orderHoldsStock({ status: "FAILED", isDeleted: false })).toBe(false);
      expect(orderHoldsStock({ status: "CANCELLED", isDeleted: false })).toBe(false);
   });

   it("delete of a FAILED order restores nothing, like a cancelled one", () => {
      // The delete path restores iff orderHoldsStock(existing).
      expect(orderHoldsStock({ status: "FAILED", isDeleted: false })).toBe(false);
      expect(orderHoldsStock({ status: "CANCELLED", isDeleted: false })).toBe(false);
      expect(orderHoldsStock({ status: "PENDING", isDeleted: false })).toBe(true);
   });

   it("Bin restore of a FAILED order deducts nothing, like a cancelled one", () => {
      // The Bin restore path deducts iff the RESTORED order would
      // hold stock: orderHoldsStock({ status, isDeleted: false }).
      for (const status of ["CANCELLED", "FAILED"]) {
         expect(orderHoldsStock({ status, isDeleted: false })).toBe(false);
      }
      expect(orderHoldsStock({ status: "DELIVERED", isDeleted: false })).toBe(true);
   });
});
