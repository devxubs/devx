// Phase B4b (P1-5): client-side toolbar-search predicate for
// CustomTable pages whose rows are already fully loaded in the
// browser (Bin, Roles, Suppliers, Billing and the Reports detail
// tables). The shared table toolbar writes its term into the
// page-level filter store (`searchText`); pages that load their
// complete row set client-side consume the term through this helper
// instead of a server round-trip — the same consumption pattern the
// Stock tabs, Categories, Unit and User pages already use inline.
//
// Matching rule (identical everywhere it is used): the trimmed,
// lower-cased term must appear as a substring of at least one of the
// row's searched values. Values are stringified, so numeric columns
// (amounts, counts) match their plain decimal form. Null/undefined
// values never match a non-empty term. An empty/blank term matches
// every row, so callers can apply the filter unconditionally.

/** A searched value source: a row key, or an accessor for nested /
 * derived display values (e.g. `row.customer?.name`). */
export type SearchField<T> = string | ((row: T) => unknown);

const valueText = (value: unknown): string => {
   if (value === null || value === undefined) return "";
   return String(value).toLowerCase();
};

/** True when `row` matches the toolbar `term` on any of `fields`. */
export function rowMatchesSearch<T>(
   row: T,
   term: string,
   fields: SearchField<T>[],
): boolean {
   const needle = (term || "").trim().toLowerCase();
   if (!needle) return true;
   return fields.some((field) => {
      const value =
         typeof field === "function"
            ? field(row)
            : (row as Record<string, unknown>)?.[field];
      return valueText(value).includes(needle);
   });
}

/** The subset of `rows` matching the toolbar `term` (all rows when
 * the term is blank). Row order and identity are preserved. */
export function filterRowsBySearch<T>(
   rows: T[],
   term: string,
   fields: SearchField<T>[],
): T[] {
   if (!(term || "").trim()) return rows;
   return rows.filter((row) => rowMatchesSearch(row, term, fields));
}
