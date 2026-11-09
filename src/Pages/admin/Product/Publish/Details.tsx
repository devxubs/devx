"use client";

import {
   Paper,
   Stack,
   Typography,
   TextField,
   IconButton,
   Collapse,
   Grid,
   FormControlLabel,
   Switch,
} from "@mui/material";
import React, { useState } from "react";
import { Controller } from "react-hook-form";
import UploadPhoto from "./imageUploader";
import Icon from "@src/components/Icon";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@src/components/RichTextEditor"), {
   ssr: false,
});

interface DetailsProps {
   formControl: any;
   errors: any;
}

const Details = ({ formControl, errors }: DetailsProps) => {
   const [expanded, setExpanded] = useState(true);

   return (
      <Paper sx={{ borderRadius: 1.5, boxShadow: 15, overflow: "hidden" }}>
         {/* Header */}
         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            p={3}
         >
            <Stack spacing={0.5}>
               <Typography variant="body1" fontSize={18} color="textPrimary">
                  Details
               </Typography>
               <Typography variant="body2" color="textSecondary">
                  Title, Category, short description, image...
               </Typography>
            </Stack>
            <IconButton onClick={() => setExpanded(!expanded)}>
               <Icon
                  style={{
                     transform: `rotate(${expanded ? 90 : 0}deg)`,
                     transition: "all 0.2s",
                  }}
                  icon={"solar:alt-arrow-right-broken"}
               />
            </IconButton>
         </Stack>

         {/* Animated Content */}
         <Collapse in={expanded}>
            <Stack spacing={3} p={2}>
               {/* Product Name */}
               <Stack spacing={1.5}>
                  <Typography
                     variant="h6"
                     fontSize={"13px!important"}
                     fontWeight={500}
                  >
                     Product Name
                  </Typography>
                  <Controller
                     name="productName"
                     control={formControl}
                     render={({ field }) => (
                        <TextField
                           {...field}
                           value={field.value ?? ""}
                           error={!!errors.productName}
                           helperText={errors.productName?.message}
                           label="Product Name"
                           variant="outlined"
                           required
                        />
                     )}
                  />
               </Stack>

               {/* Brand & Manufacturer */}
               <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
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
                                 error={!!errors.brand}
                                 helperText={errors.brand?.message}
                                 label="Brand"
                                 variant="outlined"
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
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
                                 error={!!errors.manufacturer}
                                 helperText={errors.manufacturer?.message}
                                 label="Manufacturer"
                                 variant="outlined"
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
               </Grid>

               {/* Sub Description */}
               <Stack spacing={1.5}>
                  <Typography
                     variant="h6"
                     fontSize={"13px!important"}
                     fontWeight={500}
                  >
                     Sub Description
                  </Typography>
                  <Controller
                     name="subDescription"
                     control={formControl}
                     render={({ field }) => (
                        <TextField
                           {...field}
                           value={field.value ?? ""}
                           error={!!errors.subDescription}
                           helperText={errors.subDescription?.message}
                           label="Sub Description"
                           variant="outlined"
                           multiline
                           rows={4}
                        />
                     )}
                  />
               </Stack>

               {/* Subcategory & Featured Toggle */}
               <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, md: 7 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Subcategory
                        </Typography>
                        <Controller
                           name="subcategory"
                           control={formControl}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 value={field.value ?? ""}
                                 error={!!errors.subcategory}
                                 helperText={errors.subcategory?.message}
                                 label="Subcategory"
                                 variant="outlined"
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  <Grid size={{ xs: 12, md: 5 }}>
                     <Stack spacing={1.5} pt={{ xs: 0, md: 3 }}>
                        <Controller
                           name="isFeatured"
                           control={formControl}
                           render={({ field }) => (
                              <FormControlLabel
                                 control={
                                    <Switch
                                       checked={Boolean(field.value)}
                                       onChange={(e) => field.onChange(e.target.checked)}
                                       color="primary"
                                    />
                                 }
                                 label={
                                    <Typography variant="body2" fontWeight={500}>
                                       Featured Product
                                    </Typography>
                                 }
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
               </Grid>

               {/* Content / RichText */}
               <Stack spacing={1.5}>
                  <Typography
                     variant="h6"
                     fontSize={"13px!important"}
                     fontWeight={500}
                  >
                     Content
                  </Typography>
                  <>
                     <Controller
                        name="content"
                        control={formControl}
                        render={({ field }) => (
                           <RichTextEditor
                              {...field}
                              value={field.value ?? ""}
                              error={!!errors.content}
                              helperText={errors.content?.message}
                           />
                        )}
                     />
                     <Typography variant="caption" color="error" ml={1.5}>
                        {errors.content?.message}
                     </Typography>
                  </>
               </Stack>

               {/* Images */}
               <Stack spacing={1.5}>
                  <Typography
                     variant="h6"
                     fontSize={"13px!important"}
                     fontWeight={500}
                  >
                     Images
                  </Typography>
                  <Stack>
                     <Controller
                        name="images"
                        control={formControl}
                        render={({ field }) => (
                           <UploadPhoto
                              {...field}
                              value={field.value ?? []}
                              error={!!errors.images}
                              helperText={errors.images?.message}
                           />
                        )}
                     />
                  </Stack>
               </Stack>
            </Stack>
         </Collapse>
      </Paper>
   );
};

export default Details;
