import { describe, it, expect, vi } from "vitest";
import { calculateNetProfit } from "@src/lib/finance";
import {
   isMobilePaymentMethod,
   findOrderWithTxId,
   duplicateTxIdMessage,
   DuplicateTxIdError,
} from "@src/lib/payments";
import { parsePagination } from "@src/lib/pagination";
import { formatCompactNumber, calculateOrderTotals } from "@src/lib/utils";
import { code128BValues, code128BWidths, code128BModuleCount } from "@src/lib/barcode";

describe("calculateNetProfit (the one shared profit definition)", () => {
   it("is revenue − expenses − purchases", () => {
      expect(calculateNetProfit(1000, 200, 300)).toBe(500);
   });
   it("can go negative and treats NaN inputs as 0", () => {
      expect(calculateNetProfit(100, 200, 300)).toBe(-400);
      expect(calculateNetProfit(Number.NaN, 50, 50)).toBe(-100);
      expect(calculateNetProfit(0, 0, 0)).toBe(0);
   });
});

describe("payment helpers", () => {
   it("recognises the mobile methods case-insensitively", () => {
      expect(isMobilePaymentMethod("bKash")).toBe(true);
      expect(isMobilePaymentMethod(" NAGAD ")).toBe(true);
      expect(isMobilePaymentMethod("rocket")).toBe(true);
      expect(isMobilePaymentMethod("Cash")).toBe(false);
      expect(isMobilePaymentMethod("Cash on Delivery")).toBe(false);
      expect(isMobilePaymentMethod(null)).toBe(false);
      expect(isMobilePaymentMethod(undefined)).toBe(false);
   });

   it("names the clashing order in the duplicate message, preferring orderId", () => {
      expect(
         duplicateTxIdMessage("TX123", { orderId: "ORD_7", orderCode: "X", id: "cuid" }),
      ).toContain("ORD_7");
      expect(duplicateTxIdMessage("TX123", { id: "cuid9" })).toContain("cuid9");
      const err = new DuplicateTxIdError("TX123", { orderId: "ORD_7" });
      expect(err.message).toContain("TX123");
      expect(err.txId).toBe("TX123");
   });

   it("findOrderWithTxId ignores empty TxIDs without querying", async () => {
      const findFirst = vi.fn(async () => null);
      const db = { order: { findFirst } };
      expect(await findOrderWithTxId("", undefined, db)).toBeNull();
      expect(await findOrderWithTxId("   ", undefined, db)).toBeNull();
      expect(findFirst).not.toHaveBeenCalled();
   });

   it("findOrderWithTxId trims the code and excludes the current order", async () => {
      const findFirst = vi.fn(async () => ({ id: "o2", orderId: "ORD_2" }));
      const db = { order: { findFirst } };
      const found = await findOrderWithTxId("  TX9  ", "o1", db);
      expect(found).toEqual({ id: "o2", orderId: "ORD_2" });
      const where = (findFirst.mock.calls[0] as any[])[0].where;
      expect(where.paymentTxId).toBe("TX9");
      expect(where.isDeleted).toBe(false);
      expect(where.id).toEqual({ not: "o1" });
   });
});

describe("parsePagination guards", () => {
   const params = (s: string) => new URLSearchParams(s);
   it("defaults when params are missing or non-numeric", () => {
      expect(parsePagination(params(""))).toEqual({ page: 1, limit: 20, skip: 0 });
      expect(parsePagination(params("page=abc&limit=xyz"))).toEqual({
         page: 1,
         limit: 20,
         skip: 0,
      });
   });
   it("never lets page or limit drop below 1 (the old negative-take bug)", () => {
      expect(parsePagination(params("page=-3&limit=-5"))).toEqual({
         page: 1,
         limit: 1,
         skip: 0,
      });
      expect(parsePagination(params("page=0&limit=0"))).toEqual({
         page: 1,
         limit: 1,
         skip: 0,
      });
   });
   it("clamps limit to the max and computes skip", () => {
      expect(parsePagination(params("page=3&limit=500"))).toEqual({
         page: 3,
         limit: 100,
         skip: 200,
      });
      expect(parsePagination(params("page=2&limit=25"), 20, 100)).toEqual({
         page: 2,
         limit: 25,
         skip: 25,
      });
   });
});

describe("formatCompactNumber (owner's examples)", () => {
   it("matches the specified examples exactly", () => {
      expect(formatCompactNumber(1000)).toBe("1k");
      expect(formatCompactNumber(10000)).toBe("10k");
      expect(formatCompactNumber(1500)).toBe("1.5k");
      expect(formatCompactNumber(100000)).toBe("100k");
      expect(formatCompactNumber(1000000)).toBe("1M");
      expect(formatCompactNumber(1500000)).toBe("1.5M");
   });
   it("handles zero, negatives, small values and missing values safely", () => {
      expect(formatCompactNumber(0)).toBe("0");
      expect(formatCompactNumber(-1500)).toBe("-1.5k");
      expect(formatCompactNumber(999)).toBe("999");
      expect(formatCompactNumber(null)).toBe("0");
      expect(formatCompactNumber(undefined)).toBe("0");
      expect(formatCompactNumber(Number.NaN)).toBe("0");
   });
   it("promotes at the tier boundary instead of printing 1000k", () => {
      expect(formatCompactNumber(999950)).toBe("1M");
      expect(formatCompactNumber(999.96)).toBe("1k");
   });
   it("prefixes the currency symbol after the sign when asked", () => {
      expect(formatCompactNumber(1500, { currencySymbol: "৳" })).toBe("৳1.5k");
      expect(formatCompactNumber(-1500, { currencySymbol: "৳" })).toBe("-৳1.5k");
   });
});

describe("calculateOrderTotals", () => {
   it("computes subtotal, total and due", () => {
      const t = calculateOrderTotals(
         [
            { price: 100, quantity: 2 },
            { price: 50, quantity: 1 },
         ],
         60,
         10,
         100,
      );
      expect(t.subtotal).toBe(250);
      expect(t.total).toBe(300);
      expect(t.dueAmount).toBe(200);
   });
   it("never lets the total or the due go below zero", () => {
      const t = calculateOrderTotals([{ price: 10, quantity: 1 }], 0, 50, 999);
      expect(t.total).toBe(0);
      expect(t.dueAmount).toBe(0);
   });
});

describe("Code 128 set B encoding", () => {
   it("starts with Start B and appends the mod-103 checksum", () => {
      // "ABC": values 33, 34, 35 → checksum (104 + 33·1 + 34·2 + 35·3) mod 103 = 1
      expect(code128BValues("ABC")).toEqual([104, 33, 34, 35, 1]);
      expect(code128BValues("")).toEqual([104, 104 % 103]);
   });
   it("produces 11 modules per symbol plus the 13-module stop", () => {
      // start + 3 chars + checksum = 5 symbols × 11 + stop 13 = 68
      expect(code128BModuleCount("ABC")).toBe(68);
      expect(code128BWidths("ABC")).toHaveLength(5 * 6 + 7);
   });
   it("rejects characters outside set B", () => {
      expect(() => code128BValues("price ৳")).toThrow(/cannot be encoded/);
      expect(() => code128BValues("tab\there")).toThrow(/cannot be encoded/);
   });
});
