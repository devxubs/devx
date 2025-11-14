"use client";

import {
   Stack,
   Chip,
   FormControl,
   InputAdornment,
   TextField,
   Typography,
   alpha,
   useTheme,
   Button,
   useMediaQuery,
} from "@mui/material";
import React from "react";
import Icon from "../Icon";
import dayjs, { Dayjs } from "dayjs";
import { Type } from ".";

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
   reportData?: {
      report_type?: string;
      start_date?: Dayjs;
      end_date?: Dayjs;
   };
};

type FilterProps = {
   type: Type;
   onFilterChange?: (data: FilterData) => void;
   filterData: FilterData; // required now
   customFilter?: (
      data: FilterData,
      onChange: (data: FilterData) => void
   ) => React.ReactNode;
};

const Filter: React.FC<FilterProps> = ({
   filterData,
   onFilterChange,
   customFilter,
}) => {
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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

            {customFilter &&
               customFilter(filterData, (data: FilterData) =>
                  onFilterChange?.(data)
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
