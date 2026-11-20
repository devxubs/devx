"use client";

import {
   Box,
   Button,
   Grid,
   Stack,
   Typography,
   useMediaQuery,
   useTheme,
} from "@mui/material";
import React, { useState } from "react";
import CustomAutocomplete from "@src/components/Autocomplete";
import DateRange from "@src/components/DateRange";

// Mirror of AUDIT_ENTITY_TYPES / AUDIT_ACTIONS in src/lib/audit.ts —
// duplicated here on purpose: the lib imports Prisma (server-only),
// so a client component must not import from it.
const ENTITY_TYPE_OPTIONS = [
   "ORDER",
   "PURCHASE",
   "PURCHASE_RETURN",
   "SUPPLIER_PAYMENT",
   "EXPENSE",
   "PRODUCT",
   "USER",
   "ROLE",
   "SETTING",
   "CUSTOMER",
   "SUPPLIER",
   "ASSET",
   "CATEGORY",
   "UNIT",
];
const ACTION_OPTIONS = [
   "CREATE",
   "UPDATE",
   "DELETE",
   "RESTORE",
   "STATUS_CHANGE",
   "PAYMENT",
   "STOCK",
   "LOGIN",
];

export interface AuditFilters {
   entityType: string;
   action: string;
   actorId: string;
   range: [Date | null, Date | null];
}

export const EMPTY_AUDIT_FILTERS: AuditFilters = {
   entityType: "",
   action: "",
   actorId: "",
   range: [null, null],
};

export interface AuditActorOption {
   id: string;
   label: string;
}

// Section/field labels mirroring the Customers filter modal
// (CustomerFilters) so all filter modals share one visual language.
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
   <Typography
      variant="subtitle2"
      sx={{
         fontWeight: 700,
         fontSize: "0.85rem",
         letterSpacing: "0.03em",
         textTransform: "uppercase",
         color: "text.primary",
         mb: 1.5,
      }}
   >
      {children}
   </Typography>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
   <Typography
      variant="body2"
      sx={{
         fontSize: "0.8125rem",
         fontWeight: 600,
         color: "text.secondary",
         letterSpacing: "0.01em",
      }}
   >
      {children}
   </Typography>
);

// Filter form hosted by AuditFilter's CustomModal, following the
// OrderFilterModel pattern: internal draft state initialized from
// the applied filterValue, Reset commits the cleared state at once,
// Cancel just closes, Apply commits the draft and closes.
const AuditFilterModal = ({
   filterValue,
   actors,
   onChange,
   onCloseModal,
}: {
   filterValue: AuditFilters;
   actors: AuditActorOption[];
   onChange?: (f: AuditFilters) => void;
   onCloseModal: () => void;
}) => {
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
   const [filterData, setFilterData] = useState<AuditFilters>({
      entityType: filterValue.entityType || "",
      action: filterValue.action || "",
      actorId: filterValue.actorId || "",
      range: filterValue.range ?? [null, null],
   });

   // Filter option lists for the shared Autocomplete pickers. The
   // empty-string option is the "All …" choice ("" = no filter).
   const entityTypeOptions = [
      { label: "All types", value: "" },
      ...ENTITY_TYPE_OPTIONS.map((t) => ({ label: t, value: t })),
   ];
   const actionOptions = [
      { label: "All actions", value: "" },
      ...ACTION_OPTIONS.map((a) => ({ label: a, value: a })),
   ];
   const actorOptions = [
      { label: "All actors", value: "" },
      ...actors.map((a) => ({ label: a.label, value: a.id })),
   ];

   return (
      <Stack height="100%" spacing={2.5} p={1}>
         <Box>
            <SectionTitle>Event</SectionTitle>
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.75}>
                     <FieldLabel>Entity Type</FieldLabel>
                     <CustomAutocomplete
                        size="small"
                        arrow={true}
                        placeholder="All types"
                        options={entityTypeOptions}
                        value={
                           entityTypeOptions.find(
                              (o) => o.value === filterData.entityType,
                           ) ?? entityTypeOptions[0]
                        }
                        isOptionEqualToValue={(option: any, val: any) =>
                           option.value === val?.value
                        }
                        onChange={(opt: any) =>
                           setFilterData({
                              ...filterData,
                              entityType: opt?.value ?? "",
                           })
                        }
                     />
                  </Stack>
               </Grid>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.75}>
                     <FieldLabel>Action</FieldLabel>
                     <CustomAutocomplete
                        size="small"
                        arrow={true}
                        placeholder="All actions"
                        options={actionOptions}
                        value={
                           actionOptions.find(
                              (o) => o.value === filterData.action,
                           ) ?? actionOptions[0]
                        }
                        isOptionEqualToValue={(option: any, val: any) =>
                           option.value === val?.value
                        }
                        onChange={(opt: any) =>
                           setFilterData({
                              ...filterData,
                              action: opt?.value ?? "",
                           })
                        }
                     />
                  </Stack>
               </Grid>
            </Grid>
         </Box>
         <Box>
            <SectionTitle>Actor & Date</SectionTitle>
            <Stack spacing={2}>
               <Stack spacing={0.75}>
                  <FieldLabel>Actor</FieldLabel>
                  <CustomAutocomplete
                     size="small"
                     arrow={true}
                     placeholder="All actors"
                     options={actorOptions}
                     value={
                        actorOptions.find(
                           (o) => o.value === filterData.actorId,
                        ) ?? actorOptions[0]
                     }
                     isOptionEqualToValue={(option: any, val: any) =>
                        option.value === val?.value
                     }
                     onChange={(opt: any) =>
                        setFilterData({
                           ...filterData,
                           actorId: opt?.value ?? "",
                        })
                     }
                  />
               </Stack>
               <DateRange
                  size="small"
                  title="Date Range"
                  value={filterData.range}
                  onChange={(v: any) =>
                     setFilterData({ ...filterData, range: v })
                  }
               />
            </Stack>
         </Box>

         {/* Buttons — same Reset / Cancel / Apply pattern as
             OrderFilterModel: Reset applies the cleared state
             immediately (modal stays open), Apply commits + closes. */}
         <Stack
            direction={isMobile ? "column" : "row"}
            justifyContent={isMobile ? "flex-start" : "flex-end"}
            spacing={2}
            pt={2}
            pb={isMobile ? 6 : 0}
            flexWrap="wrap"
         >
            <Button
               color="inherit"
               onClick={() => {
                  const resetFilters: AuditFilters = {
                     entityType: "",
                     action: "",
                     actorId: "",
                     range: [null, null],
                  };
                  setFilterData(resetFilters);
                  onChange?.(resetFilters);
               }}
            >
               Reset
            </Button>
            <Button color="error" onClick={() => onCloseModal()}>
               Cancel
            </Button>
            <Button
               variant="contained"
               color="primary"
               onClick={() => {
                  onChange?.(filterData);
                  onCloseModal();
               }}
            >
               Apply
            </Button>
         </Stack>
      </Stack>
   );
};

export default AuditFilterModal;
