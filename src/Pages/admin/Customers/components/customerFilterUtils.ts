// Customer Page upgrade — filter state types, date-preset resolution,
// query-string building and active-filter descriptions (chips).
import dayjs from "dayjs";

export type RangeOp = "eq" | "gt" | "gte" | "lt" | "lte" | "between";

/** All order statuses in the Prisma OrderStatus enum. */
export const ORDER_STATUS_OPTIONS: string[] = [
   "PENDING",
   "CONFIRMED",
   "PROCESSING",
   "SHIPPED",
   "OUT_FOR_DELIVERY",
   "DELIVERED",
   "COMPLETED",
   "HOLD",
   "CANCELLED",
   "FAILED",
];

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
   // Additional filters (all backed by real schema data — see API route)
   delivered: NumericRange;
   itemQty: NumericRange;
   orderStatuses: string[];
   orderStatusExclude: boolean;
   orderSources: string[];
   orderSourceExclude: boolean;
   productId: string;
   productLabel: string;
   categoryId: string;
   categoryLabel: string;
   employeeId: string;
   employeeLabel: string;
   phoneNumber: string;
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
   delivered: { ...emptyRange },
   itemQty: { ...emptyRange },
   orderStatuses: [],
   orderStatusExclude: false,
   orderSources: [],
   orderSourceExclude: false,
   productId: "",
   productLabel: "",
   categoryId: "",
   categoryLabel: "",
   employeeId: "",
   employeeLabel: "",
   phoneNumber: "",
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
   addRangeParams(q, "delivered", f.delivered);
   addRangeParams(q, "itemQty", f.itemQty);

   if (f.orderStatuses.length > 0) {
      q.set("orderStatuses", f.orderStatuses.join(","));
      if (f.orderStatusExclude) q.set("orderStatusMode", "exclude");
   }
   if (f.orderSources.length > 0) {
      q.set("orderSources", f.orderSources.join(","));
      if (f.orderSourceExclude) q.set("orderSourceMode", "exclude");
   }
   if (f.productId) q.set("productId", f.productId);
   if (f.categoryId) q.set("categoryId", f.categoryId);
   if (f.employeeId) q.set("employeeId", f.employeeId);
   const phone = f.phoneNumber.replace(/[\s-]/g, "");
   if (phone) q.set("phoneFilter", phone);

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

export type CustomerFilterErrors = Partial<
   Record<
      | "orders"
      | "purchase"
      | "paid"
      | "due"
      | "reg"
      | "last"
      | "delivered"
      | "itemQty"
      | "phone",
      string
   >
>;

function validateRange(
   r: NumericRange,
   integer: boolean,
): string | undefined {
   const v1 = r.value.trim();
   const v2 = r.value2.trim();
   if (v1 === "" && v2 === "") return undefined; // inactive — no condition
   if (v1 === "") return "Enter a value.";
   const n1 = Number(v1);
   if (Number.isNaN(n1) || n1 < 0)
      return "Enter a valid non-negative number.";
   if (integer && !Number.isInteger(n1)) return "Enter a whole number.";
   if (r.op === "between") {
      if (v2 === "") return "Enter both minimum and maximum values.";
      const n2 = Number(v2);
      if (Number.isNaN(n2) || n2 < 0)
         return "Enter a valid non-negative number.";
      if (integer && !Number.isInteger(n2)) return "Enter a whole number.";
      if (n1 > n2) return "Minimum cannot be greater than maximum.";
   }
   return undefined;
}

function validateCustomRange(
   preset: RegPreset | LastOrderPreset,
   range: [Date | null, Date | null],
): string | undefined {
   if (preset !== "custom") return undefined;
   const [s, e] = range;
   if (!s || !e) return "Select both start and end dates.";
   if (dayjs(s).isAfter(dayjs(e)))
      return "Start date cannot be after end date.";
   return undefined;
}

