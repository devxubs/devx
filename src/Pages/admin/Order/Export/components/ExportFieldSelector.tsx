import React from "react";
import {
   Stack,
   Typography,
   Box,
   Checkbox,
   FormControlLabel,
   Button,
   Chip,
   Accordion,
   AccordionSummary,
   AccordionDetails,
   Grid,
   useTheme,
   alpha,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { OrderFieldKey } from "../types/export.types";
import { ORDER_FIELD_GROUPS, ALL_FIELD_KEYS } from "../utils/exportConstants";

interface ExportFieldSelectorProps {
   selectedFields: Set<OrderFieldKey>;
   onToggleField: (key: OrderFieldKey) => void;
   onToggleGroup: (groupId: string, select: boolean) => void;
   onSelectAll: () => void;
   onDeselectAll: () => void;
   isGroupAllSelected: (groupId: string) => boolean;
   isGroupIndeterminate: (groupId: string) => boolean;
}

export const ExportFieldSelector: React.FC<ExportFieldSelectorProps> = ({
   selectedFields,
   onToggleField,
   onToggleGroup,
   onSelectAll,
   onDeselectAll,
   isGroupAllSelected,
   isGroupIndeterminate,
}) => {
   const theme = useTheme();

   const allSelected = selectedFields.size === ALL_FIELD_KEYS.length;
   const totalSelected = selectedFields.size;

   const checkboxSx = {
      p: 0.65,
      color: "text.disabled",
      "&.Mui-checked": {
         color: "primary.main",
      },
      "&.MuiCheckbox-indeterminate": {
         color: "primary.main",
      },
   };

   return (
      <Stack spacing={2}>
         {/* Section Header */}
         <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={1.5}
         >
            <Stack spacing={0.35}>
               <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography
                     variant="subtitle2"
                     fontWeight={700}
                     color="text.primary"
                  >
                     Export Fields
                  </Typography>

                  <Chip
                     size="small"
                     label={`${totalSelected}/${ALL_FIELD_KEYS.length}`}
                     sx={{
                        height: 21,
                        borderRadius: 1,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: "primary.main",
                     }}
                  />
               </Stack>

               <Typography variant="caption" color="text.secondary">
                  Choose the information to include in your export.
               </Typography>
            </Stack>

            {/* Global Actions */}
            <Stack direction="row" spacing={0.5}>
               <Button
                  size="small"
                  onClick={onSelectAll}
                  disabled={allSelected}
                  startIcon={
                     <Icon icon="solar:check-read-linear" size={"small"} />
                  }
                  sx={{
                     minWidth: 0,
                     px: 1,
                     fontSize: "0.75rem",
                     fontWeight: 600,
                     textTransform: "none",
                  }}
               >
                  Select all
               </Button>

               <Button
                  size="small"
                  color="inherit"
                  onClick={onDeselectAll}
                  disabled={totalSelected === 0}
                  startIcon={
                     <Icon icon="solar:close-circle-linear" size={"small"} />
                  }
                  sx={{
                     minWidth: 0,
                     px: 1,
                     fontSize: "0.75rem",
                     fontWeight: 600,
                     color: "text.secondary",
                     textTransform: "none",
                  }}
               >
                  Clear
               </Button>
            </Stack>
         </Stack>

         {/* Field Groups */}
         <Stack spacing={1}>
            {ORDER_FIELD_GROUPS.map((group) => {
               const groupAllSelected = isGroupAllSelected(group.id);
               const groupIndeterminate = isGroupIndeterminate(group.id);

               const selectedCount = group.fields.filter((field) =>
                  selectedFields.has(field.key),
               ).length;

               const hasSelection = selectedCount > 0;

               return (
                  <Accordion
                     key={group.id}
                     defaultExpanded
                     disableGutters
                     elevation={0}
                     sx={{
                        border: 1,
                        borderColor: "divider",
                        borderRadius: "10px !important",
                        overflow: "hidden",
                        bgcolor: "background.paper",
                        "&:before": {
                           display: "none",
                        },
                        "&.Mui-expanded": {
                           my: 2,
                        },
                     }}
                  >
                     {/* Group Header */}
                     <AccordionSummary
                        expandIcon={<Icon icon="eva:chevron-down-fill" />}
                        sx={{
                           minHeight: 48,
                           px: 1.5,
                           "&.Mui-expanded": {
                              minHeight: 48,
                           },
                           "& .MuiAccordionSummary-content": {
                              my: 0.75,
                              alignItems: "center",
                           },
                           "& .MuiAccordionSummary-content.Mui-expanded": {
                              my: 0.75,
                           },
                        }}
                     >
                        <Stack
                           direction="row"
                           alignItems="center"
                           justifyContent="space-between"
                           width="100%"
                           minWidth={0}
                           pr={1}
                        >
                           <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              minWidth={0}
                              onClick={(event) => event.stopPropagation()}
                           >
                              <Checkbox
                                 size="small"
                                 checked={groupAllSelected}
                                 indeterminate={groupIndeterminate}
                                 onChange={(event) =>
                                    onToggleGroup(
                                       group.id,
                                       event.target.checked,
                                    )
                                 }
                                 sx={checkboxSx}
                              />

                              <Typography
                                 variant="body2"
                                 fontWeight={650}
                                 color="text.primary"
                                 noWrap
                              >
                                 {group.title}
                              </Typography>
                           </Stack>

                           <Chip
                              size="small"
                              label={`${selectedCount}/${group.fields.length}`}
                              sx={{
                                 height: 21,
                                 minWidth: 42,
                                 borderRadius: 1,
                                 fontSize: "0.7rem",
                                 fontWeight: 650,
                                 bgcolor: hasSelection
                                    ? alpha(theme.palette.primary.main, 0.09)
                                    : "action.hover",
                                 color: hasSelection
                                    ? "primary.main"
                                    : "text.secondary",
                              }}
                           />
                        </Stack>
                     </AccordionSummary>

                     {/* Group Fields */}
                     <AccordionDetails
                        sx={{
                           px: 2,
                           pt: 0.5,
                           pb: 1.5,
                           borderTop: 1,
                           borderColor: "divider",
                        }}
                     >
                        <Grid container spacing={0.5}>
                           {group.fields.map((field) => {
                              const isChecked = selectedFields.has(field.key);

                              return (
                                 <Grid
                                    key={field.key}
                                    size={{ xs: 12, sm: 6, md: 4 }}
                                 >
                                    <Box
                                       sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          minHeight: 36,
                                          px: 0.75,
                                          borderRadius: 1,
                                          transition: "background-color 0.15s",
                                          "&:hover": {
                                             bgcolor: "action.hover",
                                          },
                                       }}
                                    >
                                       <FormControlLabel
                                          control={
                                             <Checkbox
                                                size="small"
                                                checked={isChecked}
                                                onChange={() =>
                                                   onToggleField(field.key)
                                                }
                                                sx={checkboxSx}
                                             />
                                          }
                                          label={
                                             <Typography
                                                variant="body2"
                                                fontSize="0.8rem"
                                                fontWeight={
                                                   isChecked ? 550 : 400
                                                }
                                                color={
                                                   isChecked
                                                      ? "text.primary"
                                                      : "text.secondary"
                                                }
                                             >
                                                {field.label}
                                             </Typography>
                                          }
                                          sx={{
                                             m: 0,
                                             width: "100%",
                                             cursor: "pointer",
                                          }}
                                       />
                                    </Box>
                                 </Grid>
                              );
                           })}
                        </Grid>
                     </AccordionDetails>
                  </Accordion>
               );
            })}
         </Stack>
      </Stack>
   );
};

export default ExportFieldSelector;
