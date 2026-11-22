/**
 * Cancellation-reason classifier (Phase 2 ranking, plan §4.5).
 *
 * Pure: maps the free-text `Order.cancellationReason` (plus the O8
 * duplicate flag computed by the caller) to one of five classes.
 * Only "attributable" cancellations count against an employee in
 * metric M5 (Cancellation Control). The safe default is
 * "unclassified" — an empty, missing, fallback, or contentless
 * reason is NEVER counted against an employee.
 *
 * Precedence (first match wins):
 *   1. Caller-computed O8 duplicate flag.
 *   2. Structured token prefix written by the prospective cancel
 *      flow (plan decision D2): `STAFF_ERROR:` / `CUSTOMER:` /
 *      `DUPLICATE:` / `SYSTEM:` at the start of the reason.
 *   3. Empty / missing / the literal PUT fallback string
 *      ("Cancelled by user or staff", written by the order PUT
 *      route when no reason was supplied — a default, not evidence).
 *   4. Customer-caused vocabulary (seeded from the filter list in
 *      src/Pages/admin/Order/OrderFilterModel.tsx:34).
 *   5. "duplicate" mentioned in the text (a "duplicate payment" is
 *      a payment artefact, not a duplicate order — see step 6).
 *   6. System / courier patterns.
 *   7. Any other explicit, content-bearing reason is treated as
 *      staff-side handling ("Wrong Product", "Damaged", …) and is
 *      therefore attributable. A reason with no alphanumeric content
 *      at all matches nothing and stays unclassified.
 */

export type CancellationClass =
   | "attributable"
   | "customer"
   | "duplicate"
   | "system"
   | "unclassified";

/** Literal fallback written by the order PUT when no reason is given. */
export const CANCELLATION_FALLBACK_REASON = "Cancelled by user or staff";

const TOKEN_PREFIXES: Array<{ prefix: string; cls: CancellationClass }> = [
   { prefix: "staff_error:", cls: "attributable" },
   { prefix: "customer:", cls: "customer" },
   { prefix: "duplicate:", cls: "duplicate" },
   { prefix: "system:", cls: "system" },
];

/**
 * Customer-caused stems (case-insensitive substring match). Seeded
 * from the OrderFilterModel vocabulary — "Customer Refused",
 * "Price Disagreement" — plus the phrasings named in plan §4.5.
 * Stems are used so "customer refusal" / "customers cancelled"
 * style variants still match ("customer" + "refus" etc.).
 */
const CUSTOMER_PATTERNS = [
   "customer refus",
   "customer request",
   "customer cancel",
   "changed mind",
   "price disagreement",
] as const;

/** System / courier / payment-artefact patterns (§4.5). */
const SYSTEM_PATTERNS = [
   "courier",
   "delivery failed",
   "out of stock",
   "system",
   "payment gateway",
   "duplicate payment",
] as const;

export function classifyCancellation(
   reason: string | null | undefined,
   opts?: { isDuplicate?: boolean },
): CancellationClass {
   // 1. The O8 duplicate rule (computed by the caller from order
   //    data) outranks any text: the text may say anything.
   if (opts?.isDuplicate) return "duplicate";

   const raw = typeof reason === "string" ? reason : "";
   const trimmed = raw.trim();
   const lower = trimmed.toLowerCase();

   // 2. Structured token prefix (D2) — exact, at string start.
   for (const { prefix, cls } of TOKEN_PREFIXES) {
      if (lower.startsWith(prefix)) return cls;
   }

   // 3. No evidence: empty/missing, or the PUT fallback literal.
   if (!trimmed) return "unclassified";
   if (lower === CANCELLATION_FALLBACK_REASON.toLowerCase()) {
      return "unclassified";
   }

   // 4. Customer-caused vocabulary.
   for (const pattern of CUSTOMER_PATTERNS) {
      if (lower.includes(pattern)) return "customer";
   }

   // 5. Duplicate mentioned in free text. "duplicate payment" is
   //    excluded here — it is a system artefact (step 6).
   if (lower.includes("duplicate") && !lower.includes("duplicate payment")) {
      return "duplicate";
   }

   // 6. System / courier patterns.
   for (const pattern of SYSTEM_PATTERNS) {
      if (lower.includes(pattern)) return "system";
   }

   // 7. Any remaining explicit reason with real content is a
   //    staff-side handling reason (e.g. "Wrong Product",
   //    "Damaged"). Contentless strings ("-", "…") match nothing.
   if (!/[a-z0-9]/i.test(trimmed)) return "unclassified";
   return "attributable";
}
