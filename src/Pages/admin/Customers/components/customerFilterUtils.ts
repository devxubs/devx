// Customer Page upgrade — filter state types, date-preset resolution,
// query-string building and active-filter descriptions (chips).
import dayjs from "dayjs";

export type RangeOp = "eq" | "gt" | "lt" | "between";

export interface NumericRange {
   op: RangeOp;
   value: string;
   value2: string;
}

export type StatusFilter = "all" | "new" | "returning";

export type RegPreset =
   | "all"
   | "today"
   | "yesterday"
   | "last7"
   | "last30"
   | "thisMonth"
   | "lastMonth"
   | "custom";

export type LastOrderPreset =
   | "all"
   | "today"
   | "last7"
   | "last30"
   | "thisMonth"
   | "lastMonth"
   | "never"
   | "custom";

export interface CustomerFilterState {
   status: StatusFilter;
   regPreset: RegPreset;
   regRange: [Date | null, Date | null];
   orders: NumericRange;
   purchase: NumericRange;
   paid: NumericRange;
   due: NumericRange;
   lastPreset: LastOrderPreset;
   lastRange: [Date | null, Date | null];
}

export const emptyRange: NumericRange = { op: "gt", value: "", value2: "" };

export const DEFAULT_FILTERS: CustomerFilterState = {
   status: "all",
   regPreset: "all",
   regRange: [null, null],
   orders: { ...emptyRange },
   purchase: { ...emptyRange },
   paid: { ...emptyRange },
   due: { ...emptyRange },
   lastPreset: "all",
   lastRange: [null, null],
};

export type CustomerStatus = "New" | "Returning";

export interface CustomerStats {
   totalOrders: number;
   totalPurchase: number;
   totalPaid: number;
   totalDue: number;
   lastOrderAt: string | null;
   status: CustomerStatus;
}

/** Row shape consumed by the table and the export helpers. */
export interface CustomerRow {
   id: string;
   customId: string;
   name: string;
   email: string;
   phone: string;
   address: string;
   createdAt: string;
   totalOrders: number;
   totalPurchase: number;
   totalPaid: number;
   totalDue: number;
   lastOrderAt: string | null;
   status: CustomerStatus;
}

export const REG_PRESET_OPTIONS: { value: RegPreset; label: string }[] = [
   { value: "all", label: "All Time" },
   { value: "today", label: "Today" },
   { value: "yesterday", label: "Yesterday" },
   { value: "last7", label: "Last 7 Days" },
   { value: "last30", label: "Last 30 Days" },
   { value: "thisMonth", label: "This Month" },
   { value: "lastMonth", label: "Last Month" },
   { value: "custom", label: "Custom Range" },
];

export const LAST_ORDER_PRESET_OPTIONS: { value: LastOrderPreset; label: string }[] = [
   { value: "all", label: "Any Time" },
   { value: "today", label: "Today" },
   { value: "last7", label: "Last 7 Days" },
   { value: "last30", label: "Last 30 Days" },
   { value: "thisMonth", label: "This Month" },
   { value: "lastMonth", label: "Last Month" },
   { value: "never", label: "Never Ordered" },
   { value: "custom", label: "Custom Range" },
];

/** Resolve a preset (or a custom range) to an inclusive [start, end] pair. */
export function resolveDateRange(
   preset: RegPreset | LastOrderPreset,
   customRange: [Date | null, Date | null],
): [Date, Date] | null {
   const now = dayjs();
   switch (preset) {
      case "today":
         return [now.startOf("day").toDate(), now.endOf("day").toDate()];
      case "yesterday": {
         const d = now.subtract(1, "day");
         return [d.startOf("day").toDate(), d.endOf("day").toDate()];
      }
      case "last7":
         return [
            now.subtract(6, "day").startOf("day").toDate(),
            now.endOf("day").toDate(),
         ];
      case "last30":
         return [
            now.subtract(29, "day").startOf("day").toDate(),
            now.endOf("day").toDate(),
         ];
      case "thisMonth":
         return [now.startOf("month").toDate(), now.endOf("month").toDate()];
      case "lastMonth": {
         const d = now.subtract(1, "month");
         return [d.startOf("month").toDate(), d.endOf("month").toDate()];
      }
      case "custom": {
         const [s, e] = customRange;
         if (!s || !e) return null;
         return [
            dayjs(s).startOf("day").toDate(),
            dayjs(e).endOf("day").toDate(),
         ];
      }
      default:
         return null;
   }
}

/** A numeric range is active when its value(s) are filled in. */
export function isRangeActive(r: NumericRange): boolean {
   if (r.value.trim() === "") return false;
   if (r.op === "between" && r.value2.trim() === "") return false;
   return true;
}

function addRangeParams(
   q: URLSearchParams,
   prefix: string,
   r: NumericRange,
) {
   if (!isRangeActive(r)) return;
   q.set(`${prefix}Op`, r.op);
   q.set(`${prefix}Value`, r.value.trim());
   if (r.op === "between") q.set(`${prefix}Value2`, r.value2.trim());
}

