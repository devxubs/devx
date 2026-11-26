/**
 * Phase 2 — Order Display & Global Sorting Settings.
 *
 * ONE central source for how order statuses are ORDERED and
 * where they are VISIBLE, plus the Order List's default status
 * filter and table column layout. Every status selector in the
 * app resolves through here — no page keeps its own ordering
 * logic. Configuration lives in StoreSetting.customConfig
 * (business-wide, the existing settings architecture):
 *
 *   orderStatusOrder:        string[]  — enum values, admin order
 *   orderStatusHidden:       { create?: string[], filter?: string[] }
 *   orderListDefaultStatuses: string[] — enum values
 *   orderTableColumns:       { order?: string[], hidden?: string[] }
 *
 * Statuses are the Prisma OrderStatus enum (see orderStatus.ts):
 * they cannot be created or deleted at runtime, so "a new status
 * appears" means a value exists in the canonical list that the
 * saved order does not mention yet — it is appended at the end in
 * canonical order, and the saved order is otherwise preserved.
 * Unknown strings in the saved config are ignored.
 *
 * Visibility is PER LOCATION and only ever affects SELECTORS:
 *   - "create": Order Create / Edit / Quick Edit status pickers.
 *   - "filter": Order List tabs + filter modal, Customers filter.
 * Status-CHANGE menus (list row menu, bulk status) and every
 * status DISPLAY (chips, details, history) always show every
 * status — a hidden status must never strand an order or hide
 * its historical record.
 */

import { ORDER_STATUSES, type OrderStatusValue } from "@src/lib/orderStatus";

export const ORDER_STATUS_ORDER_KEY = "orderStatusOrder";
export const ORDER_STATUS_HIDDEN_KEY = "orderStatusHidden";
export const ORDER_LIST_DEFAULT_STATUSES_KEY = "orderListDefaultStatuses";
export const ORDER_TABLE_COLUMNS_KEY = "orderTableColumns";

/** Enum → the Title-Case label the UI has always used. */
export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
   PENDING: "Pending",
   CONFIRMED: "Confirmed",
   PROCESSING: "Processing",
   SHIPPED: "Shipped",
   OUT_FOR_DELIVERY: "Out for Delivery",
   DELIVERED: "Delivered",
   COMPLETED: "Completed",
   HOLD: "Hold",
   CANCELLED: "Cancelled",
   FAILED: "Failed",
};

export type StatusSelectorLocation = "create" | "filter" | "change";

const KNOWN: ReadonlySet<string> = new Set(ORDER_STATUSES);

function asConfigObject(customConfig: unknown): Record<string, unknown> {
   return customConfig &&
      typeof customConfig === "object" &&
      !Array.isArray(customConfig)
      ? (customConfig as Record<string, unknown>)
      : {};
}

function knownStatuses(value: unknown): OrderStatusValue[] {
   if (!Array.isArray(value)) return [];
   const out: OrderStatusValue[] = [];
   for (const v of value) {
      if (typeof v === "string" && KNOWN.has(v) && !out.includes(v as OrderStatusValue)) {
         out.push(v as OrderStatusValue);
      }
   }
   return out;
}

/**
 * The effective global status order: the saved order first
 * (known values only), then any canonical status the saved order
 * does not mention, in canonical order. With no saved order this
 * is exactly ORDER_STATUSES.
 */
export function resolveOrderStatusOrder(customConfig: unknown): OrderStatusValue[] {
   const cfg = asConfigObject(customConfig);
   const saved = knownStatuses(cfg[ORDER_STATUS_ORDER_KEY]);
   const missing = ORDER_STATUSES.filter((s) => !saved.includes(s));
   return [...saved, ...missing];
}

/** Statuses hidden from one selector location (never from displays or change menus). */
export function resolveHiddenStatuses(
   customConfig: unknown,
   location: "create" | "filter",
): ReadonlySet<OrderStatusValue> {
   const cfg = asConfigObject(customConfig);
   const hidden = asConfigObject(cfg[ORDER_STATUS_HIDDEN_KEY]);
   return new Set(knownStatuses(hidden[location]));
}

export interface StatusOption {
   value: OrderStatusValue;
   label: string;
}

/**
 * Ordered { value, label } options for a selector location.
 * "change" (status-change menus) is never filtered — see the
 * module comment. An order's CURRENT status should additionally
 * be merged back in by edit forms when it is hidden for "create",
 * so an existing order can always be re-saved unchanged.
 */
