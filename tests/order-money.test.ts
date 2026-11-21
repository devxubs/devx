import { describe, it, expect } from "vitest";
import { calculateOrderTotals as serverTotals } from "@src/lib/utils";
import { calculateOrderTotals as uiTotals } from "@src/Pages/admin/Order/create/orderCalculations";
import {
   parseOrderTags,
   rehydratedDiscountValue,
   displayOrderDiscount,
   displayOrderTax,
   resolvePutMoneyField,
} from "@src/lib/orderMoney";
import { mapOrderToInvoiceData } from "@src/Pages/admin/Order/Details/helpers/invoiceHelpers";

// QA fixes O1 + O2: order money calculations.
//  • Create: the UI engine folds tax into the submitted discount
//    (submittedDiscount = overallDiscount − taxAmount) because the
//    Order model has no tax column; the server recomputes
//    total = subtotal + delivery − discount. The two must agree.
//  • Edit (Publish): the form must be hydrated with the OVERALL
//    discount from orderTags, not the stored submitted discount.
//  • PUT: money fields may arrive top-level or nested under
//    body.pricing (the Publish payload shape) — both must resolve.
//  • Display: discount/tax shown together must be the true
//    orderTags breakdown so the rows reconcile with the total.

const line = (listPrice: number, quantity: number) =>
   ({
      key: "p1",
      productId: "p1",
      variantId: null,
      variantName: null,
      variants: [],
      name: "Widget",
      code: "W-1",
      productBarcode: null,
      barcode: null,
      stock: 99,
      unit: "Piece",
      listPrice,
      quantity,
      discountType: "amount",
      discountValue: 0,
   }) as any;

// A taxed order: net 1000, overall discount 100, tax 10% on the
// remaining 900 = 90, delivery 60, advance 200.
const taxedCharges = {
   discountType: "amount" as const,
   discountValue: 100,
   taxEnabled: true,
   taxRate: 10,
   deliveryCharge: 60,
   advancePayment: 200,
};

describe("tax-fold parity between the create engine and the server", () => {
   const ui = uiTotals([line(500, 2)], taxedCharges);

   it("computes the overall discount exactly once and folds tax into the submitted discount", () => {
      expect(ui.netProductAmount).toBe(1000);
      expect(ui.overallDiscount).toBe(100);
      expect(ui.taxAmount).toBe(90);
      expect(ui.grandTotal).toBe(1050);
      // Folded exactly once: overall − tax, NOT overall and NOT
      // overall − 2×tax.
      expect(ui.submittedDiscount).toBe(10);
      expect(ui.submittedDiscount).toBe(ui.overallDiscount - ui.taxAmount);
   });

   it("server total from the submitted discount equals the UI grand total", () => {
      const server = serverTotals(
         [{ price: 500, quantity: 2 }],
         ui.deliveryCharge,
         ui.submittedDiscount,
         ui.advancePayment,
      );
      expect(server.subtotal).toBe(1000);
      expect(server.total).toBe(ui.grandTotal);
      expect(server.dueAmount).toBe(ui.dueAmount);
   });

   it("ADDS the delivery charge instead of subtracting it", () => {
      const withDelivery = serverTotals([{ price: 500, quantity: 2 }], 60, 10, 0);
      const withoutDelivery = serverTotals([{ price: 500, quantity: 2 }], 0, 10, 0);
      expect(withDelivery.total - withoutDelivery.total).toBe(60);
      expect(withDelivery.total).toBe(1050);
   });

   it("due is total − advance, floored at zero", () => {
      const t = serverTotals([{ price: 500, quantity: 2 }], 60, 10, 200);
      expect(t.dueAmount).toBe(t.total - 200);
      expect(t.dueAmount).toBe(850);
      const overpaid = serverTotals([{ price: 100, quantity: 1 }], 0, 0, 999);
      expect(overpaid.dueAmount).toBe(0);
   });

   it("an untaxed order submits its overall discount unchanged", () => {
      const uiPlain = uiTotals([line(500, 2)], {
         ...taxedCharges,
         taxEnabled: false,
         taxRate: 0,
      });
      expect(uiPlain.taxAmount).toBe(0);
      expect(uiPlain.submittedDiscount).toBe(uiPlain.overallDiscount);
      const server = serverTotals(
         [{ price: 500, quantity: 2 }],
         uiPlain.deliveryCharge,
         uiPlain.submittedDiscount,
         uiPlain.advancePayment,
      );
      expect(server.total).toBe(uiPlain.grandTotal);
   });
});

