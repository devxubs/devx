import { Stack, Grid } from "@mui/material";
import React from "react";
import AnalyticsGraph from "./AnalyticsGraph";
import AnalyticsCard from "../components/AnalyticsCard";
import CustomTable from "@src/components/Table";
import DateRangePickerCustom from "@src/components/DateRange";

const Purchases = () => {
   const tableData = {
      head: ["Purchase ID", "Supplier", "Date", "Total Amount", "Status"],
      body: [
         {
            purchase_id: "P001",
            supplier: "Supplier A",
            date: "2026-01-15",
            total_amount: "৳ 150,000",
            status: "Completed",
         },
         {
            purchase_id: "P002",
            supplier: "Supplier B",
            date: "2026-01-20",
            total_amount: "৳ 85,000",
            status: "Pending",
         },
         {
            purchase_id: "P003",
            supplier: "Supplier C",
            date: "2026-01-25",
            total_amount: "৳ 120,000",
            status: "Completed",
         },
      ],
   };

   return (
      <Stack spacing={3}>
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  title={"Total Purchases"}
                  isPositive={true}
                  data={[10, 30, 40, 40, 30, 10, 20]}
                  value={"190"}
                  percentage={"70%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  title={"Total Suppliers"}
                  isPositive={true}
                  data={[5, 30, 25, 40, 35, 20, 2]}
                  value={"50"}
                  percentage={"90%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  title={"Total Spending"}
                  isPositive={true}
                  data={[10, 30, 40, 40, 40, 10, 20]}
                  value={"901989"}
                  percentage={"98%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
               <AnalyticsCard
                  title={"Top Supplier"}
                  isPositive={true}
                  data={[30, 10, 4, 20, 40, 50, 10]}
                  value={"5"}
                  percentage={"55%"}
               />
            </Grid>
            <Grid size={{ xs: 12, md: 12 }}>
               <AnalyticsGraph
                  title={"Monthly Purchase Trend"}
                  isPositive={true}
                  type="day"
                  data={[
                     { x: "2026-01-8", y: 10000 },
                     { x: "2026-01-15", y: 30000 },
                     { x: "2026-01-19", y: 40000 },
                     { x: "2026-01-25", y: 70000 },
                     { x: "2026-01-28", y: 80000 },
                     { x: "2026-01-30", y: 90000 },
                     { x: "2026-02-9", y: 20000 },
                     { x: "2026-03-10", y: 18000 },
                     { x: "2026-04-8", y: 10000 },
                     { x: "2026-04-15", y: 30000 },
                     { x: "2026-04-19", y: 40000 },
                     { x: "2026-05-25", y: 40000 },
                     { x: "2026-06-28", y: 40000 },
                     { x: "2026-07-31", y: 10000 },
                     { x: "2026-08-9", y: 20000 },
                     { x: "2026-08-10", y: 18000 },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, md: 12 }}>
               <AnalyticsGraph
                  title={"Purchases by Supplier"}
                  isPositive={true}
                  type="category"
                  data={[
                     { x: "Supplier a", y: 24 },
                     { x: "Supplier b", y: 30 },
                     { x: "Supplier c", y: 40 },
                     { x: "Supplier d", y: 70 },
                     { x: "Supplier e", y: 80 },
                     { x: "Supplier f", y: 90 },
                     { x: "Supplier g", y: 20 },
                     { x: "Supplier h", y: 18 },
                     { x: "Supplier i", y: 10 },
                     { x: "Supplier j", y: 30 },
                     { x: "Supplier k", y: 40 },
                     { x: "Supplier l", y: 40 },
                     { x: "Supplier m", y: 40 },
                     { x: "Supplier n", y: 10 },
                     { x: "Supplier o", y: 20 },
                     { x: "Supplier p", y: 18 },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12 }}>
               <CustomTable
                  type={"default"}
                  head={tableData.head}
                  body={tableData.body}
                  filter={(d, onChange) => (
                     <DateRangePickerCustom
                        type={"range"}
                        title="Select Month"
                        value={d.reportData?.date}
                        onChange={(date) => {
                           onChange({
                              ...d,
                              reportData: {
                                 report_type: "purchases",
                                 date: date,
                              },
                           });
                        }}
                     />
                  )}
               />
            </Grid>
         </Grid>
      </Stack>
   );
};

export default Purchases;
