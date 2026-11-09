"use client";

import React, { useState } from "react";
import {
   Box,
   Button,
   Chip,
   Divider,
   FormControlLabel,
   Grid,
   IconButton,
   Paper,
   Stack,
   Switch,
   TextField,
   Tooltip,
   Typography,
   useTheme,
} from "@mui/material";
import {
   Control,
   Controller,
   FieldErrors,
   UseFormSetValue,
   useWatch,
} from "react-hook-form";
import Icon from "@src/components/Icon";
import CustomAutocomplete from "@src/components/Autocomplete";
import { ProductSchemaType, SpecificationPair } from "../types";

const WARRANTY_TYPES = [
   "Official Manufacturer Warranty",
   "Seller / Store Warranty",
   "Authorized Service Warranty",
   "No Warranty",
];

interface ProductSpecificationsSectionProps {
   formControl: Control<ProductSchemaType>;
   errors: FieldErrors<ProductSchemaType>;
   setValue?: UseFormSetValue<ProductSchemaType>;
}

export const ProductSpecificationsSection: React.FC<
   ProductSpecificationsSectionProps
> = ({ formControl, errors, setValue }) => {
   const theme = useTheme();

   const specs =
      (useWatch({
         control: formControl,
         name: "specifications",
      }) as SpecificationPair[]) || [];
   const tags =
      (useWatch({ control: formControl, name: "tags" }) as string[]) || [];

   const [newSpecKey, setNewSpecKey] = useState("");
   const [newSpecValue, setNewSpecValue] = useState("");
   const [newTag, setNewTag] = useState("");

   const handleAddSpec = () => {
      if (!newSpecKey.trim() || !newSpecValue.trim()) return;

      const updated = [
         ...specs,
         {
            key: newSpecKey.trim(),
            value: newSpecValue.trim(),
         },
      ];

      if (setValue) {
         setValue("specifications", updated, { shouldDirty: true });
      }

      setNewSpecKey("");
      setNewSpecValue("");
   };

   const handleRemoveSpec = (index: number) => {
      const updated = specs.filter((_, i) => i !== index);

      if (setValue) {
         setValue("specifications", updated, { shouldDirty: true });
      }
   };

   const handleAddTag = () => {
      const val = newTag.trim();

      if (!val || tags.includes(val)) return;

      const updated = [...tags, val];

      if (setValue) {
         setValue("tags", updated, { shouldDirty: true });
      }

      setNewTag("");
   };

   const handleRemoveTag = (index: number) => {
      const updated = tags.filter((_, i) => i !== index);

      if (setValue) {
         setValue("tags", updated, { shouldDirty: true });
      }
   };

   return (
      <Paper
         id="section-4-variants-specs"
         variant="outlined"
         sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 1.5,
            bgcolor: "background.paper",
            borderColor: "divider",
         }}
      >
         <Stack spacing={2.5}>
            {/* Section Header */}
            <Stack
               direction="row"
               justifyContent="space-between"
               alignItems="center"
               flexWrap="wrap"
               gap={2}
            >
               <Stack spacing={0.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                     <Icon
                        icon="solar:shield-check-linear"
                        size="18px"
                        style={{ color: theme.palette.text.secondary }}
                     />

                     <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        sx={{ letterSpacing: "-0.01em" }}
                     >
                        4. Warranty & Specifications
                     </Typography>
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                     Manage warranty coverage, product identification, technical
                     details, and search tags.
                  </Typography>
               </Stack>

               <Controller
                  name="hasSerialTracking"
                  control={formControl}
                  render={({ field }) => (
                     <FormControlLabel
                        control={
                           <Switch
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                              color="primary"
                              size="small"
                           />
                        }
                        label={
                           <Typography
                              variant="caption"
                              fontWeight={600}
                              color="text.secondary"
                           >
                              Track Serial Numbers / IMEIs
                           </Typography>
                        }
                        sx={{ m: 0 }}
                     />
                  )}
               />
            </Stack>

            <Divider sx={{ borderColor: "divider" }} />

            {/* Warranty & Product Information */}
            <Grid container spacing={2}>
               {/* Warranty Period */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.75}>
                     <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.primary"
                        sx={{
                           textTransform: "uppercase",
                           letterSpacing: "0.5px",
                           fontSize: "0.72rem",
                        }}
                     >
                        Warranty Period
                     </Typography>

                     <Controller
                        name="warrantyPeriod"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              label="Warranty Duration"
                              placeholder="e.g. 12 Months, 2 Years, Lifetime"
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Warranty Coverage */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.75}>
                     <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.primary"
                        sx={{
                           textTransform: "uppercase",
                           letterSpacing: "0.5px",
                           fontSize: "0.72rem",
                        }}
                     >
                        Warranty Coverage
                     </Typography>

                     <Controller
                        name="warrantyType"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              size="small"
                              value={field.value || ""}
                              onChange={(val: any) => field.onChange(val || "")}
                              arrow
                              label="Select Warranty Type"
                              placeholder="Select Warranty Type"
                              options={WARRANTY_TYPES}
                              getOptionLabel={(option) =>
                                 option?.toString() || ""
                              }
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Manufacturer Model Number */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.75}>
                     <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.primary"
                        sx={{
                           textTransform: "uppercase",
                           letterSpacing: "0.5px",
                           fontSize: "0.72rem",
                        }}
                     >
                        Manufacturer Model Number
                     </Typography>

                     <Controller
                        name="modelNumber"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              label="Manufacturer Model Number"
                              placeholder="Enter manufacturer model number"
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               {/* Country of Origin */}
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.75}>
                     <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.primary"
                        sx={{
                           textTransform: "uppercase",
                           letterSpacing: "0.5px",
                           fontSize: "0.72rem",
                        }}
                     >
                        Country of Origin
                     </Typography>

                     <Controller
                        name="originCountry"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              label="Country of Origin"
                              placeholder="e.g. Bangladesh, Japan, Germany"
                           />
                        )}
                     />
                  </Stack>
               </Grid>
            </Grid>

            {/* Technical Specifications */}
            <Stack spacing={1.5} sx={{ pt: 1 }}>
               <Stack spacing={0.5}>
                  <Typography
                     variant="caption"
                     fontWeight={600}
                     color="text.primary"
                     sx={{
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        fontSize: "0.72rem",
                     }}
                  >
                     Technical Specifications
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                     Add important product details such as dimensions,
                     connectivity, materials, and compatibility.
                  </Typography>
               </Stack>

               {/* Add Specification */}
               <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={"center"}
                  spacing={1}
               >
                  <TextField
                     size="small"
                     label="Specification Name"
                     placeholder="e.g. Connectivity, Display Size, Material"
                     value={newSpecKey}
                     onChange={(e) => setNewSpecKey(e.target.value)}
                     sx={{ flex: 1 }}
                  />

                  <TextField
                     size="small"
                     label="Specification Value"
                     placeholder="e.g. Bluetooth 5.3, 6.7 Inches, Aluminum"
                     value={newSpecValue}
                     onChange={(e) => setNewSpecValue(e.target.value)}
                     sx={{ flex: 1 }}
                  />

                  <IconButton onClick={handleAddSpec}>
                     <Icon
                        icon="solar:add-circle-bold"
                        style={{ color: theme.palette.primary.main }}
                     />
                  </IconButton>
               </Stack>

               {/* Specification List */}
               {specs.length > 0 && (
                  <Stack spacing={0.75}>
                     {specs.map((item, idx) => (
                        <Paper
                           key={idx}
                           variant="outlined"
                           sx={{
                              p: 1,
                              px: 1.5,
                              borderRadius: 1,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              borderColor: "divider",
                           }}
                        >
                           <Box sx={{ display: "flex", gap: 1 }}>
                              <Typography variant="body2" fontWeight={600}>
                                 {item.key}:
                              </Typography>

                              <Typography
                                 variant="body2"
                                 color="text.secondary"
                              >
                                 {item.value}
                              </Typography>
                           </Box>

                           <Tooltip
                              title="Remove specification"
                              disableInteractive
                           >
                              <IconButton
                                 size="small"
                                 color="error"
                                 onClick={() => handleRemoveSpec(idx)}
                              >
                                 <Icon
                                    icon="solar:trash-bin-trash-bold"
                                    size="14px"
                                 />
                              </IconButton>
                           </Tooltip>
                        </Paper>
                     ))}
                  </Stack>
               )}
            </Stack>

            {/* Product Search Tags */}
            <Stack spacing={1}>
               <Stack spacing={0.5}>
                  <Typography
                     variant="caption"
                     fontWeight={600}
                     color="text.primary"
                     sx={{
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        fontSize: "0.72rem",
                     }}
                  >
                     Product Search Tags
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                     Add relevant keywords to improve product search, filtering,
                     and discoverability.
                  </Typography>
               </Stack>

               {/* Add Tag */}
               <Stack direction="row" alignItems="center" spacing={1}>
                  <TextField
                     size="small"
                     fullWidth
                     label="Add Tag"
                     placeholder="Enter a keyword and press Enter"
                     value={newTag}
                     onChange={(e) => setNewTag(e.target.value)}
                     onKeyDown={(e) => {
                        if (e.key === "Enter") {
                           e.preventDefault();
                           handleAddTag();
                        }
                     }}
                     sx={{ flex: 1 }}
                  />

                  <IconButton size="small" onClick={handleAddTag}>
                     <Icon
                        icon="solar:add-circle-bold"
                        style={{ color: theme.palette.primary.main }}
                     />
                  </IconButton>
               </Stack>

               {/* Tag List */}
               <Box
                  sx={{
                     display: "flex",
                     flexWrap: "wrap",
                     gap: 0.5,
                     mt: 0.5,
                  }}
               >
                  {tags.map((tag, idx) => (
                     <Chip
                        key={idx}
                        size="small"
                        label={`#${tag}`}
                        onDelete={() => handleRemoveTag(idx)}
                     />
                  ))}
               </Box>
            </Stack>
         </Stack>
      </Paper>
   );
};
