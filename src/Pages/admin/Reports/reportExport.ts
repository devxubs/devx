// Reports — shared export data loader (Phase 2, §2.8).
//
// Every report tab's table displays the first page (100 rows) of its
// filtered report, while its headline totals describe the complete
// filtered dataset. Before Phase 2 the tables' Export buttons exported
// only those displayed rows, so an export silently disagreed with the
// totals on screen. fetchAllReportRows pages through GET /api/reports
// with the tab's ACTIVE params (tab + date range) and returns the
// complete filtered row set for export — in bounded pages of the API's
// maximum page size (1000), never one unbounded request.
//
// Failure contract (follow-up round): a failed page request THROWS,
// like fetchAllPages. The previous break-on-error behaviour returned
// partial rows that the export UI labelled as the complete set.

export async function fetchAllReportRows(
   baseParams: URLSearchParams,
   pick: (data: any) => any[],
): Promise<any[]> {
   const pageSize = 1000; // reports API maximum page size
   const all: any[] = [];
   let page = 1;
   // Safety bound: 50 pages = 50,000 rows, far beyond any single
   // report's plausible size; the loop normally ends on a short page.
   while (page <= 50) {
      const params = new URLSearchParams(baseParams);
      params.set("page", String(page));
      params.set("limit", String(pageSize));
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) {
         throw new Error(
            `Failed to load page ${page} of the report export data (HTTP ${res.status}). Export stopped — no partial data was used.`,
         );
      }
      const data = await res.json();
      const rows = pick(data) || [];
      all.push(...rows);
      if (rows.length < pageSize) break;
      page += 1;
   }
   return all;
}

/** Build the base params for a tab, including its active date range. */
export function reportParams(
   tab: string,
   dateRange?: [Date | null, Date | null],
): URLSearchParams {
   const params = new URLSearchParams();
   params.set("tab", tab);
   if (dateRange?.[0]) params.set("startDate", dateRange[0].toISOString());
   if (dateRange?.[1]) params.set("endDate", dateRange[1].toISOString());
   return params;
}
