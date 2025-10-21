"use client";

import {
   Stack,
   Box,
   Chip,
   FormControl,
   InputAdornment,
   TextField,
   Typography,
   alpha,
   useTheme,
   Button,
   IconButton,
   Tooltip,
   useMediaQuery,
} from "@mui/material";
import React from "react";
import Icon from "../Icon";
import CustomModal from "../Modal";
import OrderFilterModal from "./OrderFilterModel";
import dayjs, { Dayjs } from "dayjs";
import { Type } from ".";
import CustomAutocomplete from "../Autocomplete";
import Scrollbar from "react-browser-scrollbar";

export type OrderFilter = {
   order_created_at?: Dayjs;
   courier_submitted_at?: Dayjs;
   employee?: string;
   status?: string;
   order_source?: string;
   products?: string;
   district?: string;
   print_status?: string;
};

export type FilterData = {
   userRole: string;
   productStock: string;
   searchText: string;
   orderData: OrderFilter;
};

type FilterProps = {
   type: Type;
   onFilterChange?: (data: FilterData) => void;
   filterData: FilterData; // required now
};

const Filter: React.FC<FilterProps> = ({
   type,
   filterData,
   onFilterChange,
}) => {
   const theme = useTheme();
   const [modalOpen, setModalOpen] = React.useState(false);
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

   const names = [
      "CEO",
      "Manager",
      "Repeat Sales Exicutive",
      "Team Leader",
      "Courier Exicutive",
      "Reseller",
   ];

   const activeFilters = Object.entries(filterData.orderData).filter(
      ([, value]) => value !== undefined && value !== ""
   );

   return (
      <Stack spacing={2} mb={2}>
         <Stack
            spacing={2}
            direction="row"
            alignItems="center"
            justifyContent="space-between"
         >
            <FormControl variant="outlined" sx={{ flex: !isMobile ? 0.4 : 1 }}>
               <TextField
                  fullWidth
                  placeholder="Search"
                  size={isMobile ? "small" : "medium"}
                  value={filterData.searchText}
                  onChange={(e) =>
                     onFilterChange?.({
                        ...filterData,
                        searchText: e.target.value,
                     })
                  }
                  InputProps={{
                     startAdornment: (
                        <InputAdornment position="start">
                           <Icon icon="eva:search-fill" />
                        </InputAdornment>
                     ),
                  }}
               />
            </FormControl>

            {type === "user" && (
               <Stack sx={{ width: "30%" }}>
                  <CustomAutocomplete
                     label="Role"
                     option={names}
                     value={filterData.userRole || ""} // controlled
                     onChange={(v: string) =>
                        onFilterChange?.({ ...filterData, userRole: v || "" })
                     }
                  />
               </Stack>
            )}

            {type === "product" && (
               <Stack sx={{ width: "30%" }}>
                  <CustomAutocomplete
                     label="Stock"
                     option={["In stock", "Low stock", "Out of stock"]}
                     value={filterData.productStock || ""}
                     onChange={(val: string) =>
                        onFilterChange?.({ ...filterData, productStock: val })
                     }
                  />
               </Stack>
            )}

            {type === "order" && (
               <Box>
                  <Tooltip title="Filter">
                     <IconButton
                        sx={{ color: "text.secondary" }}
                        onClick={() => setModalOpen(true)}
                     >
                        <Icon icon="solar:filters-bold-duotone" />
                     </IconButton>
                  </Tooltip>

                  <CustomModal
                     sx={{
                        width: { xs: "100%", md: 900 },
                        height: { xs: "100vh", md: "auto" },
                        borderRadius: { xs: 0, md: 2 },
                     }}
                     open={modalOpen}
                     onClose={() => setModalOpen(false)}
                     title="Order Filter"
                  >
                     <Scrollbar
                        autoHide
                        darkMode
                        thumbSize={6}
                        style={{ height: "100%" }}
                     >
                        <OrderFilterModal
                           filterValue={{
                              ...filterData.orderData,
                              status: filterData.orderData.status,
                           }}
                           onCloseModal={() => setModalOpen(false)}
                           onChange={(f: OrderFilter) =>
                              onFilterChange?.({
                                 ...filterData,
                                 orderData: {
                                    ...f,
                                    status: f.status !== null ? f.status : "",
                                 },
                              })
                           }
                        />
                     </Scrollbar>
                  </CustomModal>
               </Box>
            )}
         </Stack>

         <Stack
            spacing={1}
            direction="row"
            alignItems="flex-start"
            flexWrap="wrap"
         >
            {filterData.searchText && (
               <Stack
                  spacing={1}
                  direction="row"
                  alignItems="center"
                  border={1}
                  borderColor="divider"
                  borderRadius={0.5}
                  p={1}
                  sx={{ borderStyle: "dashed" }}
               >
                  <Typography variant="subtitle2">Keyword: </Typography>
                  <Chip
                     label={filterData.searchText}
                     size="small"
                     onDelete={() =>
                        onFilterChange?.({ ...filterData, searchText: "" })
                     }
                     sx={{
                        borderRadius: 0.5,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        bgcolor: alpha(theme.palette.grey[300], 0.1),
                        color: theme.palette.grey[300],
                     }}
                  />
               </Stack>
            )}

            {filterData.productStock && (
               <Stack
                  spacing={1}
                  direction="row"
                  alignItems="center"
                  border={1}
                  borderColor="divider"
                  borderRadius={0.5}
                  p={1}
                  sx={{ borderStyle: "dashed" }}
               >
                  <Typography variant="subtitle2">Stock: </Typography>
                  <Chip
                     label={filterData.productStock}
                     size="small"
                     onDelete={() =>
                        onFilterChange?.({ ...filterData, productStock: "" })
                     }
                     sx={{
                        borderRadius: 0.5,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        bgcolor: alpha(theme.palette.grey[300], 0.1),
                        color: theme.palette.grey[300],
                     }}
                  />
               </Stack>
            )}

            {filterData.userRole && (
               <Stack
                  spacing={1}
                  direction="row"
                  alignItems="center"
                  border={1}
                  borderColor="divider"
                  borderRadius={0.5}
                  p={1}
                  sx={{ borderStyle: "dashed" }}
               >
                  <Typography variant="subtitle2">Role: </Typography>
                  <Chip
                     label={filterData.userRole}
                     size="small"
                     onDelete={() =>
                        onFilterChange?.({ ...filterData, userRole: "" })
                     }
                     sx={{
                        borderRadius: 0.5,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        bgcolor: alpha(theme.palette.grey[300], 0.1),
                        color: theme.palette.grey[300],
                     }}
                  />
               </Stack>
            )}

            {activeFilters.map(([key, value]) => (
               <Stack
                  key={key}
                  spacing={1}
                  direction="row"
                  alignItems="center"
                  border={1}
                  borderColor="divider"
                  borderRadius={0.5}
                  p={1}
                  sx={{ borderStyle: "dashed" }}
               >
                  <Typography variant="subtitle2">
                     {key
                        .split("_")
                        .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
                        .join(" ")}
                     :
                  </Typography>
                  <Chip
                     label={
                        dayjs.isDayjs(value)
                           ? (value as Dayjs).format("MM/DD/YYYY")
                           : String(value)
                     }
                     size="small"
                     onDelete={() =>
                        onFilterChange?.({
                           ...filterData,
                           orderData: {
                              ...filterData.orderData,
                              [key]: key.includes("at") ? undefined : "",
                           },
                        })
                     }
                     sx={{
                        borderRadius: 0.5,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        bgcolor: alpha(theme.palette.grey[300], 0.1),
                        color: theme.palette.grey[300],
                     }}
                  />
               </Stack>
            ))}

            {(filterData.searchText ||
               filterData.userRole ||
               activeFilters.length > 0 ||
               filterData.productStock) && (
               <Button
                  variant="text"
                  color="error"
                  startIcon={
                     <Icon
                        size="small"
                        icon="solar:trash-bin-trash-bold"
                        color="error"
                     />
                  }
                  onClick={() =>
                     onFilterChange?.({
                        searchText: "",
                        userRole: "",
                        productStock: "",
                        orderData: {},
                     })
                  }
               >
                  Clear
               </Button>
            )}
         </Stack>
      </Stack>
   );
};

export default Filter;
