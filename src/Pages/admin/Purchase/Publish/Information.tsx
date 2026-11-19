"use client";

import {
   Paper,
   Stack,
   Typography,
   TextField,
   IconButton,
   Collapse,
   Grid,
} from "@mui/material";
import React, { useState } from "react";
import Icon from "@src/components/Icon";
import CustomAutocomplete from "@src/components/Autocomplete";
import { orderSources, orderStatuses } from "@src/Pages/admin/Order/data";
import { Controller } from "react-hook-form";
import { PurchaseTypes } from "..";
import AttachmentUploader from "./AttachmentUploader";
import DatePicker from "@src/components/DateRange";

interface DetailsProps {
   control: any;
   errors: any;
   data: PurchaseTypes;
}

const Information = ({ control, errors, data }: DetailsProps) => {
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
                  Information
               </Typography>
               <Typography variant="body2" color="textSecondary">
                  Details, Order source, Status, and Special notes
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
            <Stack spacing={3} p={2} pt={0}>
               {/* Date */}
               <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Date
                        </Typography>
                        <Controller
                           name="date"
                           control={control}
                           defaultValue={data.date || []}
                           render={({ field }) => (
                              <DatePicker
                                 {...field}
                                 value={field.value} // ✅ always controlled
                                 onChange={(val: any) => field.onChange(val)}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
                  {/* Invoice No. */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Invoice No
                           {/* .{" "}
                           <Typography
                              component={"span"}
                              variant="body2"
                              fontSize={12}
                              color="textSecondary"
                           >
                              (Auto-generated)
                           </Typography> */}
                        </Typography>
                        <Controller
                           name="invoice"
                           control={control}
                           defaultValue={data?.invoice}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 label="Invoice No."
                                 placeholder="Invoice No."
                              />
                           )}
                        />
                     </Stack>
                  </Grid>

                  {/* Attachments */}
                  <Grid size={{ xs: 12 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Attachments
                        </Typography>
                        <Controller
                           name="attachments"
                           control={control}
                           defaultValue={data.attachments || []}
                           render={({ field }) => (
                              <AttachmentUploader
                                 {...field}
                                 value={field.value || []} // ✅ always controlled
                                 onChange={(val: any, e: any) =>
                                    field.onChange(val)
                                 }
                              />
                           )}
                        />
                        {/* Phase 2 (2.4): attachments already stored on
                            the purchase (edit mode) are listed so they
                            are not invisible while editing. */}
                        {Array.isArray(data.attachments) &&
                           data.attachments.length > 0 && (
                              <Stack spacing={0.5}>
                                 <Typography
                                    variant="caption"
                                    color="textSecondary"
                                 >
                                    Saved attachments:
                                 </Typography>
                                 {data.attachments.map(
                                    (att: any, i: number) => (
                                       <Typography
                                          key={att.id || i}
                                          variant="body2"
                                       >
                                          • {att.name}
                                          {att.size
                                             ? ` (${Math.max(
                                                  1,
                                                  Math.round(att.size / 1024),
                                               )} KB)`
                                             : ""}
                                       </Typography>
                                    ),
                                 )}
                              </Stack>
                           )}
                     </Stack>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Note
                        </Typography>
                        <Controller
                           name="note"
                           control={control}
                           defaultValue={data?.note ?? ""}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 multiline
                                 rows={4}
                                 placeholder="Note"
                                 label="Note"
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
               </Grid>
            </Stack>
         </Collapse>
      </Paper>
   );
};

export default Information;
