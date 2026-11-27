// RP-4: dirty-state comparison for the Settings form.
//
// The Settings Layout keeps the last loaded/saved settings as a
// baseline snapshot and compares the live form values against it
// to drive the unsaved-changes indicator, the Discard flow and
// the beforeunload warning. The comparison is structural (deep)
// with two deliberate tolerances that match how the form works:
//
// - Numeric tolerance: number inputs hand back strings ("10")
//   for values the API stores as numbers (10). Typing the same
//   number that is already saved must not read as a change, and
//   reverting a numeric field must clear the dirty state.
// - Undefined tolerance: a key holding `undefined` and a missing
//   key are the same thing (spreads and JSON round-trips drop
//   undefined-valued keys freely).
//
// Everything else is strict — including array order, which is
// load-bearing for settings like the Phase 2 order-status order.

function isNumericLike(value: unknown): boolean {
   if (typeof value === "number") return Number.isFinite(value);
   if (typeof value === "string" && value.trim() !== "") {
      return Number.isFinite(Number(value));
   }
   return false;
}

export function settingsValuesEqual(a: unknown, b: unknown): boolean {
   if (a === b) return true;
   if (
      typeof a === "number" &&
      typeof b === "number" &&
      Number.isNaN(a) &&
      Number.isNaN(b)
   ) {
      return true;
   }
   if (isNumericLike(a) && isNumericLike(b)) {
      return Number(a) === Number(b);
   }
   // undefined and missing keys are equivalent; null only equals
   // null/undefined here (null vs an object is a real change).
   if (a == null || b == null) return a == null && b == null;

   if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      return a.every((item, i) => settingsValuesEqual(item, b[i]));
   }

   if (typeof a === "object" && typeof b === "object") {
      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;
      const aKeys = Object.keys(aObj).filter((k) => aObj[k] !== undefined);
      const bKeys = Object.keys(bObj).filter((k) => bObj[k] !== undefined);
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every(
         (k) => k in bObj && settingsValuesEqual(aObj[k], bObj[k]),
      );
   }

   return false;
}

// True when the form holds edits that differ from the baseline.
// A missing baseline (initial load/hydration) is never dirty.
export function isSettingsFormDirty(
   formValues: unknown,
   baseline: unknown,
): boolean {
   if (!formValues || !baseline) return false;
   return !settingsValuesEqual(formValues, baseline);
}
