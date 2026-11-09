"use client";

import React, { useEffect, useState } from "react";
import {
   Box,
   Divider,
   FormControlLabel,
   Grid,
   Paper,
   Stack,
   Switch,
   TextField,
   Typography,
   useTheme,
   alpha,
} from "@mui/material";
import {
   Control,
   Controller,
   FieldErrors,
   UseFormSetValue,
} from "react-hook-form";
import Icon from "@src/components/Icon";
import CustomAutocomplete from "@src/components/Autocomplete";
import dynamic from "next/dynamic";
import { ProductSchemaType } from "../types";

const RichTextEditor = dynamic(() => import("@src/components/RichTextEditor"), {
   ssr: false,
});

const PRODUCT_TYPES = ["Simple", "Variable", "Bundle", "Service", "Digital"];
const STATUS_OPTIONS = [
   { label: "Active (Visible & Available)", value: "ACTIVE" },
   { label: "Inactive (Archived / Hidden)", value: "INACTIVE" },
   { label: "Draft (Work in progress)", value: "DRAFT" },
];

interface ProductBasicInfoSectionProps {
   formControl: Control<ProductSchemaType>;
   errors: FieldErrors<ProductSchemaType>;
   setValue?: UseFormSetValue<ProductSchemaType>;
}

export const ProductBasicInfoSection: React.FC<
   ProductBasicInfoSectionProps
> = ({ formControl, errors, setValue }) => {
   const theme = useTheme();
   const [categories, setCategories] = useState<string[]>([]);

   useEffect(() => {
      let isMounted = true;
      fetch("/api/categories")
         .then((r) => (r.ok ? r.json() : []))
         .then((data) => {
            if (!isMounted) return;
            const list = Array.isArray(data) ? data : data.categories || [];
            setCategories(list.map((c: any) => c.name).filter(Boolean));
         })
         .catch(() => {});
      return () => {
         isMounted = false;
      };
   }, []);

   return (
      <Paper
         id="section-1-basic-info"
         variant="outlined"
         sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 1.5,
            bgcolor: "background.paper",
            borderColor: "divider",
         }}
      >
         <Stack spacing={2.5}>
            {/* Header */}
            <Stack justifyContent="center" flexWrap="wrap" gap={1}>
               <Stack spacing={0.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                     <Icon
                        icon="solar:document-text-linear"
                        size="18px"
                        style={{ color: theme.palette.text.secondary }}
                     />
                     <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        sx={{ letterSpacing: "-0.01em" }}
                     >
                        1. Basic Product Information
                     </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                     Core catalog details, classification, category and rich
                     description
                  </Typography>
               </Stack>
            </Stack>

            <Divider sx={{ borderColor: "divider" }} />

            {/*
               Row 1: Product Name 
               Row 2: Category & Subcategory
               Row 3: Product Type & Status 
               Row 4: Brand & Manufacturer
            */}
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
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
                        Product Name{" "}
                        <Box component="span" sx={{ color: "error.main" }}>
                           *
                        </Box>
                     </Typography>
                     <Controller
                        name="productName"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              label="Name / Title"
                              placeholder="Product Name / Title"
                              error={Boolean(errors.productName)}
                              helperText={errors.productName?.message}
                           />
                        )}
                     />
                  </Stack>
               </Grid>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
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
                        Category{" "}
                        <Box component="span" sx={{ color: "error.main" }}>
                           *
                        </Box>
                     </Typography>
                     <Controller
                        name="category"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              size="small"
                              value={field.value || ""}
                              onChange={(val: any) => field.onChange(val)}
                              error={Boolean(errors.category)}
                              helperText={errors.category?.message}
                              arrow
                              label="Select Category"
                              options={
                                 categories.length > 0
                                    ? categories
                                    : [
                                         "Electronics",
                                         "Fashion",
                                         "Groceries",
                                         "Health",
                                      ]
                              }
                              getOptionLabel={(option) =>
                                 option?.toString() || ""
                              }
                           />
                        )}
                     />
                  </Stack>
               </Grid>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
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
                        Product Type{" "}
                        <Box component="span" sx={{ color: "error.main" }}>
                           *
                        </Box>
                     </Typography>
                     <Controller
                        name="productType"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              size="small"
                              value={field.value || "Simple"}
                              onChange={(val: any) =>
                                 field.onChange(val || "Simple")
                              }
                              error={Boolean(errors.productType)}
                              helperText={errors.productType?.message}
                              arrow
                              label="Select Product Type"
                              options={PRODUCT_TYPES}
                              getOptionLabel={(option) =>
                                 option?.toString() || ""
                              }
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
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
                        Catalog Status
                     </Typography>
                     <Controller
                        name="status"
                        control={formControl}
                        render={({ field }) => (
                           <CustomAutocomplete
                              size="small"
                              value={field.value || "ACTIVE"}
                              onChange={(val: any) =>
                                 field.onChange(val || "ACTIVE")
                              }
                              error={Boolean(errors.status)}
                              helperText={errors.status?.message}
                              arrow
                              label="Select Status"
                              options={["ACTIVE", "INACTIVE", "DRAFT"]}
                              getOptionLabel={(opt) => {
                                 const item = STATUS_OPTIONS.find(
                                    (s) => s.value === opt,
                                 );
                                 return item ? item.label : String(opt);
                              }}
                           />
                        )}
                     />
                  </Stack>
               </Grid>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
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
                        Brand
                     </Typography>
                     <Controller
                        name="brand"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              label="Brand"
                              placeholder="Brand Name"
                              error={Boolean(errors.brand)}
                              helperText={errors.brand?.message}
                           />
                        )}
                     />
                  </Stack>
               </Grid>

               <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={1}>
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
                        Manufacturer
                     </Typography>
                     <Controller
                        name="manufacturer"
                        control={formControl}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              size="small"
                              fullWidth
                              label="Manufacturer"
                              placeholder="Manufacturer Name"
                              error={Boolean(errors.manufacturer)}
                              helperText={errors.manufacturer?.message}
                           />
                        )}
                     />
                  </Stack>
               </Grid>
            </Grid>

            {/* Row 5: Short Description / Summary */}
            <Stack spacing={1}>
               <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
               >
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
                     Short Summary (Display on Receipts & POS Cart)
                  </Typography>
                  <Controller
                     name="subDescription"
                     control={formControl}
                     render={({ field }) => (
                        <Typography variant="caption" color="text.secondary">
                           {(field.value || "").length}/250 chars
                        </Typography>
                     )}
                  />
               </Stack>
               <Controller
                  name="subDescription"
                  control={formControl}
                  render={({ field }) => (
                     <TextField
                        {...field}
                        value={field.value ?? ""}
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Enter a short product summary..."
                        error={Boolean(errors.subDescription)}
                        helperText={errors.subDescription?.message}
                     />
                  )}
               />
            </Stack>

            {/* Row 6: Rich Text Content */}
            <Stack spacing={1}>
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
                  Detailed Description & Specifications
               </Typography>
               <Controller
                  name="content"
                  control={formControl}
                  render={({ field }) => (
                     <RichTextEditor
                        value={field.value ?? ""}
                        onChange={(val: string) => field.onChange(val)}
                        error={Boolean(errors.content)}
                        helperText={errors.content?.message}
                     />
                  )}
               />
            </Stack>
         </Stack>
      </Paper>
   );
};
