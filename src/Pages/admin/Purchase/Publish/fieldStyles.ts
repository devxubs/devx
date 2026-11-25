// Purchase Create (refinement) — page-scoped field sizing.
//
// The redesign used stock MUI field sizes, which read small against
// the wider layout. These sx objects make THIS page's fields
// roomier (taller, larger text, more internal padding) without
// touching the theme or any shared component — every style here is
// applied only inside the Purchase Publish page.

/** Primary single-line fields: Purchase ID, Supplier Invoice, date (via a wrapper Box). ~58px tall. */
export const roomyInputSx = {
   "& .MuiOutlinedInput-root": { minHeight: 58 },
   "& .MuiInputBase-input": { fontSize: "0.95rem", py: "17px" },
};

/** Autocomplete fields (supplier picker, product search). ~58px tall, chips keep their natural size. */
export const roomyAutocompleteSx = {
   "& .MuiOutlinedInput-root": { minHeight: 58, py: "7px" },
   "& .MuiInputBase-input": { fontSize: "0.95rem" },
};

/** Summary money inputs (Others Cost, Discount, Paid). ~48px tall, right-aligned to match the read-only values. */
export const roomyMoneyInputSx = {
   "& .MuiOutlinedInput-root": { minHeight: 48 },
   "& .MuiInputBase-input": {
      fontSize: "0.95rem",
      py: "12px",
      textAlign: "right",
   },
};

/** Items-table inline editors (quantity, price). ~44px tall — comfortable without bloating row height. */
export const tableInputSx = {
   "& .MuiOutlinedInput-root": { minHeight: 44 },
   "& .MuiInputBase-input": { fontSize: "0.9rem", py: "10px" },
};

/** Purchase Notes textarea — more internal padding and line height. */
export const roomyTextareaSx = {
   "& .MuiOutlinedInput-root": { p: "16px" },
   "& .MuiInputBase-input": { fontSize: "0.95rem", lineHeight: 1.65 },
};
