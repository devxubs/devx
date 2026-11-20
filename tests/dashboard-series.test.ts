import { describe, it, expect } from "vitest";
import {
   bucketIndexSql,
   applyBucketTotals,
} from "@src/lib/dashboardSeries";

// P2-6: the dashboard series fan-out (one aggregate per bucket per
// model) is collapsed into one grouped query per model whose SQL
// CASE assigns rows to buckets by the EXACT boundaries the route
// computed. These tests pin the pure pieces: the CASE carries one
// WHEN per bucket with the boundary timestamps as bound values,
// and grouped rows land on the same bucket totals the per-bucket
// aggregates produced.

const buckets = [
   { start: new Date("2026-11-18T00:00:00.000Z"), end: new Date("2026-11-18T23:59:59.999Z") },
   { start: new Date("2026-11-19T00:00:00.000Z"), end: new Date("2026-11-19T23:59:59.999Z") },
   { start: new Date("2026-11-20T00:00:00.000Z"), end: new Date("2026-11-20T23:59:59.999Z") },
];

describe("bucketIndexSql", () => {
   it("builds a CASE with one WHEN per bucket and bound boundaries", () => {
      const sql = bucketIndexSql(
         // a bare column fragment, as the route passes Prisma.sql`createdAt`
         { strings: ["createdAt"], values: [] } as any,
         buckets,
      );
      const text = (sql as any).strings.join("?");
      expect(text).toContain("CASE");
      expect(text.match(/WHEN/g)).toHaveLength(3);
      // Every boundary and every bucket index is a BOUND parameter
      // (Prisma parameterizes the THEN index too) — nothing is
      // string-interpolated into the SQL.
      const values = (sql as any).values.flat(Infinity);
      expect(values).toContainEqual(buckets[0].start);
      expect(values).toContainEqual(buckets[0].end);
      expect(values).toContainEqual(buckets[2].start);
      expect(values).toContainEqual(buckets[2].end);
      expect(values).toContain(0);
      expect(values).toContain(1);
      expect(values).toContain(2);
   });
});

describe("applyBucketTotals", () => {
   it("places grouped sums on their bucket indexes, zero elsewhere", () => {
      const totals = applyBucketTotals(3, [
         { bucket: 0, total: "120.50" },
         { bucket: 2, total: 30 },
      ]);
      expect(totals).toEqual([120.5, 0, 30]);
   });

   it("accepts BigInt bucket indexes from the raw driver", () => {
      const totals = applyBucketTotals(3, [{ bucket: BigInt(1), total: "7" }]);
      expect(totals).toEqual([0, 7, 0]);
   });

   it("ignores null and out-of-range bucket indexes defensively", () => {
      const totals = applyBucketTotals(2, [
         { bucket: null, total: 999 },
         { bucket: 5, total: 999 },
         { bucket: -1, total: 999 },
         { bucket: 1, total: null },
      ]);
      expect(totals).toEqual([0, 0]);
   });

   it("reproduces the per-bucket aggregate result for a tiled range", () => {
      // Simulate rows the old per-bucket aggregates would have
      // summed: bucket sums are independent of how they were
      // computed — grouped CASE totals must equal them exactly.
      const perBucketAggregates = [450, 0, 1250.75];
      const groupedRows = perBucketAggregates
         .map((total, bucket) => ({ bucket, total }))
         .filter((r) => r.total !== 0); // empty buckets return no row
      expect(applyBucketTotals(3, groupedRows)).toEqual(perBucketAggregates);
   });
});
