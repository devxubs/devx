import { Stack, Grid, Avatar, Typography } from "@mui/material";
import React from "react";
import AnalyticsCard from "../components/AnalyticsCard";
import AnalyticsGraph from "../components/AnalyticsGraph";
import RadialBar from "../components/RadialBar";
import CustomTable from "@src/components/Table";
import { UserProfile } from "../../User";
import { SellerProFile } from "../../Dashboard";
import RankFilter from "./RankFilter";
import Activity from "./ActivityFilter";
import { GridCellParams } from "@mui/x-data-grid";

const rankData = [
   {
      id: 1,
      name: "John Doe",
      calls: 1500,
      conforms: 1200,
      cancels: 300,
      rank: "Top 1",
   },
   {
      id: 2,
      name: "Jane Smith",
      calls: 1300,
      conforms: 1000,
      cancels: 300,
      rank: "Top 2",
   },
   {
      id: 3,
      name: "Mike Johnson",
      calls: 1100,
      conforms: 900,
      cancels: 200,
      rank: "Top 3",
   },
];
const rankSalesmanColumns = [
   {
      field: "seller",
      headerName: "Seller",
      width: 200,
      renderCell: (params: GridCellParams) => (
         <SellerProFile
            name={params.row.name}
            url={
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-" +
               params.row.id +
               ".webp"
            }
         />
      ),
   },
   { field: "call", headerName: "Call", width: 150 },
   { field: "conform", headerName: "Conform", width: 150 },
   { field: "cancel", headerName: "Cancel", width: 150 },
   { field: "rank", headerName: "Rank", width: 150 },
   { field: "chip", headerName: "Status", width: 150 },
];

const employeeActivity = [
   {
      id: 1,
      employee: (
         <SellerProFile
            name="John Doe"
            url="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-1.webp"
         />
      ),
      name: "John Doe",
      date: "2023-09-15",
      active_time: "09:00 AM",
      inactive_time: "05:00 PM",
      activity: "Active",
      status: "Online",
      chip: "status",
      color: "success",
   },
   {
      id: 2,
      employee: (
         <SellerProFile
            name="Jane Smith"
            url="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-2.webp"
         />
      ),
      name: "Jane Smith",
      date: "2023-09-15",
      active_time: "08:30 AM",
      inactive_time: "04:30 PM",
      activity: "Active",
      status: "Online",
      chip: "status",
      color: "success",
   },
   {
      id: 3,
      employee: (
         <SellerProFile
            name="Mike Johnson"
            url="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-3.webp"
         />
      ),
      name: "Mike Johnson",
      date: "2023-09-15",
      active_time: "10:00 AM",
      inactive_time: "06:00 PM",
      activity: "Inactive",
      status: "Offline",
      chip: "status",
      color: "error",
   },
];

const employeeActivityColumns = [
   {
      field: "employee",
      headerName: "Employee",
      width: 200,
      renderCell: (params: GridCellParams) => (
         <SellerProFile
            name={params.row.name}
            url={
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-" +
               params.row.id +
               ".webp"
            }
         />
      ),
   },
   { field: "date", headerName: "Date", width: 150 },
   { field: "active_time", headerName: "Active Time", width: 150 },
   { field: "inactive_time", headerName: "Inactive Time", width: 150 },
   { field: "activity", headerName: "Activity", width: 150 },
   { field: "status", headerName: "Status", width: 150 },
];

const Employees = () => {
   return (
      <Stack>
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Employees"}
                  isPositive={true}
                  data={[10, 30, 40, 40, 30, 10, 20]}
                  value={"1000"}
                  percentage={"70%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Roles"}
                  isPositive={true}
                  data={[10, 30, 40, 40, 30, 10, 20]}
                  value={"15"}
                  percentage={"70%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Salary"}
                  isPositive={true}
                  data={[10, 30, 40, 40, 30, 10, 20]}
                  value={"190"}
               />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
               <AnalyticsGraph
                  title={"Employee by Role"}
                  isPositive={true}
                  type="category"
                  data={[
                     { x: "Admin", y: 40 },
                     { x: "Manager", y: 25 },
                     { x: "Sales", y: 20 },
                     { x: "Support", y: 15 },
                     { x: "HR", y: 10 },
                     { x: "Developer", y: 30 },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
               <RadialBar
                  title="Top Active Employee"
                  data={[
                     { label: "Satisfied", value: 85 },
                     { label: "Neutral", value: 10 },
                     { label: "Dissatisfied", value: 5 },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, md: 12 }}>
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
                     Rank
                  </Typography>

                  <CustomTable
                     rows={rankData}
                     columns={rankSalesmanColumns}
                     filter={RankFilter}
                  />
               </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 12 }}>
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
                     Active Employees
                  </Typography>
                  <CustomTable
                     rows={employeeActivity}
                     columns={employeeActivityColumns}
                     filter={Activity}
                  />
               </Stack>
            </Grid>
         </Grid>
      </Stack>
   );
};

export default Employees;
