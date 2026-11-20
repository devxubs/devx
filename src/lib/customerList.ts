/**
 * Customers list — server-side stats pagination (Phase B4a, P1-13).
 *
 * Until this phase GET /api/customers honoured `?all=true`: it loaded
 * the ENTIRE matched customer population plus a groupBy over all
 * matched orders, computed the derived stats (totalOrders,
 * totalPurchase, totalPaid, totalDue, lastOrderAt, New/Returning) in
 * memory, filtered by segment / status / ranges / presence, sorted
 * (including by the derived stats) and paginated by slicing — with a
 * silent truncation at 10,000 rows. The Customers page sent
 * `all=true` precisely because the derived-stat filters had to run
 * before pagination to keep `total` accurate.
 *
 * This module moves that whole computation into the database with
 * ONE aggregated raw-SQL shape (the codebase's audited-safe
 * tagged-template `$queryRaw` pattern, extended with Prisma.sql
 * fragments):
 *
 *   Customer c
 *   LEFT JOIN (valid-order aggregates per customer)      s
 *   LEFT JOIN (delivered-order count per customer)       d
 *   LEFT JOIN (purchased item quantity per customer)     iq
 *   WHERE  <base + derived-stat + presence conditions>
 *   ORDER BY <allowlisted sort, incl. stat columns>
 *   LIMIT ? OFFSET ?          + a parallel COUNT(*) query
 *
 * "Valid orders" are the ONE canonical definition in
 * lib/orderStatus (Phase B1): not soft-deleted and status ∉
 * {CANCELLED, FAILED}. Every value that comes from the caller is a
 * BOUND parameter; the only interpolated pieces are identifiers and
 * keywords taken from this module's own constants / allowlists
 * (sort field → expression map, ASC/DESC from a boolean).
 *
 * Behaviour preserved exactly from the in-memory implementation:
 *  - the same query params, filter semantics (AND), range ops
 *    (including the `eq` tolerance |v − x| < 0.005 and `between`
 *    min/max normalisation), presence filters (order status/source
 *    over ALL non-deleted orders; product/category/employee over
 *    valid orders only), and sort orders (lastOrderAt nulls always
 *    last, in both directions);
 *  - High Value: lifetime spend at or above the nearest-rank 80th
 *    percentile of the spenders (totalPurchase > 0) in the matched
 *    population — where "matched" means after the DB-level
 *    search/phone/registration filters AND the New/Returning status
 *    filter, but before every other derived filter (the old code
 *    computed the threshold at exactly that point). The threshold
 *    is fetched with two bounded queries (a COUNT of spenders, then
 *    one row at OFFSET rank−1) — never by loading the spends;
 *  - Inactive: has a valid order, but the latest is older than
 *    90 days;
 *  - the response shape { customers: [{...customer, stats}], total,
 *    page, limit, segmentMeta: { highValueThreshold } }, including
 *    the historical quirk that stats.deliveredCount /
 *    stats.itemQtyTotal are only populated when the corresponding
 *    range filter is present in the request (0 otherwise) — the
 *    aggregates are always computed for filtering, but the old
 *    response values are preserved.
 */
import { Prisma } from "@prisma/client";
import {
   INVALID_ORDER_STATUSES,
   DELIVERED_ORDER_STATUSES,
} from "./orderStatus";
import { parsePagination } from "./pagination";

export const INACTIVE_WINDOW_DAYS = 90;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// ── Query-parameter parsing (pure) ─────────────────────────────────────

export type RangeOp = "eq" | "gt" | "gte" | "lt" | "lte" | "between";

export interface RangeCheck {
   op: RangeOp;
   v1: number;
   v2: number | null;
}

/** Parse an ISO date param; a bare YYYY-MM-DD gets day boundaries applied. */
export function parseDateParam(
   raw: string | null,
   boundary: "start" | "end",
): Date | null {
   if (!raw) return null;
   const trimmed = raw.trim();
   if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = new Date(
         `${trimmed}T${boundary === "end" ? "23:59:59.999" : "00:00:00.000"}`,
      );
      return isNaN(d.getTime()) ? null : d;
   }
   const d = new Date(trimmed);
   return isNaN(d.getTime()) ? null : d;
}

