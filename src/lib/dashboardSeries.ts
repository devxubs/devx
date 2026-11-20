import { Prisma } from "@prisma/client";

/**
 * Dashboard income/expense series bucketing (P2-6).
 *
 * The dashboard builds one bucket per day (ranges up to 62 days) or
 * per month (longer ranges). The previous implementation ran one
 * Prisma aggregate PER bucket PER model — up to ~124 aggregate
 * calls for a single dashboard request. The series is now computed
 * with ONE grouped raw-SQL query per model: a SQL `CASE` over the
 * exact bucket boundaries the route already computed assigns every
 * in-range row to its bucket index, and `GROUP BY` that index sums
 * it. This is a query-shape change only:
 *
 * - bucket boundaries (local day / calendar month, first and last
 *   bucket clamped to the requested range) are computed by the
 *   route exactly as before and passed in unchanged;
 * - the row filters (soft-deleted excluded, income = COMPLETED /
 *   DELIVERED orders only, range-bounded) are the same filters the
 *   per-bucket aggregates used;
 * - because the CASE uses the very same boundary timestamps, no
 *   timezone truncation is involved and a row lands in precisely
 *   the bucket the old per-bucket aggregate would have counted it
 *   in — the figures are identical by construction.
 */

export interface SeriesBucketBounds {
   start: Date;
   end: Date;
}

/**
 * SQL expression mapping a timestamp column to its bucket index
 * (0-based), or NULL when the timestamp falls outside every bucket.
 * Boundaries are bound parameters — never interpolated values.
 */
export function bucketIndexSql(
   column: Prisma.Sql,
   buckets: SeriesBucketBounds[],
): Prisma.Sql {
   const whens = buckets.map(
      (b, i) =>
         Prisma.sql`WHEN ${column} >= ${b.start} AND ${column} <= ${b.end} THEN ${i}`,
   );
   return Prisma.sql`CASE ${Prisma.join(whens, " ")} END`;
}

/**
 * Apply grouped-query rows (`{ bucket, total }`, one per non-empty
 * bucket) onto a zero-filled totals array of `bucketCount` entries.
 * Rows with a null/out-of-range bucket index are ignored (the
 * queries are range-bounded to the union of all buckets, so this
 * is only a defensive guard). SUM() over a Decimal column comes
 * back from the raw driver as a string/Decimal — coerced with
 * Number(), exactly like the aggregate `_sum` values were.
 */
export function applyBucketTotals(
   bucketCount: number,
   rows: Array<{ bucket: number | bigint | null; total: unknown }>,
): number[] {
   const totals = new Array<number>(bucketCount).fill(0);
   for (const row of rows) {
      if (row.bucket === null || row.bucket === undefined) continue;
      const idx = Number(row.bucket);
      if (!Number.isInteger(idx) || idx < 0 || idx >= bucketCount) continue;
      totals[idx] = Number(row.total || 0);
   }
   return totals;
}
