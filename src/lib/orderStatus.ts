/**
 * Order status domain — ONE canonical vocabulary (Phase B1).
 *
 * Three things live here so every route shares them and can never
 * drift apart again (audit C-5 / C-6, tasks P1-2 / P1-4):
 *
 *  1. `ORDER_STATUSES` — the Prisma `OrderStatus` enum values, in
 *     schema order. Routes must validate against this list instead
 *     of re-declaring their own copy.
 *  2. `normalizeOrderStatus` — the API-boundary normaliser. The
 *     Order Publish flow (and the order filters) speak Title Case
 *     ("Out for Delivery"); the database speaks the enum
 *     (`OUT_FOR_DELIVERY`). The old POST only upper-cased, producing
 *     the invalid "OUT FOR DELIVERY", and the old PUT wrote the raw
 *     string — so Publish edits silently missed the enum AND the
 *     stock/audit semantics keyed on "CANCELLED". Every write route
 *     now normalises BEFORE any comparison or write and answers 400
 *     (never 500) for an unknown status.
 *  3. The canonical valid-order definition (audit C-5): an order
 *     counts toward customer statistics and customer dues iff it is
 *     not soft-deleted and its status is neither CANCELLED nor
 *     FAILED. This is the definition the Customers list and the
 *     Dashboard already used; Finance receivables, the customer
 *     detail totals, the Reports Customers tab and the orders-list
 *     customerType aggregation now use it too, via the where-fragment
 *     and the in-memory predicate below.
 *
 * `courierStatus` is deliberately NOT handled here: it is free text
 * (staff/provider wording such as "In Courier" / "Returned"), is
 * never compared against the OrderStatus enum anywhere, and must not
 * be forced into one.
 */

export const ORDER_STATUSES = [
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
] as const;

export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

const ORDER_STATUS_SET: ReadonlySet<string> = new Set(ORDER_STATUSES);

/**
 * Normalise a client-supplied order status to its canonical enum
 * value. Accepts the canonical enum itself plus Title-Case, spaced,
 * hyphenated, underscored and lower-case variants, case-insensitively
 * ("Out for Delivery", "out_for_delivery", "OUT FOR DELIVERY" all map
 * to `OUT_FOR_DELIVERY`). Returns null for anything unknown — callers
 * respond 400.
 */
export function normalizeOrderStatus(input: unknown): OrderStatusValue | null {
   if (typeof input !== "string") return null;
   const key = input
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
   if (!key) return null;
   return ORDER_STATUS_SET.has(key) ? (key as OrderStatusValue) : null;
}

/** Terminal statuses that never count as a customer's valid order. */
export const INVALID_ORDER_STATUSES = ["CANCELLED", "FAILED"] as const;

/**
 * Prisma where-fragment expressing the canonical valid-order rule on
 * its own: spread it into an order `where` (it composes with the
 * caller's other keys; a caller that also filters `status` or
 * `isDeleted` itself must merge deliberately instead of spreading).
 * Typed with a mutable status array so it assigns cleanly to
 * Prisma's `OrderWhereInput`.
 */
export const VALID_ORDER_WHERE: {
   isDeleted: boolean;
   status: { notIn: OrderStatusValue[] };
} = {
   isDeleted: false,
   status: { notIn: [...INVALID_ORDER_STATUSES] },
};

/** In-memory twin of VALID_ORDER_WHERE for already-loaded rows. */
export function isValidOrder(order: {
   status: string;
   isDeleted?: boolean | null;
}): boolean {
   if (order.isDeleted) return false;
   const status = String(order.status || "").toUpperCase();
   return !(INVALID_ORDER_STATUSES as readonly string[]).includes(status);
}

/**
 * Revenue-recognised statuses — the same pair the shared profit
 * formula's callers use for revenue (Dashboard, Reports Summary /
 * Finance / Sales). A *delivered* valid order for customer statistics
 * is a valid order in one of these statuses, decided by the ORDER
 * status — never by the free-text `courierStatus` (a CANCELLED order
 * whose courierStatus was edited to "DELIVERED" is not delivered).
 */
export const DELIVERED_ORDER_STATUSES = ["DELIVERED", "COMPLETED"] as const;

export function isDeliveredValidOrder(order: {
   status: string;
   isDeleted?: boolean | null;
}): boolean {
   if (!isValidOrder(order)) return false;
   const status = String(order.status || "").toUpperCase();
   return (DELIVERED_ORDER_STATUSES as readonly string[]).includes(status);
}
