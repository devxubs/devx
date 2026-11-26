import { describe, it, expect } from "vitest";
import {
   DECREASE_STOCK_ON_KEY,
   DEFAULT_DECREASE_STOCK_ON,
   ORDER_PROGRESSION,
   normalizeDecreaseStockOn,
   validateDecreaseStockOnValue,
   validateDecreaseStockOnInConfig,
   resolveDecreaseStockOn,
   resolveStockOutProductCanOrder,
   resolveOutOfStockCanSubmitCourier,
   resolveVariationSelectOnOrder,
   writeDefaultWarehouseIdSetting,
   orderReachesTrigger,
   decideStockHolding,
} from "@src/lib/productSettings";

// Phase 1B: the Decrease Stock On trigger — resolution, validation
// and the pure holding decision every order write path shares.
// Lifecycle expectations (deduct exactly once at the trigger,
// restore exactly once on terminal/backward exit) are expressed
// through decideStockHolding's before/after states: a caller runs
// a deduction iff (!was && will), a restoration iff (was && !will).

describe("normalizeDecreaseStockOn", () => {
   it("accepts every progression status", () => {
      for (const s of ORDER_PROGRESSION) {
         expect(normalizeDecreaseStockOn(s)).toBe(s);
      }
   });

   it("is case- and separator-tolerant", () => {
      expect(normalizeDecreaseStockOn("confirmed")).toBe("CONFIRMED");
      expect(normalizeDecreaseStockOn("Out for Delivery")).toBe("OUT_FOR_DELIVERY");
      expect(normalizeDecreaseStockOn("out-for-delivery")).toBe("OUT_FOR_DELIVERY");
   });

   it("rejects HOLD, terminal statuses and unknown values", () => {
      expect(normalizeDecreaseStockOn("HOLD")).toBeNull();
      expect(normalizeDecreaseStockOn("CANCELLED")).toBeNull();
      expect(normalizeDecreaseStockOn("FAILED")).toBeNull();
      expect(normalizeDecreaseStockOn("WHENEVER")).toBeNull();
      expect(normalizeDecreaseStockOn("")).toBeNull();
      expect(normalizeDecreaseStockOn(null)).toBeNull();
      expect(normalizeDecreaseStockOn(42)).toBeNull();
   });
});

describe("validateDecreaseStockOnValue / InConfig", () => {
   it("treats unset as valid (resolves to the default later)", () => {
      expect(validateDecreaseStockOnValue(undefined)).toEqual({ ok: true, value: null });
      expect(validateDecreaseStockOnValue(null)).toEqual({ ok: true, value: null });
      expect(validateDecreaseStockOnValue("")).toEqual({ ok: true, value: null });
      expect(validateDecreaseStockOnInConfig({})).toEqual({ ok: true, value: null });
      expect(validateDecreaseStockOnInConfig(null)).toEqual({ ok: true, value: null });
   });

   it("accepts a supported status inside a config payload", () => {
      expect(
         validateDecreaseStockOnInConfig({ [DECREASE_STOCK_ON_KEY]: "PROCESSING" }),
      ).toEqual({ ok: true, value: "PROCESSING" });
   });

   it("rejects an unsupported status inside a config payload", () => {
      const verdict = validateDecreaseStockOnInConfig({
         [DECREASE_STOCK_ON_KEY]: "HOLD",
      });
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) expect(verdict.message).toContain(DECREASE_STOCK_ON_KEY);
   });
});

describe("resolveDecreaseStockOn", () => {
   it("defaults to CONFIRMED when the key is missing", () => {
      expect(DEFAULT_DECREASE_STOCK_ON).toBe("CONFIRMED");
      expect(resolveDecreaseStockOn(null)).toBe("CONFIRMED");
      expect(resolveDecreaseStockOn({})).toBe("CONFIRMED");
      expect(resolveDecreaseStockOn("junk")).toBe("CONFIRMED");
   });

   it("falls back to CONFIRMED on an invalid stored value", () => {
      expect(
         resolveDecreaseStockOn({ [DECREASE_STOCK_ON_KEY]: "CANCELLED" }),
      ).toBe("CONFIRMED");
   });

   it("returns the stored trigger when valid", () => {
      expect(resolveDecreaseStockOn({ [DECREASE_STOCK_ON_KEY]: "SHIPPED" })).toBe("SHIPPED");
      expect(resolveDecreaseStockOn({ [DECREASE_STOCK_ON_KEY]: "pending" })).toBe("PENDING");
   });
});