export function statusOptionsFor(
   location: StatusSelectorLocation,
   customConfig: unknown,
): StatusOption[] {
   const hidden =
      location === "change"
         ? new Set<OrderStatusValue>()
         : resolveHiddenStatuses(customConfig, location);
   return resolveOrderStatusOrder(customConfig)
      .filter((s) => !hidden.has(s))
      .map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] }));
}

/** Ordered Title-Case labels for a location (the form most legacy selectors use). */
export function statusLabelsFor(
   location: StatusSelectorLocation,
   customConfig: unknown,
): string[] {
   return statusOptionsFor(location, customConfig).map((o) => o.label);
}

/**
 * Ensure an order's CURRENT status label is present in a picker
 * list even when that status is hidden for the location — an
 * existing order must always be re-savable unchanged. Appends
 * the current label at the end when missing.
 */
export function withCurrentStatus(labels: string[], current: unknown): string[] {
   if (typeof current !== "string" || !current) return labels;
   return labels.includes(current) ? labels : [...labels, current];
}

/** Sort Title-Case labels by the configured global order (unknown labels keep their relative order, last). */
export function sortStatusLabels(labels: string[], customConfig: unknown): string[] {
   const order = resolveOrderStatusOrder(customConfig);
   const rank = new Map<string, number>();
   order.forEach((s, i) => rank.set(ORDER_STATUS_LABELS[s], i));
   return [...labels].sort(
      (a, b) => (rank.get(a) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b) ?? Number.MAX_SAFE_INTEGER),
   );
}

/** The Order List's configured default status filter (empty = show All). */
export function resolveOrderListDefaultStatuses(
   customConfig: unknown,
): OrderStatusValue[] {
   const cfg = asConfigObject(customConfig);
   return knownStatuses(cfg[ORDER_LIST_DEFAULT_STATUSES_KEY]);
}

/**
 * The Order List table's configurable columns, in their default
 * order. The actions column ("@actions") is deliberately absent:
 * it is required and always renders last. Shared by the table
 * (which applies the layout) and Settings (which edits it) so
 * the two can never drift.
 */
export const ORDER_TABLE_CONFIGURABLE_FIELDS: Array<{ field: string; label: string }> = [
   { field: "orderId", label: "ID" },
   { field: "note", label: "Note" },
   { field: "customer", label: "Customer" },
   { field: "address", label: "Address" },
   { field: "date", label: "Date" },
   { field: "orderSource", label: "Source" },
   { field: "subtotal", label: "Subtotal" },
   { field: "status", label: "Status" },
];

export interface OrderTableColumnsConfig {
   /** Configurable fields in display order (defaults first). */
   order: string[];
   /** Fields configured hidden. */
   hidden: string[];
}

/**
 * Resolve the Order List column layout against the table's full
 * configurable field list: saved order first, unmentioned fields
 * appended in their default order; hidden = saved hidden list
 * intersected with the known fields. The actions column is not
 * part of the configurable set and is always rendered last by
 * the table itself.
 */
export function resolveOrderTableColumns(
   customConfig: unknown,
   allFields: string[],
): OrderTableColumnsConfig {
   const cfg = asConfigObject(customConfig);
   const saved = asConfigObject(cfg[ORDER_TABLE_COLUMNS_KEY]);
   const savedOrder = Array.isArray(saved.order)
      ? saved.order.filter(
           (f): f is string => typeof f === "string" && allFields.includes(f),
        )
      : [];
   const order = [
      ...savedOrder,
      ...allFields.filter((f) => !savedOrder.includes(f)),
   ];
   const hidden = Array.isArray(saved.hidden)
      ? saved.hidden.filter(
           (f): f is string => typeof f === "string" && allFields.includes(f),
        )
      : [];
   return { order, hidden };
}

/** Apply a resolved column layout to a columns array (keeps non-configurable columns, e.g. actions, pinned at the end in their original relative order). */
export function applyColumnLayout<T extends { field: string }>(
   columns: T[],
   layout: OrderTableColumnsConfig,
): T[] {
   const configurable = new Set(layout.order);
   const hidden = new Set(layout.hidden);
   const byField = new Map(columns.map((c) => [c.field, c]));
   const ordered: T[] = [];
   for (const field of layout.order) {
      const col = byField.get(field);
      if (col && !hidden.has(field)) ordered.push(col);
   }
   for (const col of columns) {
      if (!configurable.has(col.field)) ordered.push(col);
   }
   return ordered;
}
