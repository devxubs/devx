/**
 * Bin restore linkage for cascade soft-deletes (audit C-2 / P0-2).
 *
 * Deleting a product soft-deletes its variants with it. The delete
 * route (`src/app/api/products/[id]`) writes ONE shared `deletedAt`
 * timestamp to the product and to every variant that was live at
 * delete time; variants deleted individually (beforehand, or via a
 * product edit that dropped them) keep their own earlier
 * `deletedAt`. Bin restore uses that shared timestamp as the
 * delete-event linkage: exactly the variants whose `deletedAt`
 * equals the product's are the cascade-deleted ones, and only they
 * come back with the product.
 */

type TimestampLike = Date | string | number | null | undefined;

function toTime(value: TimestampLike): number | null {
   if (value == null) return null;
   const time =
      value instanceof Date ? value.getTime() : new Date(value).getTime();
   return Number.isFinite(time) ? time : null;
}

export interface VariantDeletionState {
   id: string;
   isDeleted: boolean;
   deletedAt: TimestampLike;
}

/**
 * True when `variant` was cascade-deleted together with a product
 * whose delete event is stamped `productDeletedAt`: the variant is
 * soft-deleted and carries exactly that timestamp.
 */
export function isCascadeDeletedVariant(
   variant: VariantDeletionState,
   productDeletedAt: TimestampLike,
): boolean {
   if (!variant.isDeleted) return false;
   const productTime = toTime(productDeletedAt);
   if (productTime == null) return false;
   return toTime(variant.deletedAt) === productTime;
}

/**
 * Ids of the variants Bin restore must un-flag alongside the
 * product — the cascade-deleted ones only, never variants deleted
 * individually at another time. Pure — the route feeds it rows read
 * inside its transaction and un-flags the returned ids.
 */
export function selectCascadeDeletedVariantIds(
   productDeletedAt: TimestampLike,
   variants: VariantDeletionState[],
): string[] {
   return variants
      .filter((variant) => isCascadeDeletedVariant(variant, productDeletedAt))
      .map((variant) => variant.id);
}
