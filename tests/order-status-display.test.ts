import { describe, it, expect } from "vitest";
import {
   resolveOrderStatusOrder,
   resolveHiddenStatuses,
   statusOptionsFor,
   statusLabelsFor,
   sortStatusLabels,
   withCurrentStatus,
   resolveOrderListDefaultStatuses,
   resolveOrderTableColumns,
   applyColumnLayout,
   ORDER_TABLE_CONFIGURABLE_FIELDS,
} from "@src/lib/orderStatusDisplay";
import { ORDER_STATUSES } from "@src/lib/orderStatus";

// Phase 2: the central order-display resolvers. Defaults must
// reproduce today's behaviour exactly (canonical order, nothing
// hidden, no default filter, default column layout).

describe("resolveOrderStatusOrder", () => {
   it("defaults to the canonical order", () => {
      expect(resolveOrderStatusOrder(null)).toEqual([...ORDER_STATUSES]);
      expect(resolveOrderStatusOrder({})).toEqual([...ORDER_STATUSES]);
   });

   it("honours a saved order", () => {
      const cfg = {
         orderStatusOrder: ["COMPLETED", "PENDING", "CONFIRMED"],
      };
      const order = resolveOrderStatusOrder(cfg);
      expect(order.slice(0, 3)).toEqual(["COMPLETED", "PENDING", "CONFIRMED"]);
      expect(order).toHaveLength(ORDER_STATUSES.length);
   });

   it("appends statuses the saved order does not mention, in canonical order (new-status safety)", () => {
      const cfg = { orderStatusOrder: ["FAILED", "PENDING"] };
      const order = resolveOrderStatusOrder(cfg);
      expect(order[0]).toBe("FAILED");
      expect(order[1]).toBe("PENDING");
      expect(order.slice(2)).toEqual(
         ORDER_STATUSES.filter((s) => s !== "FAILED" && s !== "PENDING"),
      );
   });

   it("drops unknown values and duplicates from the saved order", () => {
      const cfg = {
         orderStatusOrder: ["PENDING", "RETURNED", "PENDING", 42, null],
      };
      const order = resolveOrderStatusOrder(cfg);
      expect(order[0]).toBe("PENDING");
      expect(order).toHaveLength(ORDER_STATUSES.length);
      expect(new Set(order).size).toBe(ORDER_STATUSES.length);
   });
});

describe("visibility per location", () => {
   const cfg = {
      orderStatusHidden: { create: ["HOLD"], filter: ["FAILED", "HOLD"] },
   };

   it("resolves hidden sets per location", () => {
      expect([...resolveHiddenStatuses(cfg, "create")]).toEqual(["HOLD"]);
      expect([...resolveHiddenStatuses(cfg, "filter")].sort()).toEqual([
         "FAILED",
         "HOLD",
      ]);
   });

   it("create/filter options exclude their hidden statuses", () => {
      expect(statusLabelsFor("create", cfg)).not.toContain("Hold");
      expect(statusLabelsFor("filter", cfg)).not.toContain("Failed");
      expect(statusLabelsFor("create", cfg)).toContain("Failed");
   });

   it("change menus are NEVER filtered — every status stays reachable", () => {
      expect(statusLabelsFor("change", cfg)).toHaveLength(ORDER_STATUSES.length);
      expect(statusOptionsFor("change", cfg).map((o) => o.value)).toEqual([
         ...ORDER_STATUSES,
      ]);
   });

   it("options carry enum values with Title labels, in configured order", () => {
      const cfg2 = { orderStatusOrder: ["DELIVERED", "PENDING"] };
      const opts = statusOptionsFor("change", cfg2);
      expect(opts[0]).toEqual({ value: "DELIVERED", label: "Delivered" });
      expect(opts[1]).toEqual({ value: "PENDING", label: "Pending" });
   });
});

describe("sortStatusLabels + withCurrentStatus", () => {
   it("sorts labels by the configured order", () => {
      const cfg = { orderStatusOrder: ["COMPLETED", "PENDING"] };
      expect(sortStatusLabels(["Pending", "Completed", "Hold"], cfg)).toEqual([
         "Completed",
         "Pending",
         "Hold",
      ]);
   });

   it("keeps a hidden current status selectable on edit forms", () => {
      const labels = ["Pending", "Confirmed"];
      expect(withCurrentStatus(labels, "Hold")).toEqual([
         "Pending",
         "Confirmed",
         "Hold",
      ]);
      expect(withCurrentStatus(labels, "Pending")).toEqual(labels);
      expect(withCurrentStatus(labels, "")).toEqual(labels);
      expect(withCurrentStatus(labels, null)).toEqual(labels);
   });
});

describe("resolveOrderListDefaultStatuses", () => {
   it("defaults to empty (All) and filters unknown values", () => {
      expect(resolveOrderListDefaultStatuses(null)).toEqual([]);
      expect(
         resolveOrderListDefaultStatuses({
            orderListDefaultStatuses: ["PENDING", "NOPE", "CONFIRMED"],
         }),
      ).toEqual(["PENDING", "CONFIRMED"]);
   });
});

describe("order table columns", () => {
   const all = ORDER_TABLE_CONFIGURABLE_FIELDS.map((f) => f.field);

   it("defaults to the built-in order with nothing hidden", () => {
      expect(resolveOrderTableColumns(null, all)).toEqual({
         order: all,
         hidden: [],
      });
   });

   it("honours a saved order/hidden and appends unmentioned fields", () => {
      const layout = resolveOrderTableColumns(
         { orderTableColumns: { order: ["status", "orderId"], hidden: ["note", "gone"] } },
         all,
      );
      expect(layout.order.slice(0, 2)).toEqual(["status", "orderId"]);
      expect(layout.order).toHaveLength(all.length);
      expect(layout.hidden).toEqual(["note"]);
   });

   it("applyColumnLayout reorders, drops hidden, and pins non-configurable columns last", () => {
      const columns = [
         { field: "orderId" },
         { field: "note" },
         { field: "status" },
         { field: "@actions" },
      ];
      const layout = { order: ["status", "orderId", "note"], hidden: ["note"] };
      expect(applyColumnLayout(columns, layout).map((c) => c.field)).toEqual([
         "status",
         "orderId",
         "@actions",
      ]);
   });
});
