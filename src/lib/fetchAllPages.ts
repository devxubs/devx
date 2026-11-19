// Chunked full-dataset loader for exports and full-catalogue views
// (Phase 5, §5.2 — PERF-03).
//
// Several list APIs cap a single response through parsePagination
// (max 100 rows), while their `?all=true` escape hatch loads up to
// 10,000 rows in ONE response. Export loaders used that hatch, so a
// large export meant one huge payload held entirely in memory on
// both sides. fetchAllPages walks the SAME filtered list endpoint
// in bounded pages instead — identical rows, identical order (the
// endpoints' orderBy is stable), transferred and accumulated in
// chunks. Reports exports have their own equivalent loader
// (reportExport.fetchAllReportRows); this is the general one for
// the entity list APIs.

export interface FetchAllPagesOptions {
   /** Rows per request (the list APIs clamp this to their max, 100). */
   pageSize?: number;
   /** Safety bound against a misbehaving endpoint looping forever. */
   maxPages?: number;
}

/**
 * @param buildUrl  builds the URL for a 1-based page
 * @param pick      extracts the row array from a page response
 * @param totalOf   optional: extracts the endpoint's total count;
 *                  paging stops as soon as it is reached
 */
export async function fetchAllPages<T = any>(
   buildUrl: (page: number, limit: number) => string,
   pick: (data: any) => T[],
   totalOf?: (data: any) => number | undefined,
   options?: FetchAllPagesOptions,
): Promise<T[]> {
   const pageSize = options?.pageSize ?? 100;
   const maxPages = options?.maxPages ?? 200; // 200 × 100 = 20,000 rows
   const all: T[] = [];
   let page = 1;
   while (page <= maxPages) {
      const res = await fetch(buildUrl(page, pageSize));
      if (!res.ok) break;
      const data = await res.json();
      const rows = pick(data) || [];
      all.push(...rows);
      const total = totalOf?.(data);
      if (typeof total === "number" && all.length >= total) break;
      if (rows.length < pageSize) break;
      page += 1;
   }
   return all;
}
