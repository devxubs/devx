"use client";

import { Alert, Grid, Stack, Typography } from "@mui/material";
import CustomerInfo from "@src/Pages/admin/Customers/CustomerInfo";
import CustomTable from "@src/components/Table";
import DateRange from "@src/components/DateRange";
import React, { useState, useEffect, useCallback } from "react";
import AnalyticsCard from "@cmp/AnalyticsCard";
import { CustomerDetailModal } from "@src/components/EntityDetailModals/EntityModals";
import { fetchAllReportRows, reportParams } from "../reportExport";
import { formatCompactNumber } from "@src/lib/utils";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import { filterRowsBySearch } from "@src/lib/tableSearch";

export const customerOrderData: any[] = [];

const Customer = () => {
   const [report, setReport] = useState<any>(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
   const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
   // Phase B4b (P1-5): consume the shared toolbar search — the
   // reports API has no search parameter, so the term filters the
   // displayed customer rows client-side (lib/tableSearch). The
   // headline cards keep their complete-dataset figures.
   const { filterQueryData } = useFilterQuery();
   const searchText = filterQueryData.searchText || "";

   const loadCustomerReport = useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch(
            `/api/reports?${reportParams("customers", dateRange).toString()}`,
         );
         if (res.ok) {
            const data = await res.json();
            setReport(data);
            setError(null);
         } else {
            setError("Failed to load the customer report. The figures below may be out of date.");
         }
      } catch {
         setError("Failed to load the customer report. The figures below may be out of date.");
      }
      setLoading(false);
   }, [dateRange]);

   useEffect(() => {
      loadCustomerReport();
   }, [loadCustomerReport]);

   const hasRange = Boolean(dateRange[0] || dateRange[1]);

   const columns = [
      {
         field: "customId",
         headerName: "Customer ID",
         width: 140,
         renderCell: (params: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="primary.main"
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => setSelectedCustomerId(params.row.id)}
            >
               {params.row.customId || "—"}
            </Typography>
         ),
      },
      {
         field: "customerName",
         headerName: "Customer",
         width: 200,
         renderCell: (params: any) => (
            <Stack
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => setSelectedCustomerId(params.row.id)}
            >
               <CustomerInfo
                  name={params.row.customerName}
                  phone={params.row.phone}
               />
            </Stack>
         ),
      },
      {
         field: "lastOrderAt",
         headerName: "Last Order At",
         width: 150,
         renderCell: (params: any) => (
            <Stack justifyContent="center" height={"100%"}>
               <Typography variant="body2" color="textPrimary">
                  {params.row.lastOrderAt || "N/A"}
               </Typography>
            </Stack>
         ),
      },
      {
         field: "totalOrders",
         headerName: "Total Orders",
         width: 150,
      },
      {
         field: "completedOrders",
         headerName: "Completed Orders",
         width: 150,
      },
      {
         field: "failedOrders",
         headerName: "Failed Orders",
         width: 150,
      },
      {
         field: "address",
         headerName: "Address",
         width: 300,
      },
   ];

   const rows = report?.rows || [];
   const filteredRows: any[] = React.useMemo(
      () =>
         filterRowsBySearch(report?.rows || [], searchText, [
            "customerName",
            "phone",
            "email",
            "address",
            "customId",
            "id",
         ]),
      [report, searchText],
   );
   const totalCustomers = report?.totalCustomers || rows.length;
   const activeCustomers = report?.activeCustomers || rows.filter((r: any) => r.totalOrders > 0).length;
   const repeatCustomers = report?.returningCustomers || rows.filter((r: any) => r.totalOrders > 1).length;

   return (
      <Stack spacing={2}>
         {error && <Alert severity="error">{error}</Alert>}
         {/* Honest scope caption: order counts follow the selected
             period; the customer list and Total Customers are current
             records and are not date-filtered. */}
         <Typography variant="caption" color="text.secondary">
            {hasRange
               ? "Order counts, Last Order At, Active and Repeat figures count only orders placed in the selected period. The customer list and Total Customers are current records."
               : "Order counts are all-time. Pick a date range in the table filter to count only orders from a specific period."}
         </Typography>
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Customers"}
                  isPositive={true}
                  value={formatCompactNumber(totalCustomers)}
                  tone="primary"
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Active Customers"}
                  isPositive={true}
                  value={formatCompactNumber(activeCustomers)}
                  tone="success"
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Repeat Customers"}
                  isPositive={true}
                  value={formatCompactNumber(repeatCustomers)}
                  tone="secondary"
               />
            </Grid>
            <Grid size={{ xs: 12 }}>
               <Stack
                  spacing={2}
                  bgcolor={"background.paper"}
                  sx={{
                     borderRadius: 1.5,
                  }}
               >
                  <Typography
                     variant="h5"
                     fontWeight={700}
                     sx={{
                        px: 3,
                        pt: 2,
                        pb: 0,
                     }}
                  >
                     Customer Records
                  </Typography>

                  <CustomTable
                     rows={filteredRows}
                     columns={columns}
                     loading={loading}
                     checkBox={true}
                     canExport={true}
                     canPrint={true}
                     exportConfig={{
                        filename: `Customers_Report_${new Date().toISOString().split("T")[0]}`,
                        title: "DevX POS - Customers Analytics Report",
                        fetchAllData: () =>
                           fetchAllReportRows(reportParams("customers", dateRange), (d) => d.rows || []),
                     }}
                     printConfig={{
                        title: "DevX POS - Customers Analytics Report",
                     }}
                     filter={(data, onChange) => (
                        <DateRange
                           title="Filter by Order Date"
                           value={dateRange}
                           onChange={(v: [Date | null, Date | null]) => {
                              setDateRange(v);
                           }}
                        />
                     )}
                  />
               </Stack>
            </Grid>
         </Grid>

         <CustomerDetailModal
            open={Boolean(selectedCustomerId)}
            onClose={() => setSelectedCustomerId(null)}
            customerId={selectedCustomerId}
         />
      </Stack>
   );
};

export default Customer;