describe("orderReachesTrigger (creation)", () => {
   it("PENDING does not deduct when the trigger is CONFIRMED", () => {
      expect(orderReachesTrigger("PENDING", "CONFIRMED")).toBe(false);
   });

   it("PENDING deducts when the trigger is PENDING", () => {
      expect(orderReachesTrigger("PENDING", "PENDING")).toBe(true);
   });

   it("an order created at or past the trigger deducts for every trigger", () => {
      for (const trigger of ORDER_PROGRESSION) {
         const idx = ORDER_PROGRESSION.indexOf(trigger);
         for (const status of ORDER_PROGRESSION) {
            expect(orderReachesTrigger(status, trigger)).toBe(
               ORDER_PROGRESSION.indexOf(status) >= idx,
            );
         }
      }
   });

   it("terminal statuses and HOLD never hold at creation", () => {
      for (const trigger of ORDER_PROGRESSION) {
         expect(orderReachesTrigger("CANCELLED", trigger)).toBe(false);
         expect(orderReachesTrigger("FAILED", trigger)).toBe(false);
         expect(orderReachesTrigger("HOLD", trigger)).toBe(false);
      }
   });
});

describe("decideStockHolding (lifecycle)", () => {
   const decide = (wasDeducted: boolean, fromStatus: string, toStatus: string, trigger: any = "CONFIRMED") =>
      decideStockHolding({ wasDeducted, fromStatus, toStatus, trigger });

   it("transition into the trigger deducts (was=false → will=true)", () => {
      expect(decide(false, "PENDING", "CONFIRMED")).toBe(true);
      expect(decide(false, "PENDING", "PROCESSING", "PROCESSING")).toBe(true);
      expect(decide(false, "CONFIRMED", "DELIVERED", "DELIVERED")).toBe(true);
   });

   it("progression after deduction does not deduct again (stays true)", () => {
      expect(decide(true, "CONFIRMED", "PROCESSING")).toBe(true);
      expect(decide(true, "PROCESSING", "SHIPPED")).toBe(true);
      expect(decide(true, "DELIVERED", "COMPLETED")).toBe(true);
   });

   it("moving backward before the trigger restores (was=true → will=false)", () => {
      expect(decide(true, "CONFIRMED", "PENDING")).toBe(false);
      expect(decide(true, "PROCESSING", "CONFIRMED", "SHIPPED")).toBe(false);
   });

   it("moving backward while never deducted changes nothing", () => {
      expect(decide(false, "CONFIRMED", "PENDING", "SHIPPED")).toBe(false);
   });

   it("CANCELLED and FAILED restore exactly once", () => {
      expect(decide(true, "CONFIRMED", "CANCELLED")).toBe(false);
      expect(decide(true, "PENDING", "FAILED", "PENDING")).toBe(false);
      // A second cancel decision on the restored order is a no-op.
      expect(decide(false, "CANCELLED", "CANCELLED")).toBe(false);
   });

   it("an edit without a status change never changes holding (flag governs)", () => {
      // Edit before deduction: no stock change.
      expect(decide(false, "PENDING", "PENDING")).toBe(false);
      // Edit after deduction: still holding, netting applies.
      expect(decide(true, "CONFIRMED", "CONFIRMED")).toBe(true);
      // Even when the stored trigger moved past the order's status
      // after it deducted (trigger changed PENDING → CONFIRMED), a
      // status-unchanging edit must NOT retroactively restore.
      expect(decide(true, "PENDING", "PENDING", "CONFIRMED")).toBe(true);
   });

   it("HOLD keeps the recorded state in both directions", () => {
      // Entering HOLD.
      expect(decide(true, "CONFIRMED", "HOLD")).toBe(true);
      expect(decide(false, "PENDING", "HOLD")).toBe(false);
      // Leaving HOLD is decided by the target status.
      expect(decide(true, "HOLD", "PENDING")).toBe(false);
      expect(decide(true, "HOLD", "PROCESSING")).toBe(true);
      expect(decide(false, "HOLD", "CONFIRMED")).toBe(true);
      expect(decide(false, "HOLD", "PENDING")).toBe(false);
   });

   it("an unrecognised target never moves stock", () => {
      expect(decide(true, "CONFIRMED", "SOMETHING_ELSE")).toBe(true);
      expect(decide(false, "PENDING", "SOMETHING_ELSE")).toBe(false);
   });

   it("with trigger PENDING the decisions match the pre-1B rule", () => {
      // Pre-1B: entering any live status held stock; terminal
      // never did. (A same-status write is not an entry — the
      // flag governs it, asserted separately below.)
      for (const status of ORDER_PROGRESSION) {
         if (status === "PENDING") continue;
         expect(decide(false, "PENDING", status, "PENDING")).toBe(true);
      }
      expect(decide(true, "CONFIRMED", "CANCELLED", "PENDING")).toBe(false);
      expect(decide(false, "PENDING", "PENDING", "PENDING")).toBe(false);
      expect(decide(true, "PENDING", "PENDING", "PENDING")).toBe(true);
   });
});

