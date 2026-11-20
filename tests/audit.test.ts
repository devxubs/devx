import { describe, it, expect } from "vitest";
import {
   buildChanges,
   requestAuditContext,
   AUDIT_ENTITY_TYPES,
   ORDER_PUT_AUDIT_FIELDS,
   PURCHASE_PUT_AUDIT_FIELDS,
} from "@src/lib/audit";

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

// P2-13 (audit C-15): the PUT diff field lists are exported from
// lib/audit so the exact lists the routes diff over are testable.
describe("PUT audit diff field lists (P2-13)", () => {
   const orderBefore = {
      status: "PENDING",
      paymentStatus: "UNVERIFIED",
      paymentTxId: null,
      paymentSenderNumber: null,
      paymentMethod: "Cash",
      orderSource: null,
      cancellationReason: null,
      courier: null,
      courierStatus: null,
      deliveryCharge: 60,
      discount: 0,
      total: 500,
      dueAmount: 500,
      advancePayment: 0,
      courierConsignmentId: null,
      courierTrackingCode: null,
      courierProviderStatus: null,
      orderNote: null,
   };

   it.each([
      ["courierStatus", "In Courier"],
      ["paymentSenderNumber", "01700000000"],
      ["orderSource", "Facebook"],
      ["cancellationReason", "Customer asked"],
   ])("order PUT: a %s-only change now produces a diff", (field, value) => {
      const changes = buildChanges(
         orderBefore,
         { ...orderBefore, [field]: value },
         [...ORDER_PUT_AUDIT_FIELDS],
      );
      expect(changes).toEqual({ [field]: { from: null, to: value } });
   });

   it("order PUT: an unchanged order still diffs to null (no-op writes no row)", () => {
      expect(
         buildChanges(orderBefore, { ...orderBefore }, [
            ...ORDER_PUT_AUDIT_FIELDS,
         ]),
      ).toBeNull();
   });

   const purchaseBefore = {
      total: 1000,
      due: 200,
      paid: 800,
      productAmount: 950,
      othersCost: 50,
      discount: 0,
      supplierId: "sup-1",
      invoice: "INV-1",
      note: null,
   };

   it.each([
      ["supplierId", "sup-2"],
      ["invoice", "INV-2"],
      ["note", "Fragile"],
   ])("purchase PUT: a %s-only change now produces a diff", (field, value) => {
      const changes = buildChanges(
         purchaseBefore,
         { ...purchaseBefore, [field]: value },
         [...PURCHASE_PUT_AUDIT_FIELDS],
      );
      expect(changes).toEqual({
         [field]: { from: purchaseBefore[field as keyof typeof purchaseBefore], to: value },
      });
   });

   it("purchase PUT: an unchanged purchase still diffs to null", () => {
      expect(
         buildChanges(purchaseBefore, { ...purchaseBefore }, [
            ...PURCHASE_PUT_AUDIT_FIELDS,
         ]),
      ).toBeNull();
   });
});

// S-8 / P2-4: the audit IP derivation must match the rate limiter's
// getClientIp — the spoofable FIRST x-forwarded-for hop never wins.
describe("requestAuditContext IP derivation (S-8)", () => {
   const req = (headers: Record<string, string>) =>
      ({
         headers: {
            get: (name: string) => headers[name.toLowerCase()] ?? null,
         },
      }) as any;

   it("prefers x-real-ip over the forwarded chain", () => {
      expect(
         requestAuditContext(
            req({
               "x-real-ip": "192.0.2.1",
               "x-forwarded-for": "198.51.100.4, 10.0.0.1",
               "user-agent": "Browser",
            }),
         ),
      ).toEqual({ ipAddress: "192.0.2.1", userAgent: "Browser" });
   });

   it("uses the LAST x-forwarded-for hop, not the spoofable first", () => {
      expect(
         requestAuditContext(
            req({ "x-forwarded-for": "1.1.1.1, 198.51.100.2, 203.0.113.9" }),
         ).ipAddress,
      ).toBe("203.0.113.9");
   });

   it("stores null when no proxy header is present", () => {
      expect(requestAuditContext(req({})).ipAddress).toBeNull();
   });
});

// P2-4: the extended entity vocabulary the new coverage writes.
describe("AUDIT_ENTITY_TYPES (P2-4)", () => {
   it("covers the newly audited entities alongside the original set", () => {
      for (const t of [
         "ORDER",
         "PURCHASE",
         "EXPENSE",
         "PRODUCT",
         "USER",
         "ROLE",
         "SETTING",
         "CUSTOMER",
         "SUPPLIER",
         "ASSET",
         "CATEGORY",
         "UNIT",
         // Rider D-0a: Bin warehouse restore/permanent-delete rows.
         "WAREHOUSE",
      ]) {
         expect(AUDIT_ENTITY_TYPES).toContain(t);
      }
   });
});
