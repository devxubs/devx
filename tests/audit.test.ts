import { describe, it, expect } from "vitest";
import { buildChanges } from "@src/lib/audit";

// Phase 4 (D1): the audit changes-diff builder — only fields whose
// values actually differ are recorded, as JSON-safe { from, to }
// pairs; money Decimals and Dates are normalised to scalars.
describe("buildChanges", () => {
   it("records only the fields that changed", () => {
      const changes = buildChanges(
         { status: "PENDING", total: 100, note: "x" },
         { status: "DELIVERED", total: 100, note: "x" },
         ["status", "total", "note"],
      );
      expect(changes).toEqual({ status: { from: "PENDING", to: "DELIVERED" } });
   });

   it("returns null when nothing changed", () => {
      expect(
         buildChanges({ status: "PENDING" }, { status: "PENDING" }, ["status"]),
      ).toBeNull();
      expect(buildChanges({}, {}, ["status"])).toBeNull();
   });

   it("treats missing values as null on either side", () => {
      const changes = buildChanges({}, { courierTrackingCode: "TRK-1" }, [
         "courierTrackingCode",
      ]);
      expect(changes).toEqual({
         courierTrackingCode: { from: null, to: "TRK-1" },
      });
   });

   it("normalises Decimal-like values to numbers and Dates to ISO strings", () => {
      const decimal = { toNumber: () => 42.5 };
      const changes = buildChanges(
         { total: { toNumber: () => 40 }, at: new Date("2026-01-01T00:00:00.000Z") },
         { total: decimal, at: new Date("2026-01-02T00:00:00.000Z") },
         ["total", "at"],
      );
      expect(changes).toEqual({
         total: { from: 40, to: 42.5 },
         at: {
            from: "2026-01-01T00:00:00.000Z",
            to: "2026-01-02T00:00:00.000Z",
         },
      });
   });

   it("compares numerically across representations (100 vs '100' object forms)", () => {
      // A stored Decimal 100 and a recomputed number 100 are the
      // same value and must not produce a phantom change entry.
      const changes = buildChanges(
         { due: { toNumber: () => 100 } },
         { due: 100 },
         ["due"],
      );
      expect(changes).toBeNull();
   });
});
