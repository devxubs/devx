/**
 * Shared list-pagination parsing (QA fix B3).
 *
 * The list GET handlers used to parse `page`/`limit` inline as
 * `Math.min(parseInt(param), 100)` — an upper clamp with no lower
 * bound and no NaN guard, so `limit=-5` reached Prisma as a negative
 * `take` (silently returning the last rows) and `limit=abc` produced
 * NaN skip/take and a 500. This helper is the single defensive
 * parser:
 *
 * - non-numeric or missing `page` → 1; `page` is never below 1
 * - non-numeric or missing `limit` → the endpoint's default
 * - `limit` is clamped to [1, maxLimit]
 *
 * maxLimit defaults to 100: the shared table's server-pagination
 * page-size options top out at 100 ([10, 25, 50, 100] in
 * src/components/Table), so no legitimate UI request is affected.
 * Exports page through the list endpoints with this helper via
 * fetchAllPages. The customers list was the last exception (it
 * honoured `?all=true` because its derived-stat filters ran in
 * memory before paging); Phase B4a (P1-13) moved those filters
 * into SQL (lib/customerList), so it is paginated with this helper
 * like every other list and `?all=true` is retired there too.
 */
export function parsePagination(
   searchParams: URLSearchParams,
   defaultLimit = 20,
   maxLimit = 100,
): { page: number; limit: number; skip: number } {
   const rawPage = parseInt(searchParams.get("page") || "", 10);
   const page = Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage);
   const rawLimit = parseInt(searchParams.get("limit") || "", 10);
   const limit = Number.isNaN(rawLimit)
      ? defaultLimit
      : Math.min(maxLimit, Math.max(1, rawLimit));
   return { page, limit, skip: (page - 1) * limit };
}