/** Read a generic range filter: {prefix}Op, {prefix}Value, {prefix}Value2. */
export function getRangeCheck(
   searchParams: URLSearchParams,
   prefix: string,
): RangeCheck | null {
   const op = searchParams.get(`${prefix}Op`);
   const raw1 = searchParams.get(`${prefix}Value`);
   if (!op || raw1 === null || raw1 === "") return null;
   if (!["eq", "gt", "gte", "lt", "lte", "between"].includes(op)) return null;
   const v1 = Number(raw1);
   if (Number.isNaN(v1)) return null;
   let v2: number | null = null;
   if (op === "between") {
      const raw2 = searchParams.get(`${prefix}Value2`);
      if (raw2 === null || raw2 === "") return null;
      v2 = Number(raw2);
      if (Number.isNaN(v2)) return null;
   }
   return { op: op as RangeOp, v1, v2 };
}

/** The old in-memory range predicate — kept as the semantic reference. */
export function matchesRange(value: number, check: RangeCheck): boolean {
   switch (check.op) {
      case "eq":
         return Math.abs(value - check.v1) < 0.005;
      case "gt":
         return value > check.v1;
      case "gte":
         return value >= check.v1;
      case "lt":
         return value < check.v1;
      case "lte":
         return value <= check.v1;
      case "between": {
         const lo = Math.min(check.v1, check.v2 ?? check.v1);
         const hi = Math.max(check.v1, check.v2 ?? check.v1);
         return value >= lo && value <= hi;
      }
      default:
         return true;
   }
}

export const CUSTOMER_SORT_FIELDS = [
   "name",
   "customId",
   "createdAt",
   "totalOrders",
   "totalPurchase",
   "totalPaid",
   "totalDue",
   "lastOrderAt",
] as const;

export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];

export type StatField =
   | "totalOrders"
   | "totalPurchase"
   | "totalPaid"
   | "totalDue";

export interface CustomerListParams {
   page: number;
   limit: number;
   skip: number;
   search: string;
   phoneFilter: string;
   regFrom: Date | null;
   regTo: Date | null;
   /** "new" | "returning" | null — the derived New/Returning status. */
   status: string | null;
   /** "highValue" | "inactive" | null (any other value = no segment). */
   segment: string | null;
   rangeChecks: { field: StatField; check: RangeCheck }[];
   deliveredCheck: RangeCheck | null;
   itemQtyCheck: RangeCheck | null;
   neverOrdered: boolean;
   lastFrom: Date | null;
   lastTo: Date | null;
   orderStatusList: string[];
   orderStatusExclude: boolean;
   orderSourceList: string[];
   orderSourceExclude: boolean;
   productId: string;
   categoryId: string;
   employeeId: string;
   sortBy: CustomerSortField;
   sortDir: "asc" | "desc";
}