describe("edit rehydration round-trip (Publish hydration)", () => {
   // What create persisted for the taxed order above: stored
   // discount column = submittedDiscount (10); breakdown in tags.
   const storedOrder = {
      discount: 10,
      orderTags: { taxRate: 10, taxAmount: 90, overallDiscount: 100 },
   };

   it("recovers the overall discount from orderTags", () => {
      expect(rehydratedDiscountValue(storedOrder)).toBe(100);
   });

   it("falls back to stored discount + taxAmount when overallDiscount is missing", () => {
      expect(
         rehydratedDiscountValue({
            discount: 10,
            orderTags: { taxAmount: 90 },
         }),
      ).toBe(100);
   });

   it("parses a JSON-string orderTags the same way", () => {
      expect(
         rehydratedDiscountValue({
            discount: 10,
            orderTags: JSON.stringify({ taxAmount: 90, overallDiscount: 100 }),
         }),
      ).toBe(100);
      expect(parseOrderTags("{not json")).toEqual({});
      expect(parseOrderTags(null)).toEqual({});
   });

   it("leaves untaxed / pre-breakdown orders at their stored discount", () => {
      expect(rehydratedDiscountValue({ discount: 75, orderTags: {} })).toBe(75);
      expect(rehydratedDiscountValue({ discount: 75 })).toBe(75);
   });

   it("a no-op re-save through both engines reproduces the original total", () => {
      // Hydrate → UI engine recomputes the same submitted discount →
      // server total is unchanged.
      const rehydrated = rehydratedDiscountValue(storedOrder);
      const ui = uiTotals([line(500, 2)], {
         ...taxedCharges,
         discountValue: rehydrated,
      });
      expect(ui.submittedDiscount).toBe(storedOrder.discount);
      const server = serverTotals(
         [{ price: 500, quantity: 2 }],
         ui.deliveryCharge,
         ui.submittedDiscount,
         ui.advancePayment,
      );
      expect(server.total).toBe(1050);
   });
});

describe("PUT money-field resolution (top-level or pricing-nested)", () => {
   it("prefers the top-level field when both are present", () => {
      const body = { deliveryCharge: 70, pricing: { deliveryCharge: 80 } };
      expect(resolvePutMoneyField(body, "deliveryCharge")).toBe(70);
   });

   it("falls back to body.pricing when the top level is absent (Publish payload)", () => {
      const body = {
         pricing: { deliveryCharge: 80, discount: 10, advancePayment: 200 },
      };
      expect(resolvePutMoneyField(body, "deliveryCharge")).toBe(80);
      expect(resolvePutMoneyField(body, "discount")).toBe(10);
      expect(resolvePutMoneyField(body, "advancePayment")).toBe(200);
   });

   it("returns undefined when neither level carries the field (keep stored value)", () => {
      expect(resolvePutMoneyField({}, "discount")).toBeUndefined();
      expect(resolvePutMoneyField({ pricing: {} }, "discount")).toBeUndefined();
      expect(resolvePutMoneyField(null, "discount")).toBeUndefined();
   });

   it("a pricing-nested delivery change moves the recomputed total by exactly the delta", () => {
      const body = { pricing: { deliveryCharge: 110 } };
      const resolved = resolvePutMoneyField(body, "deliveryCharge");
      const before = serverTotals([{ price: 500, quantity: 2 }], 60, 10, 0);
      const after = serverTotals(
         [{ price: 500, quantity: 2 }],
         Number(resolved),
         10,
         0,
      );
      expect(after.total - before.total).toBe(50);
   });
});

describe("display breakdown (Details + invoice)", () => {
   const storedOrder = {
      subtotal: 1000,
      deliveryCharge: 60,
      discount: 10, // submitted (folded)
      total: 1050,
      orderTags: { taxRate: 10, taxAmount: 90, overallDiscount: 100 },
   };

   it("shows the overall discount and the tax amount from orderTags", () => {
      expect(displayOrderDiscount(storedOrder)).toBe(100);
      expect(displayOrderTax(storedOrder)).toBe(90);
   });

   it("rows reconcile: Subtotal − Overall Discount + Tax + Delivery = Total", () => {
      const reconciled =
         storedOrder.subtotal -
         displayOrderDiscount(storedOrder) +
         displayOrderTax(storedOrder) +
         storedOrder.deliveryCharge;
      expect(reconciled).toBe(storedOrder.total);
   });

   it("invoice data carries the true breakdown and reconciles the same way", () => {
      const invoice = mapOrderToInvoiceData({
         ...storedOrder,
         id: "o1",
         items: [{ name: "Widget", quantity: 2, price: 500, subtotal: 1000 }],
      });
      expect(invoice.discount).toBe(100);
      expect(invoice.tax).toBe(90);
      expect(
         invoice.subtotal -
            Number(invoice.discount) +
            Number(invoice.tax) +
            Number(invoice.deliveryCharge),
      ).toBe(invoice.total);
      // Templates without a tax row fold it back:
      // Subtotal − (Overall − Tax) + Delivery = Total.
      expect(
         invoice.subtotal -
            (Number(invoice.discount) - Number(invoice.tax)) +
            Number(invoice.deliveryCharge),
      ).toBe(invoice.total);
   });

   it("orders without a persisted breakdown keep their stored discount and zero tax", () => {
      expect(displayOrderDiscount({ discount: 75, orderTags: {} })).toBe(75);
      expect(displayOrderTax({ orderTags: {} })).toBe(0);
   });
});
