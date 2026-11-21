import { describe, it, expect } from "vitest";
import {
   COURIER_STATUSES,
   normalizeCourierStatus,
   isSupportedCourierStatus,
   validateDefaultCourierStatusValue,
   validateDefaultCourierStatusInConfig,
   resolveDefaultCourierStatus,
   resolveSubmittedCourierStatus,
   partitionBulkResults,
   selectCourierPrintRows,
   formatFailedOrdersSummary,
} from "@src/lib/courierSubmission";

// O3/O4: the Default Courier Status setting validates against the
// exact status list the bulk courier action already supported, and
// a bulk submission's per-order results partition into the print
// set (succeeded only) vs the reported failures. Hermetic: the lib
// under test is pure — no DB, no network, no DOM.

describe("supported courier statuses (O4)", () => {
   it("is exactly the list the bulk courier UI already offered", () => {
      expect([...COURIER_STATUSES]).toEqual([
         "Pending",
         "In Courier",
         "Delivered",
         "Returned",
         "Hold",
         "Cancelled",
      ]);
   });

   it("normalises case and surrounding whitespace to the canonical form", () => {
      expect(normalizeCourierStatus("In Courier")).toBe("In Courier");
      expect(normalizeCourierStatus("in courier")).toBe("In Courier");
      expect(normalizeCourierStatus("  DELIVERED ")).toBe("Delivered");
      expect(isSupportedCourierStatus("Hold")).toBe(true);
   });

   it("rejects unsupported, empty and non-string values", () => {
      expect(normalizeCourierStatus("Flying")).toBeNull();
      expect(normalizeCourierStatus("Out for Delivery")).toBeNull();
      expect(normalizeCourierStatus("")).toBeNull();
      expect(normalizeCourierStatus("   ")).toBeNull();
      expect(normalizeCourierStatus(42)).toBeNull();
      expect(normalizeCourierStatus(null)).toBeNull();
      expect(normalizeCourierStatus(undefined)).toBeNull();
      expect(isSupportedCourierStatus("Shipped")).toBe(false);
   });
});

describe("Default Courier Status validation (O4)", () => {
   it("accepts every supported status", () => {
      for (const s of COURIER_STATUSES) {
         expect(validateDefaultCourierStatusValue(s)).toEqual({
            ok: true,
            value: s,
         });
      }
   });

   it("treats empty / null / undefined as unset, not an error", () => {
      expect(validateDefaultCourierStatusValue("")).toEqual({
         ok: true,
         value: null,
      });
      expect(validateDefaultCourierStatusValue(null)).toEqual({
         ok: true,
         value: null,
      });
      expect(validateDefaultCourierStatusValue(undefined)).toEqual({
         ok: true,
         value: null,
      });
   });

   it("rejects unsupported statuses on save, naming the supported list", () => {
      const verdict = validateDefaultCourierStatusValue("Flying");
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) {
         expect(verdict.message).toContain("In Courier");
         expect(verdict.message).toContain("defaultCourierStatus");
      }
      expect(validateDefaultCourierStatusValue(7).ok).toBe(false);
   });

   it("validates the key inside a customConfig payload", () => {
      expect(validateDefaultCourierStatusInConfig({}).ok).toBe(true);
      expect(validateDefaultCourierStatusInConfig(null).ok).toBe(true);
      expect(
         validateDefaultCourierStatusInConfig({
            defaultCourierStatus: "Pending",
         }).ok,
      ).toBe(true);
      expect(
         validateDefaultCourierStatusInConfig({
            defaultCourierStatus: "Teleporting",
         }).ok,
      ).toBe(false);
      // Other keys in the blob are not this validator's business.
      expect(
         validateDefaultCourierStatusInConfig({
            defaultExpenseCategory: "Store Rent",
         }).ok,
      ).toBe(true);
   });

   it("resolves the configured default, ignoring invalid stored values", () => {
      expect(
         resolveDefaultCourierStatus({ defaultCourierStatus: "In Courier" }),
      ).toBe("In Courier");
      expect(resolveDefaultCourierStatus({})).toBeNull();
      expect(resolveDefaultCourierStatus(null)).toBeNull();
      expect(resolveDefaultCourierStatus("nope")).toBeNull();
      expect(
         resolveDefaultCourierStatus({ defaultCourierStatus: "Bogus" }),
      ).toBeNull();
      expect(
         resolveDefaultCourierStatus({ defaultCourierStatus: "" }),
      ).toBeNull();
   });
});