/** Validate a draft filter state; empty result = valid. */
export function validateCustomerFilters(
   f: CustomerFilterState,
): CustomerFilterErrors {
   const errors: CustomerFilterErrors = {};
   const orders = validateRange(f.orders, true);
   if (orders) errors.orders = orders;
   const purchase = validateRange(f.purchase, false);
   if (purchase) errors.purchase = purchase;
   const paid = validateRange(f.paid, false);
   if (paid) errors.paid = paid;
   const due = validateRange(f.due, false);
   if (due) errors.due = due;
   const reg = validateCustomRange(f.regPreset, f.regRange);
   if (reg) errors.reg = reg;
   const last = validateCustomRange(f.lastPreset, f.lastRange);
   if (last) errors.last = last;
   const delivered = validateRange(f.delivered, true);
   if (delivered) errors.delivered = delivered;
   const itemQty = validateRange(f.itemQty, true);
   if (itemQty) errors.itemQty = itemQty;
   const phone = f.phoneNumber.trim();
   if (phone !== "") {
      // Same format rule as the project's customer API: strip spaces and
      // dashes, then /^\+?[0-9]{7,15}$/.
      const normalized = phone.replace(/[\s-]/g, "");
      if (!/^\+?[0-9]{7,15}$/.test(normalized))
         errors.phone = "Enter a valid phone number format.";
   }
   return errors;
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
   if (isRangeActive(f.delivered)) n++;
   if (isRangeActive(f.itemQty)) n++;
   if (f.orderStatuses.length > 0) n++;
   if (f.orderSources.length > 0) n++;
   if (f.productId) n++;
   if (f.categoryId) n++;
   if (f.employeeId) n++;
   if (f.phoneNumber.trim() !== "") n++;
   return n;
}

export type FilterChipKey =
   | "status"
   | "reg"
   | "orders"
   | "purchase"
   | "paid"
   | "due"
   | "last"
   | "delivered"
   | "itemQty"
   | "orderStatuses"
   | "orderSources"
   | "product"
   | "category"
   | "employee"
   | "phone";

export interface FilterChipDescriptor {
   key: FilterChipKey;
   label: string;
}

const OP_SYMBOL: Record<RangeOp, string> = {
   eq: "=",
   gt: ">",
   gte: "≥",
   lt: "<",
   lte: "≤",
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
   if (isRangeActive(f.delivered))
      chips.push({
         key: "delivered",
         label: rangeLabel("Delivered Orders", f.delivered),
      });
   if (isRangeActive(f.itemQty))
      chips.push({ key: "itemQty", label: rangeLabel("Item Qty", f.itemQty) });
   if (f.orderStatuses.length > 0)
      chips.push({
         key: "orderStatuses",
         label: `Order Status${f.orderStatusExclude ? " (excl.)" : ""}: ${f.orderStatuses.join(", ")}`,
      });
   if (f.orderSources.length > 0)
      chips.push({
         key: "orderSources",
         label: `Order Source${f.orderSourceExclude ? " (excl.)" : ""}: ${f.orderSources.join(", ")}`,
      });
   if (f.productId)
      chips.push({
         key: "product",
         label: `Product: ${f.productLabel || f.productId}`,
      });
   if (f.categoryId)
      chips.push({
         key: "category",
         label: `Category: ${f.categoryLabel || f.categoryId}`,
      });
   if (f.employeeId)
      chips.push({
         key: "employee",
         label: `Employee: ${f.employeeLabel || f.employeeId}`,
      });
   if (f.phoneNumber.trim() !== "")
      chips.push({ key: "phone", label: `Phone: ${f.phoneNumber.trim()}` });
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
      case "delivered":
         return { ...f, delivered: { ...emptyRange } };
      case "itemQty":
         return { ...f, itemQty: { ...emptyRange } };
      case "orderStatuses":
         return { ...f, orderStatuses: [], orderStatusExclude: false };
      case "orderSources":
         return { ...f, orderSources: [], orderSourceExclude: false };
      case "product":
         return { ...f, productId: "", productLabel: "" };
      case "category":
         return { ...f, categoryId: "", categoryLabel: "" };
      case "employee":
         return { ...f, employeeId: "", employeeLabel: "" };
      case "phone":
         return { ...f, phoneNumber: "" };
      default:
         return f;
   }
}
