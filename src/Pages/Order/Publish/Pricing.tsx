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

const Pricing = () => {
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
                  Pricing & Discounts
               </Typography>
               <Typography variant="body2" color="textSecondary">
                  Affordable rates with exclusive discounts on bulk and seasonal
                  orders.
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
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Subtotal
                        </Typography>
                        <TextField
                           fullWidth
                           placeholder="Subtotal"
                           label="Subtotal"
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
                           Shipping Cost
                        </Typography>
                        <TextField
                           fullWidth
                           placeholder="Shipping Cost"
                           label="Shipping Cost"
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
                           Discount{" "}
                           <Typography
                              component={"span"}
                              variant="body2"
                              fontSize={12}
                              color="textSecondary"
                           >
                              (manual entry or coupon code)
                           </Typography>
                        </Typography>
                        <TextField
                           fullWidth
                           placeholder="Discount"
                           label="Discount"
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
                           Total Amount
                        </Typography>
                        <TextField
                           fullWidth
                           placeholder="Total Amount"
                           label="Total Amount"
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
                           Advance Payment{" "}
                           <Typography
                              component={"span"}
                              variant="body2"
                              fontSize={12}
                              color="textSecondary"
                           >
                              (if applicable)
                           </Typography>
                        </Typography>
                        <TextField
                           fullWidth
                           placeholder="Advance Payment"
                           label="Advance Payment"
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
                           Due Amount{" "}
                           <Typography
                              component={"span"}
                              variant="body2"
                              fontSize={12}
                              color="textSecondary"
                           >
                              (auto-calculated)
                           </Typography>
                        </Typography>
                        <TextField
                           fullWidth
                           placeholder="Due Amount"
                           label="Due Amount"
                        />
                     </Stack>
                  </Grid>
               </Grid>
            </Stack>
         </Collapse>
      </Paper>
   );
};

export default Pricing;
