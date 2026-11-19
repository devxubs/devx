// Chunked full-dataset loader for exports and full-catalogue views
// (Phase 5, §5.2 — PERF-03).
//
// Several list APIs cap a single response through parsePagination
// (max 100 rows); the old `?all=true` escape hatch loaded up to
// 10,000 rows in ONE response (removed in the follow-up round —
// exports now walk the SAME filtered list endpoint in bounded
// pages instead: identical rows, identical order (the endpoints'
// orderBy is stable), transferred and accumulated in chunks.
// Reports exports have their own equivalent loader
// (reportExport.fetchAllReportRows); this is the general one for
// the entity list APIs.
//
// Failure contract (follow-up round): a failed page request THROWS.
// The previous break-on-error behaviour returned whatever partial
// rows had accumulated, and the export UI then labelled that
// partial set "All Matching Records". Callers surface the thrown
// error as an export failure instead.

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
      if (!res.ok) {
         throw new Error(
            `Failed to load page ${page} of the export data (HTTP ${res.status}). Export stopped — no partial data was used.`,
         );
      }
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
