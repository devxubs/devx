"use client";

// Structured cancellation category capture (Phase 2 ranking, plan
// §4.5 / decision D2 / Step 7).
//
// When an order is transitioned INTO CANCELLED, the acting flow must
// collect one of these categories. The saved `cancellationReason`
// becomes `<TOKEN>: <free text>` — or the bare `<TOKEN>:` when no
// free text was typed. The colon is REQUIRED: the ranking classifier
// (src/lib/ranking/cancellation.ts) matches the lowercased prefixes
// "staff_error:" / "customer:" / "duplicate:" / "system:" at the
// start of the trimmed reason. A bare "CUSTOMER" without the colon
// would NOT match the token branch and would fall through to the
// generic "explicit reason ⇒ attributable" rule — the exact opposite
// of the intent — so this builder always emits the colon.

import React, { useEffect, useState } from "react";
import { Button, MenuItem, Stack, TextField } from "@mui/material";
import CustomModal from "@src/components/Modal";

export type CancellationCategoryToken =
   | "CUSTOMER"
   | "DUPLICATE"
   | "SYSTEM"
   | "STAFF_ERROR";

export const CANCELLATION_CATEGORY_OPTIONS: Array<{
   token: CancellationCategoryToken;
   label: string;
}> = [
   { token: "CUSTOMER", label: "Customer requested" },
   { token: "DUPLICATE", label: "Duplicate order" },
   { token: "SYSTEM", label: "System / courier issue" },
   { token: "STAFF_ERROR", label: "Staff error" },
];

/**
 * Build the stored cancellationReason for a chosen category.
 * Returns undefined when no category is selected (callers treat that
 * as "not a cancellation" and omit the field entirely, leaving any
 * existing reason untouched).
 */
export function buildCancellationReason(
   category: string | null | undefined,
   freeText?: string | null,
): string | undefined {
   if (!category) return undefined;
   const text = (freeText || "").trim();
   return text ? `${category}: ${text}` : `${category}:`;
}

interface CancellationCategoryFieldsProps {
   category: string;
   onCategoryChange: (category: string) => void;
   reasonText: string;
   onReasonTextChange: (text: string) => void;
   disabled?: boolean;
}

export const CancellationCategoryFields: React.FC<
   CancellationCategoryFieldsProps
> = ({
   category,
   onCategoryChange,
   reasonText,
   onReasonTextChange,
   disabled = false,
}) => (
   <Stack spacing={2}>
      <TextField
         select
         required
         size="small"
         fullWidth
         label="Cancellation category"
         value={category}
         disabled={disabled}
         onChange={(e) => onCategoryChange(e.target.value)}
         helperText="Required — who/what caused this cancellation?"
      >
         <MenuItem value="" disabled>
            Select a category…
         </MenuItem>
         {CANCELLATION_CATEGORY_OPTIONS.map((opt) => (
            <MenuItem key={opt.token} value={opt.token}>
               {opt.label}
            </MenuItem>
         ))}
      </TextField>
      <TextField
         size="small"
         fullWidth
         multiline
         minRows={2}
         label="Reason (optional)"
         placeholder="Add any detail, e.g. wrong item sent"
         value={reasonText}
         disabled={disabled}
         onChange={(e) => onReasonTextChange(e.target.value)}
      />
   </Stack>
);

interface CancellationReasonDialogProps {
   open: boolean;
   title?: string;
   confirmLabel?: string;
   onClose: () => void;
   onConfirm: (cancellationReason: string) => void;
}

/**
 * Standalone category prompt for flows that otherwise change status
 * with a single click (Orders Table row status menu, bulk status
 * menu). Confirm stays disabled until a category is chosen — there
 * is deliberately NO default category.
 */
export const CancellationReasonDialog: React.FC<
   CancellationReasonDialogProps
> = ({
   open,
   title = "Cancel order",
   confirmLabel = "Cancel order",
   onClose,
   onConfirm,
}) => {
   const [category, setCategory] = useState("");
   const [reasonText, setReasonText] = useState("");

   // Fresh state every time the dialog opens — never carry one
   // order's category into another order's cancellation.
   useEffect(() => {
      if (open) {
         setCategory("");
         setReasonText("");
      }
   }, [open ]);

   return (
      <CustomModal
         title={title}
         open={open}
         onClose={onClose}
         closeIcon={true}
         size="sm"
      >
         <Stack spacing={2.5} sx={{ pt: 1 }}>
            <CancellationCategoryFields
               category={category}
               onCategoryChange={setCategory}
               reasonText={reasonText}
               onReasonTextChange={setReasonText}
            />
            <Stack direction="row" spacing={2} justifyContent="flex-end">
               <Button variant="text" color="inherit" onClick={onClose}>
                  Back
               </Button>
               <Button
                  variant="contained"
                  color="error"
                  disabled={!category}
                  onClick={() => {
                     const reason = buildCancellationReason(category, reasonText);
                     if (reason) onConfirm(reason);
                  }}
               >
                  {confirmLabel}
               </Button>
            </Stack>
         </Stack>
      </CustomModal>
   );
};

export default CancellationCategoryFields;
