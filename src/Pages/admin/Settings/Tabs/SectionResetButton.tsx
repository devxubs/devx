"use client";

import React, { useState } from "react";
import { Button } from "@mui/material";
import Icon from "@src/components/Icon";
import AlertDialog from "@src/components/AlertDialog";

interface SectionResetButtonProps {
   /** Display name of the section, used in the button + dialog. */
   section: string;
   /** Applies the section's defaults to the FORM state. */
   onReset: () => void;
}

/**
 * RP-7 (X2) — per-section reset. Form-state only, like the
 * Invoice tab's existing reset: confirming restores the
 * section's default values in the form, which the RP-4 dirty
 * tracking then treats as ordinary unsaved edits — nothing
 * reaches the server until the user presses Save. Rendered
 * inside the tab content, so the RP-3 read-only fieldset
 * disables it automatically for roles without save permission.
 * The global (server-side) Reset Defaults in the System tab is
 * a separate, unchanged operation.
 */
export default function SectionResetButton({ section, onReset }: SectionResetButtonProps) {
   const [confirmOpen, setConfirmOpen] = useState(false);
   return (
      <>
         <Button
            variant="text"
            color="inherit"
            size="small"
            startIcon={<Icon icon="solar:restart-bold" size="small" />}
            onClick={() => setConfirmOpen(true)}
            sx={{ whiteSpace: "nowrap", flexShrink: 0, alignSelf: "flex-start" }}
         >
            Reset section
         </Button>
         <AlertDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            type="warning"
            title={`Reset the ${section} section to its default values? This changes the form only — nothing is saved until you press Save.`}
            confirmText="Reset section"
            cancelText="Cancel"
            onConfirm={() => {
               onReset();
               setConfirmOpen(false);
            }}
         />
      </>
   );
}
