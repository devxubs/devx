import { describe, it, expect } from "vitest";
import {
   DEFAULT_PAYMENT_METHODS,
   activePaymentMethodNames,
   paymentMethodOptionsFor,
   paymentMethodRequiresTxId,
   paymentMethodSelectionError,
   resolveDefaultPaymentMethod,
   resolvePaymentMethods,
   validatePaymentMethodsInConfig,
} from "@src/lib/paymentMethods";

// Phase 5: the central payment-method resolvers. History safety
// is structural (records store the method name as a string), so
// these tests pin the SELECTION rules: what new transactions may
// use, what the default resolves to, and what stays selectable
// in edit contexts.

const cfg = (paymentMethods: any) => ({ paymentMethods });

describe("resolvePaymentMethods", () => {
   it("defaults to the built-in list when unconfigured", () => {
      expect(resolvePaymentMethods(null)).toEqual(DEFAULT_PAYMENT_METHODS);
      expect(resolvePaymentMethods({})).toEqual(DEFAULT_PAYMENT_METHODS);
      expect(resolvePaymentMethods(cfg([]))).toEqual(DEFAULT_PAYMENT_METHODS);
   });

   it("normalises a saved list: trims, dedupes case-insensitively, active defaults true", () => {
      const list = resolvePaymentMethods(
         cfg([
            { name: " bKash ", active: true },
            { name: "BKASH", active: false },
            { name: "", active: true },
            { name: "Cash", active: false },
            "junk",
         ]),
      );
      expect(list).toEqual([
         { name: "bKash", description: undefined, active: true },
         { name: "Cash", description: undefined, active: false },
      ]);
   });
});

describe("active names + selector options", () => {
   const config = cfg([
      { name: "Cash", active: true },
      { name: "bKash", active: false },
      { name: "Nagad", active: true },
   ]);

   it("active names exclude deactivated methods, in configured order", () => {
      expect(activePaymentMethodNames(config)).toEqual(["Cash", "Nagad"]);
   });

   it("edit options merge the recorded method back even when deactivated", () => {
      expect(paymentMethodOptionsFor(config, "bKash")).toEqual([
         "Cash",
         "Nagad",
         "bKash",
      ]);
      expect(paymentMethodOptionsFor(config, "Cash")).toEqual(["Cash", "Nagad"]);
      expect(paymentMethodOptionsFor(config, null)).toEqual(["Cash", "Nagad"]);
   });
});

describe("resolveDefaultPaymentMethod", () => {
   it("uses the configured default when it is active", () => {
      expect(resolveDefaultPaymentMethod(null, "Cash")).toBe("Cash");
      expect(
         resolveDefaultPaymentMethod(
            cfg([{ name: "Nagad", active: true }]),
            "Nagad",
         ),
      ).toBe("Nagad");
   });

   it("falls back when the configured default is deactivated or unknown", () => {
      const config = cfg([
         { name: "bKash", active: false },
         { name: "Nagad", active: true },
      ]);
      // bKash configured but inactive, no Cash in the list → first active.
      expect(resolveDefaultPaymentMethod(config, "bKash")).toBe("Nagad");
      // Unknown default → Cash when active.
      expect(resolveDefaultPaymentMethod(null, "Nope")).toBe("Cash");
      // The old broken PosTab values can no longer strand the form.
      expect(resolveDefaultPaymentMethod(null, "bKash / Mobile Banking")).toBe(
         "Cash",
      );
   });
});

describe("paymentMethodSelectionError (server rule)", () => {
   const config = cfg([
      { name: "Cash", active: true },
      { name: "bKash", active: false },
   ]);

   it("rejects a known-but-inactive method for a NEW selection", () => {
      expect(
         paymentMethodSelectionError(config, "bKash", { isNewSelection: true }),
      ).toMatch(/inactive/);
      expect(
         paymentMethodSelectionError(config, "bkash", { isNewSelection: true }),
      ).toMatch(/inactive/);
   });

   it("allows active methods, empty values, and unknown legacy strings", () => {
      expect(
         paymentMethodSelectionError(config, "Cash", { isNewSelection: true }),
      ).toBeNull();
      expect(
         paymentMethodSelectionError(config, "", { isNewSelection: true }),
      ).toBeNull();
      expect(
         paymentMethodSelectionError(config, "Legacy Method", {
            isNewSelection: true,
         }),
      ).toBeNull();
   });

   it("never rejects keeping an existing method on edit", () => {
      expect(
         paymentMethodSelectionError(config, "bKash", { isNewSelection: false }),
      ).toBeNull();
   });
});

