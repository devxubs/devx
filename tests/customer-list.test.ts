import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import {
   buildCustomerBaseConditions,
   buildCustomerFilterConditions,
   buildCustomerOrderBy,
   buildCustomerStatusCondition,
   fetchCustomerListPage,
   getRangeCheck,
   highValueRank,
   highValueThresholdFromSpends,
   matchesRange,
   parseCustomerListParams,
   rangeConditionSql,
} from "@src/lib/customerList";

// Phase B4a (P1-13): the customers list computation moved from
// in-memory filtering/slicing over the whole matched population to
// aggregated SQL with server-side pagination. These hermetic tests
// pin the pure pieces — parameter parsing, the sort allowlist, the
// segment/range condition construction and the percentile rule —
// plus the orchestration of fetchCustomerListPage against a fake
// $queryRaw client. The executed-SQL equivalence with the old
// in-memory computation is covered by the DB-gated integration
// suite (tests/integration/database.test.ts).

const params = (qs: string) =>
   parseCustomerListParams(new URLSearchParams(qs));

describe("parseCustomerListParams", () => {
   it("applies the old defaults: page 1, limit 20, createdAt desc", () => {
      const p = params("");
      expect(p.page).toBe(1);
      expect(p.limit).toBe(20);
      expect(p.skip).toBe(0);
      expect(p.sortBy).toBe("createdAt");
      expect(p.sortDir).toBe("desc");
      expect(p.search).toBe("");
      expect(p.segment).toBeNull();
      expect(p.status).toBeNull();
   });

   it("clamps pagination through the shared helper (max 100)", () => {
      const p = params("page=3&limit=500");
      expect(p.page).toBe(3);
      expect(p.limit).toBe(100);
      expect(p.skip).toBe(200);
      expect(params("limit=abc&page=-2").limit).toBe(20);
      expect(params("limit=abc&page=-2").page).toBe(1);
   });

   it("ignores the retired all/export hatch entirely", () => {
      const p = params("all=true&export=true");
      expect(p.limit).toBe(20);
      expect(p.skip).toBe(0);
   });

   it("keeps only allowlisted sort fields, everything else → createdAt", () => {
      for (const f of [
         "name",
         "customId",
         "createdAt",
         "totalOrders",
         "totalPurchase",
         "totalPaid",
         "totalDue",
         "lastOrderAt",
      ]) {
         expect(params(`sortBy=${f}`).sortBy).toBe(f);
      }
      expect(params("sortBy=email").sortBy).toBe("createdAt");
      expect(params("sortBy=name;DROP").sortBy).toBe("createdAt");
      expect(params("sortDir=asc").sortDir).toBe("asc");
      expect(params("sortDir=sideways").sortDir).toBe("desc");
   });

   it("parses search, phone (space/dash-stripped) and registration range", () => {
      const p = params(
         "search=%20rahim%20&phoneFilter=01712-345%20678&regFrom=2026-01-01&regTo=2026-01-31",
      );
      expect(p.search).toBe("rahim");
      expect(p.phoneFilter).toBe("01712345678");
      expect(p.regFrom?.toISOString()).toContain("2026-01-01T00:00:00");
      expect(p.regTo?.toISOString()).toContain("2026-01-31T23:59:59");
   });

   it("parses the four stat range filters onto their fields", () => {
      const p = params(
         "ordersOp=gte&ordersValue=2&purchaseOp=between&purchaseValue=100&purchaseValue2=50&paidOp=eq&paidValue=10&dueOp=lt&dueValue=5",
      );
      expect(p.rangeChecks).toEqual([
         { field: "totalOrders", check: { op: "gte", v1: 2, v2: null } },
         { field: "totalPurchase", check: { op: "between", v1: 100, v2: 50 } },
         { field: "totalPaid", check: { op: "eq", v1: 10, v2: null } },
         { field: "totalDue", check: { op: "lt", v1: 5, v2: null } },
      ]);
   });

   it("drops malformed range filters exactly like the old parser", () => {
      expect(getRangeCheck(new URLSearchParams("xOp=nope&xValue=1"), "x")).toBeNull();
      expect(getRangeCheck(new URLSearchParams("xOp=gt&xValue=abc"), "x")).toBeNull();
      expect(getRangeCheck(new URLSearchParams("xOp=between&xValue=1"), "x")).toBeNull();
      expect(getRangeCheck(new URLSearchParams("xValue=1"), "x")).toBeNull();
      const p = params("deliveredOp=gt&deliveredValue=1&itemQtyOp=lte&itemQtyValue=9");
      expect(p.deliveredCheck).toEqual({ op: "gt", v1: 1, v2: null });
      expect(p.itemQtyCheck).toEqual({ op: "lte", v1: 9, v2: null });
   });

   it("parses presence lists, exclude modes and presence ids", () => {
      const p = params(
         "orderStatuses=DELIVERED,%20CANCELLED&orderStatusMode=exclude&orderSources=Facebook&productId=p1&categoryId=c1&employeeId=e1&neverOrdered=1",
      );
      expect(p.orderStatusList).toEqual(["DELIVERED", "CANCELLED"]);
      expect(p.orderStatusExclude).toBe(true);
      expect(p.orderSourceList).toEqual(["Facebook"]);
      expect(p.orderSourceExclude).toBe(false);
      expect(p.productId).toBe("p1");
      expect(p.categoryId).toBe("c1");
      expect(p.employeeId).toBe("e1");
      expect(p.neverOrdered).toBe(true);
   });
});