describe("Phase 1C/1D/1E/1F boolean setting resolvers", () => {
   it("resolve the audited defaults when keys are missing or corrupt", () => {
      for (const cfg of [null, undefined, {}, { stockOutProductCanOrder: "yes" }]) {
         expect(resolveStockOutProductCanOrder(cfg)).toBe(false);
         expect(resolveOutOfStockCanSubmitCourier(cfg)).toBe(true);
         expect(resolveVariationSelectOnOrder(cfg)).toBe(true);
      }
   });

   it("honour explicit booleans", () => {
      expect(resolveStockOutProductCanOrder({ stockOutProductCanOrder: true })).toBe(true);
      expect(resolveStockOutProductCanOrder({ stockOutProductCanOrder: false })).toBe(false);
      expect(resolveOutOfStockCanSubmitCourier({ outOfStockCanSubmitCourier: false })).toBe(false);
      expect(resolveVariationSelectOnOrder({ variationSelectOnOrder: false })).toBe(false);
   });
});

describe("writeDefaultWarehouseIdSetting (Phase 1C mirror)", () => {
   const makeDb = (initialConfig: unknown) => {
      const state: { customConfig: unknown } = { customConfig: initialConfig };
      const db = {
         storeSetting: {
            findUnique: async () => ({ customConfig: state.customConfig }),
            upsert: async ({ update, create }: any) => {
               state.customConfig = update?.customConfig ?? create?.customConfig;
               return { id: "default", customConfig: state.customConfig };
            },
         },
      };
      return { db, state };
   };

   it("sets the key and preserves every other key", async () => {
      const { db, state } = makeDb({ decreaseStockOn: "SHIPPED", other: 1 });
      await writeDefaultWarehouseIdSetting(db, "wh-9");
      expect(state.customConfig).toEqual({
         decreaseStockOn: "SHIPPED",
         other: 1,
         defaultWarehouseId: "wh-9",
      });
   });

   it("removes the key on null without touching the rest", async () => {
      const { db, state } = makeDb({ defaultWarehouseId: "wh-9", other: 1 });
      await writeDefaultWarehouseIdSetting(db, null);
      expect(state.customConfig).toEqual({ other: 1 });
   });

   it("works when no settings row exists yet", async () => {
      const { db, state } = makeDb(null);
      await writeDefaultWarehouseIdSetting(db, "wh-1");
      expect(state.customConfig).toEqual({ defaultWarehouseId: "wh-1" });
   });
});
