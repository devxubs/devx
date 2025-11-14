"use client";

import {
   Stack,
   Grid,
   Accordion,
   AccordionDetails,
   AccordionSummary,
   Typography,
   IconButton,
   useTheme,
   Checkbox,
   Collapse,
} from "@mui/material";
import Icon from "@src/components/Icon";
import React, { useState } from "react";
import Item from "./Item";

const Publish = () => {
   const theme = useTheme();
   return (
      <Stack>
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }} sx={{ height: "fit-content" }}>
               <Item />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }} sx={{ height: "fit-content" }}>
               <Item />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }} sx={{ height: "fit-content" }}>
               <Item />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }} sx={{ height: "fit-content" }}>
               <Item />
            </Grid>
         </Grid>
      </Stack>
   );
};

export default Publish;