describe("rangeConditionSql mirrors matchesRange", () => {
   const col = Prisma.raw("COALESCE(s.totalPurchase, 0)");

   it("eq keeps the ±0.005 tolerance", () => {
      const sql = rangeConditionSql(col, { op: "eq", v1: 10, v2: null });
      expect(sql.sql).toBe("ABS(COALESCE(s.totalPurchase, 0) - ?) < 0.005");
      expect(sql.values).toEqual([10]);
      expect(matchesRange(10.004, { op: "eq", v1: 10, v2: null })).toBe(true);
      expect(matchesRange(10.006, { op: "eq", v1: 10, v2: null })).toBe(false);
   });

   it("comparison ops bind the value", () => {
      for (const [op, sym] of [
         ["gt", ">"],
         ["gte", ">="],
         ["lt", "<"],
         ["lte", "<="],
      ] as const) {
         const sql = rangeConditionSql(col, { op, v1: 3, v2: null });
         expect(sql.sql).toBe(`COALESCE(s.totalPurchase, 0) ${sym} ?`);
         expect(sql.values).toEqual([3]);
      }
   });

   it("between normalises min/max via LEAST/GREATEST (JS swaps too)", () => {
      const sql = rangeConditionSql(col, { op: "between", v1: 100, v2: 50 });
      expect(sql.sql).toContain("BETWEEN LEAST(?, ?) AND GREATEST(?, ?)");
      expect(sql.values).toEqual([100, 50, 100, 50]);
      expect(matchesRange(75, { op: "between", v1: 100, v2: 50 })).toBe(true);
      expect(matchesRange(101, { op: "between", v1: 100, v2: 50 })).toBe(false);
   });
});

describe("high-value percentile (nearest-rank 80th, spenders only)", () => {
   it("rank is max(1, ceil(0.8 × n))", () => {
      expect(highValueRank(1)).toBe(1);
      expect(highValueRank(2)).toBe(2);
      expect(highValueRank(5)).toBe(4);
      expect(highValueRank(10)).toBe(8);
      expect(highValueRank(100)).toBe(80);
   });

   it("threshold comes from the sorted positive spends", () => {
      expect(highValueThresholdFromSpends([])).toBeNull();
      expect(highValueThresholdFromSpends([0, 0])).toBeNull();
      expect(highValueThresholdFromSpends([200])).toBe(200);
      expect(highValueThresholdFromSpends([50, 200, 100, 150, 0])).toBe(200);
      expect(
         highValueThresholdFromSpends([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]),
      ).toBe(80);
   });
});