/** Build the GET /api/customers query string for the applied filters. */
export function buildCustomerQuery(
   f: CustomerFilterState,
   search: string,
   sortBy: string,
   sortDir: string,
): URLSearchParams {
   const q = new URLSearchParams();
   q.set("all", "true");
   const trimmed = search.trim();
   if (trimmed) q.set("search", trimmed);
   if (f.status !== "all") q.set("status", f.status);

   const reg = resolveDateRange(f.regPreset, f.regRange);
   if (reg) {
      q.set("regFrom", reg[0].toISOString());
      q.set("regTo", reg[1].toISOString());
   }

   addRangeParams(q, "orders", f.orders);
   addRangeParams(q, "purchase", f.purchase);
   addRangeParams(q, "paid", f.paid);
   addRangeParams(q, "due", f.due);

   if (f.lastPreset === "never") {
      q.set("neverOrdered", "1");
   } else {
      const last = resolveDateRange(f.lastPreset, f.lastRange);
      if (last) {
         q.set("lastFrom", last[0].toISOString());
         q.set("lastTo", last[1].toISOString());
      }
   }

   q.set("sortBy", sortBy);
   q.set("sortDir", sortDir);
   return q;
}

/** Number of active advanced-filter groups (for the Filters button badge). */
export function countActiveFilters(f: CustomerFilterState): number {
   let n = 0;
   if (f.status !== "all") n++;
   if (resolveDateRange(f.regPreset, f.regRange)) n++;
   if (isRangeActive(f.orders)) n++;
   if (isRangeActive(f.purchase)) n++;
   if (isRangeActive(f.paid)) n++;
   if (isRangeActive(f.due)) n++;
   if (
      f.lastPreset === "never" ||
      resolveDateRange(f.lastPreset, f.lastRange)
   )
      n++;
   return n;
}

export type FilterChipKey =
   | "status"
   | "reg"
   | "orders"
   | "purchase"
   | "paid"
   | "due"
   | "last";

export interface FilterChipDescriptor {
   key: FilterChipKey;
   label: string;
}

const OP_SYMBOL: Record<RangeOp, string> = {
   eq: "=",
   gt: ">",
   lt: "<",
   between: "",
};

function fmtNum(v: string): string {
   const n = Number(v);
   return Number.isNaN(n) ? v : n.toLocaleString("en-US");
}

function rangeLabel(name: string, r: NumericRange): string {
   if (r.op === "between")
      return `${name}: ${fmtNum(r.value)} – ${fmtNum(r.value2)}`;
   return `${name} ${OP_SYMBOL[r.op]} ${fmtNum(r.value)}`;
}

function dateRangeLabel(
   name: string,
   preset: RegPreset | LastOrderPreset,
   customRange: [Date | null, Date | null],
   presetOptions: { value: string; label: string }[],
): string | null {
   const range = resolveDateRange(preset, customRange);
   if (!range) return null;
   if (preset === "custom") {
      return `${name}: ${dayjs(range[0]).format("DD MMM YYYY")} – ${dayjs(range[1]).format("DD MMM YYYY")}`;
   }
   const label = presetOptions.find((o) => o.value === preset)?.label || preset;
   return `${name}: ${label}`;
}

/** Human-readable descriptors of the applied filters, for the chips row. */
export function describeFilters(
   f: CustomerFilterState,
): FilterChipDescriptor[] {
   const chips: FilterChipDescriptor[] = [];
   if (f.status !== "all") {
      chips.push({
         key: "status",
         label: `Status: ${f.status === "new" ? "New" : "Returning"}`,
      });
   }
   const reg = dateRangeLabel("Registered", f.regPreset, f.regRange, REG_PRESET_OPTIONS);
   if (reg) chips.push({ key: "reg", label: reg });
   if (isRangeActive(f.orders))
      chips.push({ key: "orders", label: rangeLabel("Orders", f.orders) });
   if (isRangeActive(f.purchase))
      chips.push({ key: "purchase", label: rangeLabel("Purchase", f.purchase) });
   if (isRangeActive(f.paid))
      chips.push({ key: "paid", label: rangeLabel("Paid", f.paid) });
   if (isRangeActive(f.due))
      chips.push({ key: "due", label: rangeLabel("Due", f.due) });
   if (f.lastPreset === "never") {
      chips.push({ key: "last", label: "Last Order: Never" });
   } else {
      const last = dateRangeLabel(
         "Last Order",
         f.lastPreset,
         f.lastRange,
         LAST_ORDER_PRESET_OPTIONS,
      );
      if (last) chips.push({ key: "last", label: last });
   }
   return chips;
}

/** Return a copy of the filter state with one group cleared. */
export function clearFilterGroup(
   f: CustomerFilterState,
   key: FilterChipKey,
): CustomerFilterState {
   switch (key) {
      case "status":
         return { ...f, status: "all" };
      case "reg":
         return { ...f, regPreset: "all", regRange: [null, null] };
      case "orders":
         return { ...f, orders: { ...emptyRange } };
      case "purchase":
         return { ...f, purchase: { ...emptyRange } };
      case "paid":
         return { ...f, paid: { ...emptyRange } };
      case "due":
         return { ...f, due: { ...emptyRange } };
      case "last":
         return { ...f, lastPreset: "all", lastRange: [null, null] };
      default:
         return f;
   }
}