describe("validatePaymentMethodsInConfig", () => {
   it("accepts unset and well-formed lists", () => {
      expect(validatePaymentMethodsInConfig({}).ok).toBe(true);
      expect(
         validatePaymentMethodsInConfig(
            cfg([{ name: "Cash" }, { name: "bKash", active: false, description: "Mobile" }]),
         ).ok,
      ).toBe(true);
   });

   it("rejects duplicates, empty names, and malformed entries", () => {
      expect(
         validatePaymentMethodsInConfig(cfg([{ name: "Cash" }, { name: "cash" }])).ok,
      ).toBe(false);
      expect(validatePaymentMethodsInConfig(cfg([{ name: "  " }])).ok).toBe(false);
      expect(validatePaymentMethodsInConfig(cfg("nope")).ok).toBe(false);
      expect(
         validatePaymentMethodsInConfig(cfg([{ name: "Cash", active: "yes" }])).ok,
      ).toBe(false);
   });
});

describe("paymentMethodRequiresTxId (RP-7 X1)", () => {
   it("legacy fallback: the three wallet names require TxID when no flag is set", () => {
      const legacy = cfg([
         { name: "bKash", active: true },
         { name: "Nagad", active: true },
         { name: "Rocket", active: true },
         { name: "Cash", active: true },
      ]);
      expect(paymentMethodRequiresTxId(legacy, "bKash")).toBe(true);
      expect(paymentMethodRequiresTxId(legacy, "NAGAD")).toBe(true);
      expect(paymentMethodRequiresTxId(legacy, "rocket")).toBe(true);
      expect(paymentMethodRequiresTxId(legacy, "Cash")).toBe(false);
   });

   it("unconfigured (defaults) keeps wallet behaviour", () => {
      expect(paymentMethodRequiresTxId(null, "bKash")).toBe(true);
      expect(paymentMethodRequiresTxId({}, "Card")).toBe(false);
      expect(paymentMethodRequiresTxId(null, "")).toBe(false);
      expect(paymentMethodRequiresTxId(null, null)).toBe(false);
   });

   it("an explicit flag wins over the name rule, both ways", () => {
      const configured = cfg([
         { name: "bKash", active: true, requiresTransactionId: false },
         { name: "SSLCommerz", active: true, requiresTransactionId: true },
      ]);
      expect(paymentMethodRequiresTxId(configured, "bKash")).toBe(false);
      expect(paymentMethodRequiresTxId(configured, "SSLCommerz")).toBe(true);
   });

   it("a renamed wallet keeps TxID via its flag; unknown names use the name rule", () => {
      const renamed = cfg([
         { name: "bKash Personal", active: true, requiresTransactionId: true },
      ]);
      expect(paymentMethodRequiresTxId(renamed, "bKash Personal")).toBe(true);
      // Not in the list at all: the legacy name rule still applies.
      expect(paymentMethodRequiresTxId(renamed, "Nagad")).toBe(true);
      expect(paymentMethodRequiresTxId(renamed, "Cash")).toBe(false);
   });

   it("the resolver carries the flag through and drops non-boolean values", () => {
      const list = resolvePaymentMethods(
         cfg([
            { name: "A", active: true, requiresTransactionId: true },
            { name: "B", active: true, requiresTransactionId: "yes" },
            { name: "C", active: true },
         ]),
      );
      expect(list[0].requiresTransactionId).toBe(true);
      expect(list[1].requiresTransactionId).toBeUndefined();
      expect(list[2].requiresTransactionId).toBeUndefined();
   });

   it("the settings validator accepts a boolean flag and rejects other types", () => {
      expect(
         validatePaymentMethodsInConfig(
            cfg([{ name: "A", active: true, requiresTransactionId: true }]),
         ).ok,
      ).toBe(true);
      expect(
         validatePaymentMethodsInConfig(
            cfg([{ name: "A", active: true, requiresTransactionId: "yes" }]),
         ).ok,
      ).toBe(false);
   });
});
