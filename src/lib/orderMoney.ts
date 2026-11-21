// Order money breakdown helpers (QA fixes O1 + O2).
//
// The Order model has no tax column. On create, the UI engine
// (src/Pages/admin/Order/create/orderCalculations.ts) computes an
// OVERALL discount and a tax amount, then submits a folded discount
// to the API — submittedDiscount = overallDiscount − taxAmount — so
// the server's tax-less total (subtotal + delivery − discount)
// equals the UI grand total. The TRUE breakdown (overallDiscount /
// taxAmount / taxRate / productDiscount) is persisted in the
// orderTags JSON.
//
// Consequences every reader must honour:
//  • The stored Order.discount column is the SUBMITTED (folded)
//    discount, not the overall discount. Anything that re-enters the
//    discount into the create/edit engine must recover the overall
//    value from orderTags, or a taxed order's total inflates on a
//    no-op edit.
//  • Displays that print BOTH a discount row and a tax row must show
//    the overall discount and the tax amount, so their rows satisfy
//    Subtotal − Overall Discount + Tax + Delivery = Total. Displays
//    with no tax row must keep the folded discount instead.

/**
 * Parse an orderTags value (Prisma JSON object, or a JSON string on
 * legacy/serialized rows) into a plain record — the same
 * object-or-string parsing used across the order codebase
 * (Details tracking helpers, QuickEdit note extraction, the PUT
 * handler). Anything unparseable becomes {}.
 */
export function parseOrderTags(raw: unknown): Record<string, any> {
   if (raw && typeof raw === "object") return raw as Record<string, any>;
   if (typeof raw === "string") {
      try {
         const parsed = JSON.parse(raw);
         return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
         return {};
      }
   }
   return {};
}

/** Finite number stored under `key` in parsed tags, else undefined. */
export function orderTagNumber(
   tags: Record<string, any> | null | undefined,
   key: string,
): number | undefined {
   if (!tags) return undefined;
   const value = tags[key];
   if (value === undefined || value === null || value === "") return undefined;
   const n = Number(value);
   return Number.isFinite(n) ? n : undefined;
}

/**
 * The discount value the create/edit form must be hydrated with:
 * the persisted overall discount when present, otherwise the stored
 * (submitted) discount plus the tax that was folded into it.
 */
export function rehydratedDiscountValue(order: {
   discount?: unknown;
   orderTags?: unknown;
}): number {
   const tags = parseOrderTags(order?.orderTags);
   const overall = orderTagNumber(tags, "overallDiscount");
   if (overall !== undefined) return overall;
   const stored = Number(order?.discount) || 0;
   const taxAmount = orderTagNumber(tags, "taxAmount") ?? 0;
   return stored + taxAmount;
}

/**
 * Discount for displays that also show a tax row: the overall
 * discount when the breakdown was persisted, else the stored
 * discount (pre-breakdown orders have no tax folded in to undo).
 */
export function displayOrderDiscount(order: {
   discount?: unknown;
   orderTags?: unknown;
}): number {
   const tags = parseOrderTags(order?.orderTags);
   return orderTagNumber(tags, "overallDiscount") ?? (Number(order?.discount) || 0);
}

/**
 * Tax for display: the persisted tax amount from orderTags (the
 * Order model has no tax column, so order.tax is always absent on
 * real records), falling back to any caller-supplied tax value.
 */
export function displayOrderTax(order: {
   tax?: unknown;
   orderTags?: unknown;
}): number {
   const tags = parseOrderTags(order?.orderTags);
   return orderTagNumber(tags, "taxAmount") ?? (Number((order as any)?.tax) || 0);
}

/**
 * PUT /api/orders/[id] money-field resolution, mirroring the
 * handler's existing pricing fallback for TxID / sender / method:
 * a top-level field wins, then the same field nested under
 * body.pricing (the shape the Publish edit page submits), else
 * undefined — meaning "keep the stored value".
 */
export function resolvePutMoneyField(
   body: Record<string, any> | null | undefined,
   field: "deliveryCharge" | "discount" | "advancePayment",
): unknown {
   if (!body) return undefined;
   if (body[field] !== undefined) return body[field];
   return body.pricing?.[field];
}