describe("submitted courier status resolution (O4 application)", () => {
   const configured = { defaultCourierStatus: "In Courier" };

   it("an explicit status wins over the configured default", () => {
      expect(
         resolveSubmittedCourierStatus({
            provided: true,
            value: "Pending",
            customConfig: configured,
         }),
      ).toEqual({ ok: true, courierStatus: "Pending" });
   });

   it("an explicit empty status means keep-current — default does NOT override it", () => {
      expect(
         resolveSubmittedCourierStatus({
            provided: true,
            value: "",
            customConfig: configured,
         }),
      ).toEqual({ ok: true, courierStatus: undefined });
   });

   it("an absent field applies the configured default", () => {
      expect(
         resolveSubmittedCourierStatus({
            provided: false,
            value: undefined,
            customConfig: configured,
         }),
      ).toEqual({ ok: true, courierStatus: "In Courier" });
   });

   it("an absent field with no default preserves the old behaviour (no status)", () => {
      expect(
         resolveSubmittedCourierStatus({
            provided: false,
            value: undefined,
            customConfig: {},
         }),
      ).toEqual({ ok: true, courierStatus: undefined });
      expect(
         resolveSubmittedCourierStatus({
            provided: false,
            value: undefined,
            customConfig: null,
         }),
      ).toEqual({ ok: true, courierStatus: undefined });
   });

   it("an explicit unsupported status is rejected", () => {
      const verdict = resolveSubmittedCourierStatus({
         provided: true,
         value: "Flying",
         customConfig: configured,
      });
      expect(verdict.ok).toBe(false);
   });
});

describe("bulk result partitioning → print set (O3)", () => {
   const results = [
      { id: "1", orderId: "ORD_1", ok: true },
      { id: "2", orderId: "ORD_2", ok: false, error: "Order not found (or deleted)" },
      { id: "3", orderId: "ORD_3", ok: true, note: "Courier already set" },
   ];

   it("partitions succeeded vs failed, preserving order", () => {
      const { succeeded, failed } = partitionBulkResults(results);
      expect(succeeded.map((r) => r.id)).toEqual(["1", "3"]);
      expect(failed.map((r) => r.id)).toEqual(["2"]);
   });

   it("handles empty / missing result sets", () => {
      expect(partitionBulkResults([])).toEqual({ succeeded: [], failed: [] });
      expect(partitionBulkResults(null)).toEqual({ succeeded: [], failed: [] });
      expect(partitionBulkResults(undefined)).toEqual({
         succeeded: [],
         failed: [],
      });
   });

   it("the print set contains only succeeded rows, in row order", () => {
      const rows = [{ id: "3" }, { id: "1" }, { id: "2" }, { id: "9" }];
      expect(selectCourierPrintRows(rows, results).map((r) => r.id)).toEqual([
         "3",
         "1",
      ]);
   });

   it("a total failure yields an empty print set (no print page)", () => {
      const rows = [{ id: "1" }, { id: "2" }];
      const allFailed = [
         { id: "1", orderId: "ORD_1", ok: false, error: "Update failed" },
         { id: "2", orderId: "ORD_2", ok: false, error: "Update failed" },
      ];
      expect(selectCourierPrintRows(rows, allFailed)).toEqual([]);
   });

   it("summarises failures with order id and reason", () => {
      const { failed } = partitionBulkResults(results);
      expect(formatFailedOrdersSummary(failed)).toBe(
         "ORD_2 (Order not found (or deleted))",
      );
      expect(
         formatFailedOrdersSummary([{ id: "7", ok: false }]),
      ).toBe("7 (Failed)");
      expect(formatFailedOrdersSummary([])).toBe("");
   });
});