const parseList = (raw: string | null): string[] =>
   (raw || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");

/**
 * Parse every list query param exactly as the old route did.
 * `all` / `export` are deliberately NOT read: the full-population
 * hatch is retired and pagination is always bounded by
 * parsePagination (default 20, max 100).
 */
export function parseCustomerListParams(
   searchParams: URLSearchParams,
): CustomerListParams {
   const { page, limit, skip } = parsePagination(searchParams, 20);

   const rangeChecks: CustomerListParams["rangeChecks"] = [];
   const rangeParamMap: { prefix: string; field: StatField }[] = [
      { prefix: "orders", field: "totalOrders" },
      { prefix: "purchase", field: "totalPurchase" },
      { prefix: "paid", field: "totalPaid" },
      { prefix: "due", field: "totalDue" },
   ];
   for (const { prefix, field } of rangeParamMap) {
      const check = getRangeCheck(searchParams, prefix);
      if (check) rangeChecks.push({ field, check });
   }

   const sortByParam = searchParams.get("sortBy") || "";
   const sortBy = (CUSTOMER_SORT_FIELDS as readonly string[]).includes(
      sortByParam,
   )
      ? (sortByParam as CustomerSortField)
      : "createdAt";

   return {
      page,
      limit,
      skip,
      search: searchParams.get("search")?.trim() || "",
      phoneFilter: (searchParams.get("phoneFilter") || "").replace(
         /[\s-]/g,
         "",
      ),
      regFrom: parseDateParam(searchParams.get("regFrom"), "start"),
      regTo: parseDateParam(searchParams.get("regTo"), "end"),
      status: searchParams.get("status"),
      segment: searchParams.get("segment"),
      rangeChecks,
      deliveredCheck: getRangeCheck(searchParams, "delivered"),
      itemQtyCheck: getRangeCheck(searchParams, "itemQty"),
      neverOrdered: searchParams.get("neverOrdered") === "1",
      lastFrom: parseDateParam(searchParams.get("lastFrom"), "start"),
      lastTo: parseDateParam(searchParams.get("lastTo"), "end"),
      orderStatusList: parseList(searchParams.get("orderStatuses")),
      orderStatusExclude: searchParams.get("orderStatusMode") === "exclude",
      orderSourceList: parseList(searchParams.get("orderSources")),
      orderSourceExclude: searchParams.get("orderSourceMode") === "exclude",
      productId: searchParams.get("productId") || "",
      categoryId: searchParams.get("categoryId") || "",
      employeeId: searchParams.get("employeeId") || "",
      sortBy,
      sortDir: searchParams.get("sortDir") === "asc" ? "asc" : "desc",
   };
}

// ── High Value percentile (pure) ───────────────────────────────────────

/** Nearest-rank position (1-based) of the 80th percentile. */
export function highValueRank(spenderCount: number): number {
   return Math.max(1, Math.ceil(0.8 * spenderCount));
}

/**
 * The old in-memory threshold: nearest-rank 80th percentile of the
 * matched population's positive spends, or null when nobody spent.
 * Kept as the semantic reference (and used by the tests to prove the
 * SQL OFFSET approach lands on the same value).
 */
export function highValueThresholdFromSpends(
   spends: number[],
): number | null {
   const positive = spends.filter((v) => v > 0).sort((a, b) => a - b);
   if (positive.length === 0) return null;
   return positive[highValueRank(positive.length) - 1];
}

// ── SQL construction ───────────────────────────────────────────────────

const dirSql = (dir: "asc" | "desc") =>
   Prisma.raw(dir === "asc" ? "ASC" : "DESC");

/**
 * SQL twin of matchesRange over a column expression. `eq` keeps the
 * old ±0.005 tolerance; `between` normalises min/max like the JS did.
 */
export function rangeConditionSql(
   column: Prisma.Sql,
   check: RangeCheck,
): Prisma.Sql {
   switch (check.op) {
      case "eq":
         return Prisma.sql`ABS(${column} - ${check.v1}) < 0.005`;
      case "gt":
         return Prisma.sql`${column} > ${check.v1}`;
      case "gte":
         return Prisma.sql`${column} >= ${check.v1}`;
      case "lt":
         return Prisma.sql`${column} < ${check.v1}`;
      case "lte":
         return Prisma.sql`${column} <= ${check.v1}`;
      case "between": {
         const v2 = check.v2 ?? check.v1;
         return Prisma.sql`${column} BETWEEN LEAST(${check.v1}, ${v2}) AND GREATEST(${check.v1}, ${v2})`;
      }
   }
}

const STAT_COLUMN: Record<StatField, Prisma.Sql> = {
   totalOrders: Prisma.raw("COALESCE(s.totalOrders, 0)"),
   totalPurchase: Prisma.raw("COALESCE(s.totalPurchase, 0)"),
   totalPaid: Prisma.raw("COALESCE(s.totalPaid, 0)"),
   totalDue: Prisma.raw("COALESCE(s.totalDue, 0)"),
};

/** Aggregated valid-order stats per customer (canonical definition). */
const STATS_JOIN = Prisma.sql`
   LEFT JOIN (
      SELECT customerId,
             COUNT(*) AS totalOrders,
             COALESCE(SUM(total), 0) AS totalPurchase,
             COALESCE(SUM(advancePayment), 0) AS totalPaid,
             COALESCE(SUM(dueAmount), 0) AS totalDue,
             MAX(createdAt) AS lastOrderAt
      FROM \`Order\`
      WHERE isDeleted = 0
        AND status NOT IN (${Prisma.join([...INVALID_ORDER_STATUSES])})
        AND customerId IS NOT NULL
      GROUP BY customerId
   ) s ON s.customerId = c.id`;

const DELIVERED_JOIN = Prisma.sql`
   LEFT JOIN (
      SELECT customerId, COUNT(*) AS deliveredCount
      FROM \`Order\`
      WHERE isDeleted = 0
        AND status IN (${Prisma.join([...DELIVERED_ORDER_STATUSES])})
        AND customerId IS NOT NULL
      GROUP BY customerId
   ) d ON d.customerId = c.id`;

const ITEM_QTY_JOIN = Prisma.sql`
   LEFT JOIN (
      SELECT o.customerId AS customerId,
             COALESCE(SUM(oi.quantity), 0) AS itemQtyTotal
      FROM OrderItem oi
      INNER JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.isDeleted = 0
        AND o.status NOT IN (${Prisma.join([...INVALID_ORDER_STATUSES])})
        AND o.customerId IS NOT NULL
      GROUP BY o.customerId
   ) iq ON iq.customerId = c.id`;

/**
 * DB-level conditions (search / phone / registration range) — these
 * defined the "matched population" in the old code too, and they are
 * the population the High Value threshold is computed over.
 */
export function buildCustomerBaseConditions(
   params: CustomerListParams,
): Prisma.Sql[] {
   const conditions: Prisma.Sql[] = [Prisma.sql`c.isDeleted = 0`];
   if (params.search) {
      const pattern = `%${params.search}%`;
      conditions.push(
         Prisma.sql`(c.name LIKE ${pattern} OR c.phone LIKE ${pattern} OR c.email LIKE ${pattern} OR c.customId LIKE ${pattern})`,
      );
   }
   if (params.phoneFilter) {
      conditions.push(
         Prisma.sql`c.phone LIKE ${`%${params.phoneFilter}%`}`,
      );
   }
   if (params.regFrom) {
      conditions.push(Prisma.sql`c.createdAt >= ${params.regFrom}`);
   }
   if (params.regTo) {
      conditions.push(Prisma.sql`c.createdAt <= ${params.regTo}`);
   }
   return conditions;
}

/** The derived New/Returning status condition (also part of the
 *  High Value threshold population, as in the old code). */
export function buildCustomerStatusCondition(
   params: CustomerListParams,
): Prisma.Sql | null {
   if (params.status === "new") {
      return Prisma.sql`${STAT_COLUMN.totalOrders} <= 1`;
   }
   if (params.status === "returning") {
      return Prisma.sql`${STAT_COLUMN.totalOrders} > 1`;
   }
   return null;
}

function presenceCondition(
   values: string[],
   exclude: boolean,
   field: "status" | "orderSource",
): Prisma.Sql {
   // `field` comes from this module's own two-value union, never
   // from user input; the values are bound parameters.
   const column = field === "status" ? Prisma.raw("po.status") : Prisma.raw("po.orderSource");
   const exists = Prisma.sql`EXISTS (SELECT 1 FROM \`Order\` po WHERE po.customerId = c.id AND po.isDeleted = 0 AND ${column} IN (${Prisma.join(values)}))`;
   return exclude ? Prisma.sql`NOT ${exists}` : exists;
}

/**
 * Every remaining filter condition (everything except the base and
 * status conditions, which are built separately because the High
 * Value threshold population needs exactly those two). `threshold`
 * is the already-computed High Value threshold (segment=highValue
 * only); `now` anchors the Inactive window.
 */
export function buildCustomerFilterConditions(
   params: CustomerListParams,
   threshold: number | null,
   now: Date,
): Prisma.Sql[] {
   const conditions: Prisma.Sql[] = [];

   if (params.segment === "highValue") {
      // A null threshold means no spenders in the population; the
      // old code returned an empty list in that case.
      conditions.push(
         threshold === null
            ? Prisma.sql`1 = 0`
            : Prisma.sql`${STAT_COLUMN.totalPurchase} >= ${threshold}`,
      );
   } else if (params.segment === "inactive") {
      const cutoff = new Date(
         now.getTime() - INACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
      );
      conditions.push(
         Prisma.sql`s.lastOrderAt IS NOT NULL AND s.lastOrderAt < ${cutoff}`,
      );
   }

   for (const { field, check } of params.rangeChecks) {
      conditions.push(rangeConditionSql(STAT_COLUMN[field], check));
   }

   if (params.neverOrdered) {
      conditions.push(Prisma.sql`s.lastOrderAt IS NULL`);
   } else {
      if (params.lastFrom) {
         conditions.push(Prisma.sql`s.lastOrderAt >= ${params.lastFrom}`);
      }
      if (params.lastTo) {
         conditions.push(Prisma.sql`s.lastOrderAt <= ${params.lastTo}`);
      }
   }

   if (params.deliveredCheck) {
      conditions.push(
         rangeConditionSql(
            Prisma.raw("COALESCE(d.deliveredCount, 0)"),
            params.deliveredCheck,
         ),
      );
   }
   if (params.itemQtyCheck) {
      conditions.push(
         rangeConditionSql(
            Prisma.raw("COALESCE(iq.itemQtyTotal, 0)"),
            params.itemQtyCheck,
         ),
      );
   }

   // Presence filters over ALL non-deleted orders (a CANCELLED-status
   // filter must be able to match), exactly as before.
   if (params.orderStatusList.length > 0) {
      conditions.push(
         presenceCondition(
            params.orderStatusList,
            params.orderStatusExclude,
            "status",
         ),
      );
   }
   if (params.orderSourceList.length > 0) {
      conditions.push(
         presenceCondition(
            params.orderSourceList,
            params.orderSourceExclude,
            "orderSource",
         ),
      );
   }

   // Product / category presence via order items (valid orders only).
   if (params.productId || params.categoryId) {
      const itemConditions: Prisma.Sql[] = [
         Prisma.sql`o.customerId = c.id`,
         Prisma.sql`o.isDeleted = 0`,
         Prisma.sql`o.status NOT IN (${Prisma.join([...INVALID_ORDER_STATUSES])})`,
      ];
      if (params.productId) {
         itemConditions.push(Prisma.sql`oi.productId = ${params.productId}`);
      }
      if (params.categoryId) {
         itemConditions.push(Prisma.sql`p.categoryId = ${params.categoryId}`);
      }
      const productJoin = params.categoryId
         ? Prisma.sql` INNER JOIN Product p ON p.id = oi.productId`
         : Prisma.empty;
      conditions.push(
         Prisma.sql`EXISTS (SELECT 1 FROM OrderItem oi INNER JOIN \`Order\` o ON o.id = oi.orderId${productJoin} WHERE ${Prisma.join(itemConditions, " AND ")})`,
      );
   }

   // Employee presence (orders carry employeeId = creating user;
   // valid orders only, as before).
   if (params.employeeId) {
      conditions.push(
         Prisma.sql`EXISTS (SELECT 1 FROM \`Order\` eo WHERE eo.customerId = c.id AND eo.isDeleted = 0 AND eo.status NOT IN (${Prisma.join([...INVALID_ORDER_STATUSES])}) AND eo.employeeId = ${params.employeeId})`,
      );
   }

   return conditions;
}

/**
 * ORDER BY for an allowlisted sort field. The old code sorted the
 * matched array (itself ordered by createdAt DESC from findMany)
 * with a stable sort, so ties kept createdAt-DESC order — the
 * secondary key reproduces that; the final id key only breaks
 * createdAt ties the old code left to database order anyway, and
 * keeps page boundaries deterministic.
 */
export function buildCustomerOrderBy(
   sortBy: CustomerSortField,
   sortDir: "asc" | "desc",
): Prisma.Sql {
   const dir = dirSql(sortDir);
   const tiebreak = Prisma.sql`, c.createdAt DESC, c.id ASC`;
   switch (sortBy) {
      case "name":
         return Prisma.sql`ORDER BY c.name ${dir}${tiebreak}`;
      case "customId": {
         // The old code used localeCompare with numeric:true, so
         // CUS_2 sorts before CUS_10. Emulate the numeric-aware
         // ordering by comparing the non-numeric prefix, then the
         // trailing number as an integer, then the raw value. A
         // missing customId behaved as "" (smallest): its prefix is
         // "" and its number is NULL, which MySQL orders first in
         // ASC and last in DESC — the same outcome.
         const prefix = Prisma.raw(
            "REGEXP_REPLACE(COALESCE(c.customId, ''), '[0-9]+$', '')",
         );
         const num = Prisma.raw(
            "CAST(REGEXP_SUBSTR(COALESCE(c.customId, ''), '[0-9]+$') AS UNSIGNED)",
         );
         return Prisma.sql`ORDER BY ${prefix} ${dir}, ${num} ${dir}, c.customId ${dir}${tiebreak}`;
      }
      case "createdAt":
         return Prisma.sql`ORDER BY c.createdAt ${dir}, c.id ASC`;
      case "lastOrderAt":
         // Null lastOrderAt always sorts last, in both directions.
         return Prisma.sql`ORDER BY (s.lastOrderAt IS NULL) ASC, s.lastOrderAt ${dir}${tiebreak}`;
      case "totalOrders":
      case "totalPurchase":
      case "totalPaid":
      case "totalDue":
         return Prisma.sql`ORDER BY ${STAT_COLUMN[sortBy]} ${dir}${tiebreak}`;
   }
}

// ── Execution ──────────────────────────────────────────────────────────

export interface CustomerListStats {
   totalOrders: number;
   totalPurchase: number;
   totalPaid: number;
   totalDue: number;
   lastOrderAt: Date | null;
   status: "New" | "Returning";
   deliveredCount: number;
   itemQtyTotal: number;
}

export interface CustomerListRow {
   id: string;
   customId: string | null;
   name: string;
   email: string | null;
   phone: string | null;
   address: string | null;
   isDeleted: boolean;
   deletedAt: Date | null;
   createdAt: Date;
   updatedAt: Date;
   stats: CustomerListStats;
}

export interface CustomerListResult {
   customers: CustomerListRow[];
   total: number;
   page: number;
   limit: number;
   segmentMeta: { highValueThreshold: number | null };
}

type RawCustomerRow = {
   id: string;
   customId: string | null;
   name: string;
   email: string | null;
   phone: string | null;
   address: string | null;
   isDeleted: unknown;
   deletedAt: Date | string | null;
   createdAt: Date | string;
   updatedAt: Date | string;
   totalOrders: unknown;
   totalPurchase: unknown;
   totalPaid: unknown;
   totalDue: unknown;
   lastOrderAt: Date | string | null;
   deliveredCount: unknown;
   itemQtyTotal: unknown;
};

const toDate = (v: Date | string | null): Date | null =>
   v === null || v === undefined ? null : v instanceof Date ? v : new Date(v);

function mapRawRow(raw: RawCustomerRow, params: CustomerListParams): CustomerListRow {
   const totalOrders = Number(raw.totalOrders ?? 0);
   return {
      id: raw.id,
      customId: raw.customId ?? null,
      name: raw.name,
      email: raw.email ?? null,
      phone: raw.phone ?? null,
      address: raw.address ?? null,
      isDeleted: Boolean(Number(raw.isDeleted ?? 0)),
      deletedAt: toDate(raw.deletedAt),
      createdAt: toDate(raw.createdAt) as Date,
      updatedAt: toDate(raw.updatedAt) as Date,
      stats: {
         totalOrders,
         totalPurchase: round2(Number(raw.totalPurchase ?? 0)),
         totalPaid: round2(Number(raw.totalPaid ?? 0)),
         totalDue: round2(Number(raw.totalDue ?? 0)),
         lastOrderAt: toDate(raw.lastOrderAt),
         status: totalOrders > 1 ? "Returning" : "New",
         // Historical response quirk, preserved: these two stats
         // were only computed (and thus non-zero) when the matching
         // range filter was present in the request.
         deliveredCount: params.deliveredCheck
            ? Number(raw.deliveredCount ?? 0)
            : 0,
         itemQtyTotal: params.itemQtyCheck
            ? Number(raw.itemQtyTotal ?? 0)
            : 0,
      },
   };
}

/**
 * Run the paginated customers list against any Prisma-like client
 * (the app's singleton, or a test client). All filtering, segment
 * filtering, sorting and pagination happen in the database; the
 * returned page is bounded by params.limit.
 */
export async function fetchCustomerListPage(
   client: { $queryRaw: (query: Prisma.Sql) => Promise<unknown> },
   params: CustomerListParams,
   now: Date = new Date(),
): Promise<CustomerListResult> {
   const baseConditions = buildCustomerBaseConditions(params);
   const statusCondition = buildCustomerStatusCondition(params);
   const populationConditions = statusCondition
      ? [...baseConditions, statusCondition]
      : baseConditions;

   // High Value threshold over the matched population (base +
   // status conditions only — the old code's exact scope), via two
   // bounded queries: count the spenders, then read the single
   // spend at the nearest-rank position.
   let highValueThreshold: number | null = null;
   if (params.segment === "highValue") {
      const populationFrom = Prisma.sql`FROM Customer c ${STATS_JOIN} WHERE ${Prisma.join(populationConditions, " AND ")} AND ${STAT_COLUMN.totalPurchase} > 0`;
      const countRows = (await client.$queryRaw(
         Prisma.sql`SELECT COUNT(*) AS n ${populationFrom}`,
      )) as { n: unknown }[];
      const spenderCount = Number(countRows[0]?.n ?? 0);
      if (spenderCount > 0) {
         const offset = highValueRank(spenderCount) - 1;
         const thresholdRows = (await client.$queryRaw(
            Prisma.sql`SELECT ${STAT_COLUMN.totalPurchase} AS spend ${populationFrom} ORDER BY ${STAT_COLUMN.totalPurchase} ASC LIMIT 1 OFFSET ${offset}`,
         )) as { spend: unknown }[];
         highValueThreshold =
            thresholdRows.length > 0
               ? round2(Number(thresholdRows[0].spend ?? 0))
               : null;
      }
   }

   const conditions = [
      ...populationConditions,
      ...buildCustomerFilterConditions(params, highValueThreshold, now),
   ];
   const fromWhere = Prisma.sql`FROM Customer c ${STATS_JOIN} ${DELIVERED_JOIN} ${ITEM_QTY_JOIN} WHERE ${Prisma.join(conditions, " AND ")}`;

   const countRows = (await client.$queryRaw(
      Prisma.sql`SELECT COUNT(*) AS total ${fromWhere}`,
   )) as { total: unknown }[];
   const total = Number(countRows[0]?.total ?? 0);

   const rawRows = (await client.$queryRaw(
      Prisma.sql`SELECT c.id, c.customId, c.name, c.email, c.phone, c.address,
             c.isDeleted, c.deletedAt, c.createdAt, c.updatedAt,
             COALESCE(s.totalOrders, 0) AS totalOrders,
             COALESCE(s.totalPurchase, 0) AS totalPurchase,
             COALESCE(s.totalPaid, 0) AS totalPaid,
             COALESCE(s.totalDue, 0) AS totalDue,
             s.lastOrderAt AS lastOrderAt,
             COALESCE(d.deliveredCount, 0) AS deliveredCount,
             COALESCE(iq.itemQtyTotal, 0) AS itemQtyTotal
      ${fromWhere}
      ${buildCustomerOrderBy(params.sortBy, params.sortDir)}
      LIMIT ${params.limit} OFFSET ${params.skip}`,
   )) as RawCustomerRow[];

   return {
      customers: rawRows.map((r) => mapRawRow(r, params)),
      total,
      page: params.page,
      limit: params.limit,
      segmentMeta: { highValueThreshold },
   };
}
