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

import React, { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import dayjs from "dayjs";
import { useFilterQuery } from "@src/handler/useFilterQuery";

export type OrderFilter = {
   order_created_at?: [Date | null, Date | null];
   courier_submitted_at?: [Date | null, Date | null];
   employee?: string;
   status?: string;
   order_source?: string;
   products?: string;
   district?: string;
   print_status?: string;
};

export type FilterData = {
   userRole?: string;
   productStock?: string;
   searchText?: string;
   orderData?: OrderFilter;
   reportData?: {
      report_type?:
         | "default"
         | "sales"
         | "couriers"
         | "purchases"
         | "inventory"
         | "customers"
         | "expenses"
         | "suppliers"
         | "employees"
         | "products";
      date?: [Date | null, Date | null];
      product?: null | string;
   };
};

type FilterProps = {
   customFilter?: (
      data: FilterData,
      onChange: (data: FilterData) => void,
   ) => React.ReactNode;
};

const Filter: React.FC<FilterProps> = ({ customFilter }) => {
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
   const { filterQueryData, setFilterQueryData } = useFilterQuery();
   const [searchText, setSearchText] = useState("");

   useEffect(() => {
      setSearchText(filterQueryData.searchText || "");
   }, [filterQueryData.searchText]);

   const reportData = Object.entries(filterQueryData.reportData || {});

   const isActive = (val: any) => {
      if (!val) return false;
      if (Array.isArray(val)) return !!(val[0] && val[1]); // Active if date range is full
      return val !== "";
   };

   const activeOrderFilters = Object.entries(
      filterQueryData.orderData || {},
   ).filter(([_, v]) => isActive(v));

   const activeReportFilters = Object.entries(
      filterQueryData.reportData || {},
   ).filter(([key, value]) => key !== "report_type" && isActive(value));

   const hasAnyFilter = useMemo(() => {
      return (
         isActive(filterQueryData.searchText) ||
         isActive(filterQueryData.userRole) ||
         isActive(filterQueryData.productStock) ||
         activeOrderFilters.length > 0 ||
         activeReportFilters.length > 0
      );
   }, [filterQueryData, activeOrderFilters, activeReportFilters]);

   const handleClearAll = () => {
      setFilterQueryData({
         searchText: "",
         userRole: "",
         productStock: "",
         orderData: {
            order_created_at: undefined,
            courier_submitted_at: undefined,
            employee: "",
            status: "",
            order_source: "",
            products: "",
            district: "",
            print_status: "",
         },
         reportData: {
            report_type: "default",
            date: [null, null],
            product: null,
         },
      });
   };

   return (
      <Stack
         spacing={2}
         bgcolor={"background.paper"}
         borderBottom={1}
         borderColor="divider"
      >
         <Stack spacing={2} p={2} bgcolor={"background.paper"}>
            {/* TOP SEARCH + CUSTOM FILTER */}
            <Stack
               spacing={2}
               direction="row"
               alignItems="center"
               justifyContent="space-between"
            >
               {/* Search Box */}
               <FormControl
                  variant="outlined"
                  sx={{ flex: !isMobile ? 0.4 : 1 }}
               >
                  <TextField
                     fullWidth
                     placeholder="Search"
                     size={isMobile ? "small" : "medium"}
                     value={searchText}
                     onChange={(e) => {
                        setFilterQueryData({
                           searchText: e.target.value,
                        });
                        setSearchText(e.target.value);
                     }}
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
                  (customFilter(filterQueryData, (updated) => {
                     setFilterQueryData(updated);
                  }) as React.ReactElement)}
            </Stack>

            {/* ACTIVE FILTER CHIPS */}
            <Stack
               direction="row"
               alignItems="flex-start"
               flexWrap="wrap"
               gap={1}
            >
               {/* Search Text */}
               {isActive(filterQueryData.searchText) && (
                  <FilterChipWrapper title="Keyword">
                     <Chip
                        label={filterQueryData.searchText}
                        size="small"
                        onDelete={() =>
                           setFilterQueryData({
                              searchText: "",
                           })
                        }
                        sx={chipStyle(theme)}
                     />
                  </FilterChipWrapper>
               )}

               {/* Product Stock */}
               {isActive(filterQueryData.productStock) && (
                  <FilterChipWrapper title="Stock">
                     <Chip
                        label={filterQueryData.productStock}
                        size="small"
                        onDelete={() =>
                           setFilterQueryData({
                              productStock: "",
                           })
                        }
                        sx={chipStyle(theme)}
                     />
                  </FilterChipWrapper>
               )}

               {/* User Role */}
               {isActive(filterQueryData.userRole) && (
                  <FilterChipWrapper title="Role">
                     <Chip
                        label={filterQueryData.userRole}
                        size="small"
                        onDelete={() =>
                           setFilterQueryData({
                              userRole: "",
                           })
                        }
                        sx={chipStyle(theme)}
                     />
                  </FilterChipWrapper>
               )}

               {/* Reports */}
               {activeReportFilters && (
                  <>
                     {reportData.map(([key], idx) => {
                        const value =
                           filterQueryData.reportData?.[
                              key as keyof typeof filterQueryData.reportData
                           ];

                        if (
                           key === "report_type" ||
                           value == null || // null or undefined
                           (Array.isArray(value) && (!value[0] || !value[1]))
                        ) {
                           return null;
                        }

                        const label =
                           key === "date" &&
                           Array.isArray(value) &&
                           value[0] !== null &&
                           value[1] !== null
                              ? `${dayjs(value[0]).format("YYYY-MM-DD")} → ${dayjs(
                                   value[1],
                                ).format("YYYY-MM-DD")}`
                              : String(value ?? "");

                        const title =
                           filterQueryData.reportData &&
                           (!filterQueryData.reportData.report_type ||
                           filterQueryData.reportData.report_type === "default"
                              ? key
                              : `${key !== "product" ? filterQueryData.reportData.report_type?.toUpperCase() + " " + key.toUpperCase() : key.toUpperCase()}`);

                        return (
                           filterQueryData.reportData && (
                              <FilterChipWrapper
                                 key={idx}
                                 title={title || key.toUpperCase()}
                              >
                                 <Chip
                                    label={label}
                                    size="small"
                                    onDelete={() =>
                                       setFilterQueryData({
                                          reportData: {
                                             ...filterQueryData.reportData,
                                             [key]:
                                                key === "date"
                                                   ? [null, null]
                                                   : undefined,
                                             report_type: "default",
                                          },
                                       })
                                    }
                                    sx={chipStyle(theme)}
                                 />
                              </FilterChipWrapper>
                           )
                        );
                     })}
                  </>
               )}

               {/* Order */}
               {activeOrderFilters.map(([key, value]) => (
                  <FilterChipWrapper key={key} title={formatLabel(key)}>
                     <Chip
                        label={
                           Array.isArray(value) && value[0] && value[1]
                              ? `${dayjs(value[0]).format("YYYY-MM-DD")} → ${dayjs(
                                   value[1],
                                ).format("YYYY-MM-DD")}`
                              : String(value)
                        }
                        size="small"
                        onDelete={() =>
                           setFilterQueryData({
                              orderData: {
                                 ...filterQueryData.orderData,
                                 [key]: Array.isArray(value) ? undefined : "",
                              },
                           })
                        }
                        sx={chipStyle(theme)}
                     />
                  </FilterChipWrapper>
               ))}

               {/* CLEAR ALL BUTTON */}
               {hasAnyFilter && (
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
                     onClick={handleClearAll}
                  >
                     Clear
                  </Button>
               )}
            </Stack>
         </Stack>
      </Stack>
   );
};

export default Filter;

// ======================================================================
// SMALL UTILITY COMPONENTS
// ======================================================================

const FilterChipWrapper = ({
   title,
   children,
}: {
   title: string;
   children: React.ReactNode;
}) => (
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
      <Typography variant="subtitle2">{title.toUpperCase()}: </Typography>
      {children}
   </Stack>
);

const chipStyle = (theme: any) => ({
   borderRadius: 0.5,
   fontWeight: 700,
   fontSize: "0.75rem",
   bgcolor: alpha(theme.palette.grey[300], 0.1),
   color:
      theme.mode === "dark" ? theme.palette.grey[300] : theme.palette.grey[600],
});

// Convert snake_case → Normal Label
const formatLabel = (str: string) =>
   str
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
