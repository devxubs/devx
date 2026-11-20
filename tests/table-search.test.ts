import { describe, it, expect } from "vitest";
import {
   filterRowsBySearch,
   rowMatchesSearch,
} from "@src/lib/tableSearch";

// Phase B4b (P1-5): hermetic tests for the shared client-side
// toolbar-search predicate used by the pages whose dead search was
// wired client-side (Bin, Roles, Suppliers, Billing, Reports detail
// tables). The UI wiring itself is code-verified + runtime-pending.

const rows = [
   { id: "1", customId: "SUP_1", name: "Rahim Traders", number: "01711111111", email: "rahim@example.com", address: "Dhaka" },
   { id: "2", customId: "SUP_2", name: "Karim Store", number: "01822222222", email: null, address: "Chattogram" },
   { id: "3", customId: null, name: "Dhaka Agro", number: "01933333333", email: "agro@example.com", address: null },
];
const fields = ["name", "customId", "number", "email", "address"];

describe("filterRowsBySearch", () => {
   it("returns every row for an empty or blank term", () => {
      expect(filterRowsBySearch(rows, "", fields)).toBe(rows);
      expect(filterRowsBySearch(rows, "   ", fields)).toBe(rows);
   });

   it("matches case-insensitively on any listed field", () => {
      expect(filterRowsBySearch(rows, "rahim", fields).map((r) => r.id)).toEqual(["1"]);
      expect(filterRowsBySearch(rows, "SUP_2", fields).map((r) => r.id)).toEqual(["2"]);
      expect(filterRowsBySearch(rows, "0182222", fields).map((r) => r.id)).toEqual(["2"]);
      expect(filterRowsBySearch(rows, "DHAKA", fields).map((r) => r.id)).toEqual(["1", "3"]);
   });

   it("trims the term before matching", () => {
      expect(filterRowsBySearch(rows, "  karim  ", fields).map((r) => r.id)).toEqual(["2"]);
   });

   it("never matches null/undefined values against a real term", () => {
      expect(filterRowsBySearch(rows, "null", fields)).toEqual([]);
      expect(filterRowsBySearch(rows, "undefined", fields)).toEqual([]);
   });

   it("returns no rows when nothing matches", () => {
      expect(filterRowsBySearch(rows, "zzz", fields)).toEqual([]);
   });

   it("supports accessor fields for nested / derived values", () => {
      const orders = [
         { id: "ORD_1", customer: { name: "Ayesha Khan", phone: "01700000000" } },
         { id: "ORD_2", customer: null },
         { id: "ORD_3", customer: { name: "Walk-in Customer", phone: "" } },
      ];
      const orderFields = [
         "id",
         (r: any) => r.customer?.name,
         (r: any) => r.customer?.phone,
      ];
      expect(
         filterRowsBySearch(orders, "ayesha", orderFields).map((r) => r.id),
      ).toEqual(["ORD_1"]);
      expect(
         filterRowsBySearch(orders, "ord_", orderFields).map((r) => r.id),
      ).toEqual(["ORD_1", "ORD_2", "ORD_3"]);
   });

   it("stringifies numeric values so amounts/counts are searchable", () => {
      const expenses = [
         { id: "EXP_1", type: "Rent", amount: 1500 },
         { id: "EXP_2", type: "Utilities", amount: 250 },
      ];
      expect(
         filterRowsBySearch(expenses, "1500", ["type", "amount"]).map((r) => r.id),
      ).toEqual(["EXP_1"]);
   });
});

describe("rowMatchesSearch", () => {
   it("is true for a blank term regardless of fields", () => {
      expect(rowMatchesSearch(rows[0], "", fields)).toBe(true);
      expect(rowMatchesSearch(rows[0], "  ", [])).toBe(true);
   });

   it("is false when no field contains the term", () => {
      expect(rowMatchesSearch(rows[0], "karim", fields)).toBe(false);
   });
});