describe("SQL condition construction", () => {
   it("base conditions bind search as a LIKE pattern parameter", () => {
      const conds = buildCustomerBaseConditions(params("search=rahim"));
      const joined = conds.map((c) => c.sql).join(" AND ");
      expect(joined).toContain("c.isDeleted = 0");
      expect(joined).toContain("c.name LIKE ?");
      expect(joined).toContain("c.customId LIKE ?");
      expect(conds[1].values).toEqual(["%rahim%", "%rahim%", "%rahim%", "%rahim%"]);
   });

   it("status condition uses the coalesced order count", () => {
      expect(buildCustomerStatusCondition(params("status=new"))?.sql).toBe(
         "COALESCE(s.totalOrders, 0) <= 1",
      );
      expect(buildCustomerStatusCondition(params("status=returning"))?.sql).toBe(
         "COALESCE(s.totalOrders, 0) > 1",
      );
      expect(buildCustomerStatusCondition(params("status=other"))).toBeNull();
      expect(buildCustomerStatusCondition(params(""))).toBeNull();
   });

   it("inactive binds a 90-day cutoff and requires a last order", () => {
      const now = new Date("2026-11-20T00:00:00.000Z");
      const conds = buildCustomerFilterConditions(
         params("segment=inactive"),
         null,
         now,
      );
      expect(conds).toHaveLength(1);
      expect(conds[0].sql).toContain("s.lastOrderAt IS NOT NULL");
      expect(conds[0].sql).toContain("s.lastOrderAt < ?");
      expect((conds[0].values[0] as Date).toISOString()).toBe(
         "2026-08-22T00:00:00.000Z",
      );
   });

   it("highValue with no threshold is an always-false condition", () => {
      const conds = buildCustomerFilterConditions(
         params("segment=highValue"),
         null,
         new Date(),
      );
      expect(conds[0].sql).toBe("1 = 0");
      const withT = buildCustomerFilterConditions(
         params("segment=highValue"),
         500,
         new Date(),
      );
      expect(withT[0].sql).toBe("COALESCE(s.totalPurchase, 0) >= ?");
      expect(withT[0].values).toEqual([500]);
   });

   it("neverOrdered wins over the last-order range (old else-if)", () => {
      const conds = buildCustomerFilterConditions(
         params("neverOrdered=1&lastFrom=2026-01-01&lastTo=2026-02-01"),
         null,
         new Date(),
      );
      expect(conds.map((c) => c.sql)).toEqual(["s.lastOrderAt IS NULL"]);
      const ranged = buildCustomerFilterConditions(
         params("lastFrom=2026-01-01&lastTo=2026-02-01"),
         null,
         new Date(),
      );
      expect(ranged.map((c) => c.sql)).toEqual([
         "s.lastOrderAt >= ?",
         "s.lastOrderAt <= ?",
      ]);
   });

   it("presence filters: include = EXISTS, exclude = NOT EXISTS, over all non-deleted orders", () => {
      const inc = buildCustomerFilterConditions(
         params("orderStatuses=DELIVERED,CANCELLED"),
         null,
         new Date(),
      );
      expect(inc[0].sql).toContain("EXISTS (SELECT 1 FROM `Order` po");
      expect(inc[0].sql).toContain("po.status IN (?,?)");
      expect(inc[0].sql).not.toContain("NOT IN");
      expect(inc[0].values).toEqual(["DELIVERED", "CANCELLED"]);
      const exc = buildCustomerFilterConditions(
         params("orderSources=Facebook&orderSourceMode=exclude"),
         null,
         new Date(),
      );
      expect(exc[0].sql).toContain("NOT EXISTS (SELECT 1 FROM `Order` po");
      expect(exc[0].sql).toContain("po.orderSource IN (?)");
   });

   it("product presence joins Product only when a category is filtered", () => {
      const byProduct = buildCustomerFilterConditions(
         params("productId=p1"),
         null,
         new Date(),
      );
      expect(byProduct[0].sql).toContain("oi.productId = ?");
      expect(byProduct[0].sql).not.toContain("INNER JOIN Product");
      const byCategory = buildCustomerFilterConditions(
         params("categoryId=c1"),
         null,
         new Date(),
      );
      expect(byCategory[0].sql).toContain("INNER JOIN Product p");
      expect(byCategory[0].sql).toContain("p.categoryId = ?");
   });
});

describe("buildCustomerOrderBy (sort allowlist → SQL)", () => {
   it("stat sorts order by the coalesced aggregate with the createdAt tiebreak", () => {
      const sql = buildCustomerOrderBy("totalPurchase", "desc");
      expect(sql.sql).toBe(
         "ORDER BY COALESCE(s.totalPurchase, 0) DESC, c.createdAt DESC, c.id ASC",
      );
      expect(sql.values).toEqual([]);
   });

   it("lastOrderAt keeps nulls last in both directions", () => {
      expect(buildCustomerOrderBy("lastOrderAt", "asc").sql).toContain(
         "ORDER BY (s.lastOrderAt IS NULL) ASC, s.lastOrderAt ASC",
      );
      expect(buildCustomerOrderBy("lastOrderAt", "desc").sql).toContain(
         "ORDER BY (s.lastOrderAt IS NULL) ASC, s.lastOrderAt DESC",
      );
   });

   it("customId sorts numeric-aware (prefix, trailing number, raw)", () => {
      const sql = buildCustomerOrderBy("customId", "asc");
      expect(sql.sql).toContain("REGEXP_REPLACE(COALESCE(c.customId, ''), '[0-9]+$', '') ASC");
      expect(sql.sql).toContain("CAST(REGEXP_SUBSTR(COALESCE(c.customId, ''), '[0-9]+$') AS UNSIGNED) ASC");
   });

   it("name and createdAt map to their columns", () => {
      expect(buildCustomerOrderBy("name", "asc").sql).toContain("ORDER BY c.name ASC");
      expect(buildCustomerOrderBy("createdAt", "desc").sql).toBe(
         "ORDER BY c.createdAt DESC, c.id ASC",
      );
   });
});

