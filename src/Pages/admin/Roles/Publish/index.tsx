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
   TableContainer,
   Paper,
   Table,
   TableHead,
   TableRow,
   TableBody,
   TableCell,
   Button,
   alpha,
   TextField,
   InputAdornment,
   useMediaQuery,
} from "@mui/material";
import Icon from "@src/components/Icon";
import React, { useState } from "react";
import Item from "./Item";
import Scrollbar from "react-browser-scrollbar";

const Publish = () => {
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

   return (
      <Scrollbar autoHide thumbSize={6} darkMode>
         <Stack spacing={2} py={2}>
            <Stack bgcolor={"background.paper"} p={2} borderRadius={1}>
               <Stack
                  spacing={2}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  bgcolor={"background.paper"}
                  borderBottom={1}
                  borderColor="divider"
               >
                  <TextField
                     fullWidth
                     placeholder="Search"
                     size={isMobile ? "small" : "medium"}
                     InputProps={{
                        startAdornment: (
                           <InputAdornment position="start">
                              <Icon icon="eva:search-fill" />
                           </InputAdornment>
                        ),
                     }}
                  />
               </Stack>
               <Table stickyHeader>
                  <TableHead
                     sx={{
                        "& th": {
                           backgroundColor:
                              alpha(theme.palette.grey[600], 0.1) +
                              "!important",
                           ...theme.applyStyles("dark", {
                              backgroundColor:
                                 alpha(theme.palette.grey[700], 0.5) +
                                 "!important",
                           }),
                        },
                     }}
                  >
                     <TableRow>
                        <TableCell>1..</TableCell>
                        <TableCell>2...</TableCell>
                     </TableRow>
                  </TableHead>
                  <TableBody
                     sx={{
                        "& > :last-child > td": {
                           border: "0px!important",
                        },
                     }}
                  >
                     <TableRow>
                        <TableCell>12...</TableCell>
                        <TableCell>21....</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>12...</TableCell>
                        <TableCell>21...</TableCell>
                     </TableRow>
                  </TableBody>
               </Table>
            </Stack>

            {/* <Grid container spacing={2}>
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
         </Grid> */}

            <Stack spacing={2} direction={"row"} justifyContent={"flex-end"}>
               <Button variant="text" color="inherit">
                  Cancel
               </Button>
               <Button variant="contained" color="primary">
                  Submit
               </Button>
            </Stack>
         </Stack>
      </Scrollbar>
   );
};

export default Publish;
