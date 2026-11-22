import { describe, it, expect } from "vitest";
import { classifyCancellation } from "@src/lib/ranking/cancellation";

// Plan §4.5 classifier: precedence is duplicate flag → structured
// token → fallback/empty → customer vocabulary → duplicate text →
// system/courier → attributable. Unclassified is the safe default
// and is NEVER attributable.

describe("classifyCancellation — duplicate flag (highest precedence)", () => {
   it("O8 flag wins over a customer reason", () => {
      expect(
         classifyCancellation("Customer Refused", { isDuplicate: true }),
      ).toBe("duplicate");
   });

   it("O8 flag wins over a structured token", () => {
      expect(
         classifyCancellation("STAFF_ERROR: wrong item packed", {
            isDuplicate: true,
         }),
      ).toBe("duplicate");
   });

   it("O8 flag wins over an empty reason", () => {
      expect(classifyCancellation(null, { isDuplicate: true })).toBe("duplicate");
   });
});

describe("classifyCancellation — structured tokens (D2)", () => {
   it("STAFF_ERROR: → attributable", () => {
      expect(classifyCancellation("STAFF_ERROR: packed wrong product")).toBe(
         "attributable",
      );
   });

   it("CUSTOMER: → customer", () => {
      expect(classifyCancellation("CUSTOMER: refused delivery")).toBe("customer");
   });

   it("DUPLICATE: → duplicate", () => {
      expect(classifyCancellation("DUPLICATE: same order placed twice")).toBe(
         "duplicate",
      );
   });

   it("SYSTEM: → system", () => {
      expect(classifyCancellation("SYSTEM: auto-cancelled after timeout")).toBe(
         "system",
      );
   });

   it("tokens are case-insensitive and tolerate leading whitespace", () => {
      expect(classifyCancellation("  staff_error: typo in address")).toBe(
         "attributable",
      );
      expect(classifyCancellation("Customer: changed mind")).toBe("customer");
   });

   it("token wins over later vocabulary (token is checked first)", () => {
      expect(classifyCancellation("STAFF_ERROR: customer refused")).toBe(
         "attributable",
      );
      expect(classifyCancellation("CUSTOMER: staff packed wrong item")).toBe(
         "customer",
      );
   });

   it("a token NOT at the string start is not honoured", () => {
      // Falls through to the generic rules: no customer/system/
      // duplicate pattern matches, explicit reason → attributable.
      expect(classifyCancellation("Reason noted — CUSTOMER: refused")).toBe(
         "attributable",
      );
   });
});

describe("classifyCancellation — no evidence → unclassified", () => {
   it("null / undefined / empty / whitespace", () => {
      expect(classifyCancellation(null)).toBe("unclassified");
      expect(classifyCancellation(undefined)).toBe("unclassified");
      expect(classifyCancellation("")).toBe("unclassified");
      expect(classifyCancellation("   ")).toBe("unclassified");
   });

   it("the literal PUT fallback string is unclassified, not attributable", () => {
      expect(classifyCancellation("Cancelled by user or staff")).toBe(
         "unclassified",
      );
   });

   it("contentless reasons match nothing", () => {
      expect(classifyCancellation("-")).toBe("unclassified");
   });
});

describe("classifyCancellation — customer vocabulary", () => {
   it.each([
      "Customer Refused",
      "customer refused at the door",
      "Customer refusal — COD not accepted",
      "Customer requested cancellation",
      "Customer Cancelled the order",
      "customer canceled after placing",
      "Changed mind",
      "Customer changed mind about size",
      "Price Disagreement",
      "price disagreement with customer",
   ])("%s → customer", (reason) => {
      expect(classifyCancellation(reason)).toBe("customer");
   });

   it("customer vocabulary beats a later duplicate mention", () => {
      expect(classifyCancellation("Customer refused the duplicate delivery")).toBe(
         "customer",
      );
   });
});

describe("classifyCancellation — duplicate in free text", () => {
   it("duplicate mentioned → duplicate", () => {
      expect(classifyCancellation("Duplicate order — same as ORD_12")).toBe(
         "duplicate",
      );
      expect(classifyCancellation("duplicate entry by mistake")).toBe("duplicate");
   });

   it("duplicate PAYMENT is a system artefact, not a duplicate order", () => {
      expect(classifyCancellation("Duplicate payment — refunded")).toBe("system");
   });
});

describe("classifyCancellation — system / courier patterns", () => {
   it.each([
      "Courier lost the parcel",
      "Delivery failed after 3 attempts",
      "Out of stock at warehouse",
      "System error during checkout",
      "Payment gateway timeout",
   ])("%s → system", (reason) => {
      expect(classifyCancellation(reason)).toBe("system");
   });
});

describe("classifyCancellation — attributable (explicit staff-side reasons)", () => {
   it.each(["Wrong Product", "Damaged", "Delayed Delivery", "Wrong item sent by mistake"])(
      "%s → attributable",
      (reason) => {
         expect(classifyCancellation(reason)).toBe("attributable");
      },
   );
});
