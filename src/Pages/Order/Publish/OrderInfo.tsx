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
import { orderSources, orderStatuses } from "@src/handler/order_filter";

const OrderInfo = () => {
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
                  Order Information
               </Typography>
               <Typography variant="body2" color="textSecondary">
                  details, order source, status, and special notes
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
               <Grid container spacing={2}>
                  {/* Order ID */}
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Order ID{" "}
                           <Typography
                              component={"span"}
                              variant="body2"
                              fontSize={12}
                              color="textSecondary"
                           >
                              (Auto-generated)
                           </Typography>
                        </Typography>
                        <TextField
                           fullWidth
                           placeholder="Auto-generated"
                           disabled
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
                           Invoice No.{" "}
                           <Typography
                              component={"span"}
                              variant="body2"
                              fontSize={12}
                              color="textSecondary"
                           >
                              (Auto-generated)
                           </Typography>
                        </Typography>
                        <TextField
                           fullWidth
                           placeholder="Auto-generated"
                           disabled
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
                           Order Source
                        </Typography>
                        <CustomAutocomplete
                           option={orderSources}
                           placeholder="Source"
                           label="Source"
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
                           Order Status
                        </Typography>
                        <CustomAutocomplete
                           option={orderStatuses}
                           placeholder="Status"
                           label="Status"
                        />
                     </Stack>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Order Note
                        </Typography>
                        <TextField
                           fullWidth
                           multiline
                           rows={4}
                           placeholder="Note"
                           label="Note"
                        />
                     </Stack>
                  </Grid>
               </Grid>
            </Stack>
         </Collapse>
      </Paper>
   );
};

export default OrderInfo;