describe("fetchCustomerListPage (fake $queryRaw client)", () => {
   const rawRow = (over: Record<string, unknown> = {}) => ({
      id: "c1",
      customId: "CUS_1",
      name: "Rahim",
      email: null,
      phone: "01712345678",
      address: null,
      isDeleted: 0,
      deletedAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
      totalOrders: BigInt(3),
      totalPurchase: "250.5",
      totalPaid: 200,
      totalDue: 50.5,
      lastOrderAt: new Date("2026-11-01T00:00:00Z"),
      deliveredCount: BigInt(2),
      itemQtyTotal: BigInt(7),
      ...over,
   });

   it("maps raw rows to the old response shape, with the delivered/itemQty quirk", async () => {
      const queries: string[] = [];
      const client = {
         $queryRaw: async (q: Prisma.Sql) => {
            queries.push(q.sql);
            if (q.sql.startsWith("SELECT COUNT(*) AS total")) return [{ total: BigInt(1) }];
            return [rawRow()];
         },
      };
      const res = await fetchCustomerListPage(client, params(""));
      expect(res.total).toBe(1);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(20);
      expect(res.segmentMeta).toEqual({ highValueThreshold: null });
      expect(res.customers).toHaveLength(1);
      const c = res.customers[0];
      expect(c.isDeleted).toBe(false);
      expect(c.stats).toEqual({
         totalOrders: 3,
         totalPurchase: 250.5,
         totalPaid: 200,
         totalDue: 50.5,
         lastOrderAt: new Date("2026-11-01T00:00:00Z"),
         status: "Returning",
         // No delivered/itemQty range filter in the request → the
         // old code reported 0 for both even though data exists.
         deliveredCount: 0,
         itemQtyTotal: 0,
      });
      // Exactly two bounded queries: count + one page.
      expect(queries).toHaveLength(2);
      expect(queries[1]).toContain("LIMIT ? OFFSET ?");
   });

   it("populates delivered/itemQty stats only when their filters are present", async () => {
      const client = {
         $queryRaw: async (q: Prisma.Sql) => {
            if (q.sql.startsWith("SELECT COUNT(*) AS total")) return [{ total: BigInt(1) }];
            return [rawRow()];
         },
      };
      const res = await fetchCustomerListPage(
         client,
         params("deliveredOp=gte&deliveredValue=1&itemQtyOp=gte&itemQtyValue=1"),
      );
      expect(res.customers[0].stats.deliveredCount).toBe(2);
      expect(res.customers[0].stats.itemQtyTotal).toBe(7);
   });

   it("highValue: counts spenders, reads the rank row, then filters by it", async () => {
      const seen: Prisma.Sql[] = [];
      const client = {
         $queryRaw: async (q: Prisma.Sql) => {
            seen.push(q);
            if (q.sql.startsWith("SELECT COUNT(*) AS n")) return [{ n: BigInt(5) }];
            if (q.sql.includes("AS spend")) return [{ spend: "150" }];
            if (q.sql.startsWith("SELECT COUNT(*) AS total")) return [{ total: BigInt(2) }];
            return [rawRow(), rawRow({ id: "c2", customId: "CUS_2" })];
         },
      };
      const res = await fetchCustomerListPage(client, params("segment=highValue"));
      expect(res.segmentMeta.highValueThreshold).toBe(150);
      expect(res.total).toBe(2);
      // rank for 5 spenders = ceil(0.8×5) = 4 → OFFSET 3, LIMIT 1.
      const spendQuery = seen.find((q) => q.sql.includes("AS spend"))!;
      expect(spendQuery.sql).toContain("ORDER BY COALESCE(s.totalPurchase, 0) ASC LIMIT 1 OFFSET ?");
      expect(spendQuery.values[spendQuery.values.length - 1]).toBe(3);
      // The page query carries the threshold as a bound condition.
      const pageQuery = seen[seen.length - 1];
      expect(pageQuery.sql).toContain("COALESCE(s.totalPurchase, 0) >= ?");
      expect(pageQuery.values).toContain(150);
   });

   it("highValue with no spenders returns an empty, threshold-less result", async () => {
      const client = {
         $queryRaw: async (q: Prisma.Sql) => {
            if (q.sql.startsWith("SELECT COUNT(*) AS n")) return [{ n: BigInt(0) }];
            if (q.sql.startsWith("SELECT COUNT(*) AS total")) return [{ total: BigInt(0) }];
            return [];
         },
      };
      const res = await fetchCustomerListPage(client, params("segment=highValue"));
      expect(res.total).toBe(0);
      expect(res.customers).toEqual([]);
      expect(res.segmentMeta.highValueThreshold).toBeNull();
   });
});
