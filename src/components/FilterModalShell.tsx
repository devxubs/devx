"use client";

import React from "react";
import {
   Box,
   Button,
   CircularProgress,
   Divider,
   Stack,
   alpha,
} from "@mui/material";
import CustomModal from "@src/components/Modal";

// Phase 2 (2.12): shared shell for filter modals, extracted from the
// Customers filter modal (the Orders filter modal keeps its own host
// for now — see the Phase 2 report; its content component owns its
// draft state and action contract, so migrating it safely needs
// runtime verification). The shell owns the modal frame, the
// scrollable body and the standard Reset / Cancel / Apply footer;
// callers supply only their filter fields as children.
interface FilterModalShellProps {
   open: boolean;
   onClose: () => void;
   title: string;
   onApply: () => void;
   onReset: () => void;
   applying?: boolean;
   applyLabel?: string;
   children: React.ReactNode;
}

export default function FilterModalShell({
   open,
   onClose,
   title,
   onApply,
   onReset,
   applying = false,
   applyLabel = "Apply Filters",
   children,
}: FilterModalShellProps) {
   return (
      <CustomModal
         open={open}
         onClose={onClose}
         title={title}
         closeIcon={true}
         size="lg"
         sx={{
            maxHeight: { xs: "96vh", md: "88vh" },
            borderRadius: { xs: 2, md: 2.5 },
            display: "flex",
            flexDirection: "column",
         }}
      >
         <Box sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
            <Stack spacing={2} p={1}>
               {children}

               <Divider
                  sx={{
                     mt: 1,
                     borderColor: (theme: any) =>
                        alpha(theme.palette.divider, 0.08),
                  }}
               />

               <Stack
                  direction={{ xs: "column-reverse", sm: "row" }}
                  justifyContent="flex-end"
                  alignItems="center"
                  spacing={1.5}
                  pt={1}
                  pb={{ xs: 2, sm: 0 }}
               >
                  <Button
                     color="inherit"
                     disabled={applying}
                     onClick={onReset}
                     sx={{
                        color: "text.secondary",
                        "&:hover": { color: "text.primary" },
                        textTransform: "none",
                        fontWeight: 600,
                        width: { xs: "100%", sm: "auto" },
                     }}
                  >
                     Reset Filters
                  </Button>
                  <Button
                     color="inherit"
                     disabled={applying}
                     onClick={onClose}
                     sx={{
                        color: "text.secondary",
                        "&:hover": { color: "text.primary" },
                        textTransform: "none",
                        fontWeight: 600,
                        width: { xs: "100%", sm: "auto" },
                     }}
                  >
                     Cancel
                  </Button>
                  <Button
                     variant="contained"
                     color="primary"
                     disabled={applying}
                     onClick={onApply}
                     startIcon={
                        applying ? (
                           <CircularProgress size={16} color="inherit" />
                        ) : undefined
                     }
                     sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        px: 3,
                        width: { xs: "100%", sm: "auto" },
                     }}
                  >
                     {applying ? "Applying…" : applyLabel}
                  </Button>
               </Stack>
            </Stack>
         </Box>
      </CustomModal>
   );
}
