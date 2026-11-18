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
import CustomerFilters from "./CustomerFilters";
import {
   CustomerFilterErrors,
   CustomerFilterState,
} from "./customerFilterUtils";

interface CustomerFilterModalProps {
   open: boolean;
   onClose: () => void;
   draftFilters: CustomerFilterState;
   onDraftChange: (filters: CustomerFilterState) => void;
   onApply: () => void;
   onReset: () => void;
   applying?: boolean;
   errors?: CustomerFilterErrors;
   showErrors?: boolean;
   currencySymbol?: string;
}

const CustomerFilterModal: React.FC<CustomerFilterModalProps> = ({
   open,
   onClose,
   draftFilters,
   onDraftChange,
   onApply,
   onReset,
   applying = false,
   errors = {},
   showErrors = false,
   currencySymbol = "৳",
}) => {
   return (
      <CustomModal
         open={open}
         onClose={onClose}
         title="Customer Filters"
         closeIcon={true}
         sx={{
            width: { xs: "95%", sm: "90%", md: 950 },
            maxHeight: { xs: "96vh", md: "88vh" },
            borderRadius: { xs: 2, md: 2.5 },
            display: "flex",
            flexDirection: "column",
         }}
      >
         <Box sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
            <Stack spacing={2} p={1}>
               <CustomerFilters
                  value={draftFilters}
                  onChange={onDraftChange}
                  errors={errors}
                  showErrors={showErrors}
                  currencySymbol={currencySymbol}
               />

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
                     {applying ? "Applying…" : "Apply Filters"}
                  </Button>
               </Stack>
            </Stack>
         </Box>
      </CustomModal>
   );
};

export default CustomerFilterModal;
