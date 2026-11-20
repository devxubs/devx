import { describe, it, expect } from "vitest";
import { normalizeWarehouseUpdate } from "@src/lib/warehouse";

// P2-1: warehouse PUT payload normalization — partial updates touch
// only present keys; blank name is rejected; blank optional fields
// clear to null.

describe("normalizeWarehouseUpdate", () => {
   it("trims and passes through provided fields", () => {
      const r = normalizeWarehouseUpdate({
         name: "  North Depot ",
         code: " WH-N ",
         address: "  Road 1 ",
         phone: " 017 ",
         isDefault: true,
      });
      expect(r).toEqual({
         ok: true,
         data: {
            name: "North Depot",
            code: "WH-N",
            address: "Road 1",
            phone: "017",
            isDefault: true,
         },
      });
   });

   it("only includes keys present in the body", () => {
      const r = normalizeWarehouseUpdate({ phone: "999" });
      expect(r).toEqual({ ok: true, data: { phone: "999" } });
   });

   it("rejects a present-but-blank name", () => {
      expect(normalizeWarehouseUpdate({ name: "   " })).toEqual({
         ok: false,
         error: "Warehouse name cannot be empty",
      });
      expect(normalizeWarehouseUpdate({ name: 42 })).toEqual({
         ok: false,
         error: "Warehouse name cannot be empty",
      });
   });

   it("clears blank optional fields to null", () => {
      const r = normalizeWarehouseUpdate({ code: " ", address: "", phone: "" });
      expect(r).toEqual({
         ok: true,
         data: { code: null, address: null, phone: null },
      });
   });

   it("coerces isDefault to boolean only when present", () => {
      expect(normalizeWarehouseUpdate({ isDefault: 1 })).toEqual({
         ok: true,
         data: { isDefault: true },
      });
      expect(normalizeWarehouseUpdate({})).toEqual({ ok: true, data: {} });
   });
});
