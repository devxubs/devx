// The compact number formatter lives in @src/lib/utils
// (formatCompactNumber) — the single shared implementation used by
// Reports, Dashboard and shared components. This module previously
// carried a duplicate Intl-based copy (uppercase "K"); it now simply
// re-exports the shared one so any legacy import from "@src/handler"
// resolves to the same formatter.
export { formatCompactNumber } from "@src/lib/utils";
