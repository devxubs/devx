/**
 * O8: possible-duplicate order detection — pure helpers.
 *
 * Two orders are possible duplicates of each other ONLY when ALL of
 * these hold (same customer alone is never enough):
 *   1. same customer phone, normalised and non-empty;
 *   2. same item signature — the multiset of
 *      productId + variantId + quantity lines, order-insensitive;
 *   3. same grand total (compared at paisa precision);
 *   4. created on the same calendar day in Asia/Dhaka (the store's
 *      timezone — the codebase formats local dates with
 *      `Intl.DateTimeFormat(..., { timeZone: "Asia/Dhaka" })`);
 *   5. both are valid orders — not soft-deleted and not in a
 *      terminal CANCELLED / FAILED status (the canonical rule in
 *      lib/orderStatus).
 *
 * Everything here is pure and unit-tested (tests/duplicate-orders.test.ts);
 * the list API feeds it the page's orders plus one bounded candidate
 * query and exposes the resulting flags per row.
 */
import { isValidOrder } from "./orderStatus";

export interface DuplicateOrderLine {
   productId?: string | null;
   variantId?: string | null;
   quantity: number;
}

export interface DuplicateOrderInput {
   id: string;
   /** Display id (customId / orderCode / orderId) used in messages. */
   customId?: string | null;
   orderCode?: string | null;
   orderId?: string | null;
   customerPhone?: string | null;
   /** Grand total (`total` column). */
   total: number | string;
   createdAt: Date | string;
   status: string;
   isDeleted?: boolean | null;
   items: DuplicateOrderLine[];
}

/** The id shown to staff for an order. */
export function duplicateDisplayId(order: DuplicateOrderInput): string {
   return order.customId || order.orderCode || order.orderId || order.id;
}

/**
 * Normalise a phone for comparison: digits only, with a leading
 * Bangladesh country code (+880…) folded to the local 0-prefixed
 * form so "+880 1712-345678" and "01712345678" compare equal.
 */
export function normalizeCustomerPhone(
   phone: string | null | undefined,
): string {
   const digits = String(phone || "").replace(/\D/g, "");
   if (digits.startsWith("880") && digits.length > 3) {
      return `0${digits.slice(3)}`;
   }
   return digits;
}

/**
 * Order-insensitive signature of an order's lines. Duplicate lines
 * are preserved (multiset): two lines of qty 1 are NOT the same
 * signature as one line of qty 2.
 */
export function orderItemSignature(lines: DuplicateOrderLine[]): string {
   return (lines || [])
      .map(
         (l) =>
            `${l.productId || ""}::${l.variantId || ""}::${Math.floor(Number(l.quantity) || 0)}`,
      )
      .sort()
      .join("|");
}

const dhakaDayFormatter = new Intl.DateTimeFormat("en-CA", {
   timeZone: "Asia/Dhaka",
   year: "numeric",
   month: "2-digit",
   day: "2-digit",
});

/** Calendar day (YYYY-MM-DD) of an instant in Asia/Dhaka. */
export function dhakaDayKey(value: Date | string): string {
   const date = value instanceof Date ? value : new Date(value);
   if (Number.isNaN(date.getTime())) return "";
   // en-CA renders YYYY-MM-DD; build from parts so the result does
   // not depend on a locale's exact separator/order.
   const parts = dhakaDayFormatter.formatToParts(date);
   const get = (type: string) =>
      parts.find((p) => p.type === type)?.value || "";
   return `${get("year")}-${get("month")}-${get("day")}`;
}

function totalPaisa(total: number | string): number {
   return Math.round(Number(total || 0) * 100);
}

/** The exact O8 rule: true only when EVERY dimension matches. */
export function arePossibleDuplicates(
   a: DuplicateOrderInput,
   b: DuplicateOrderInput,
): boolean {
   if (!a || !b || a.id === b.id) return false;
   if (!isValidOrder(a) || !isValidOrder(b)) return false;

   const phoneA = normalizeCustomerPhone(a.customerPhone);
   const phoneB = normalizeCustomerPhone(b.customerPhone);
   if (!phoneA || phoneA !== phoneB) return false;

   const signatureA = orderItemSignature(a.items || []);
   if (!signatureA || signatureA !== orderItemSignature(b.items || [])) {
      return false;
   }

   if (totalPaisa(a.total) !== totalPaisa(b.total)) return false;

   const dayA = dhakaDayKey(a.createdAt);
   if (!dayA || dayA !== dhakaDayKey(b.createdAt)) return false;

   return true;
}

/**
 * Group a set of orders into duplicate matches.
 * Returns a Map from order id → the display ids of every OTHER
 * order it duplicates. Orders with no match are absent from the map.
 */
export function findDuplicateMatches(
   orders: DuplicateOrderInput[],
): Map<string, string[]> {
   const matches = new Map<string, string[]>();
   const list = orders || [];
   for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
         if (!arePossibleDuplicates(list[i], list[j])) continue;
         const aId = list[i].id;
         const bId = list[j].id;
         matches.set(aId, [
            ...(matches.get(aId) || []),
            duplicateDisplayId(list[j]),
         ]);
         matches.set(bId, [
            ...(matches.get(bId) || []),
            duplicateDisplayId(list[i]),
         ]);
      }
   }
   return matches;
}
