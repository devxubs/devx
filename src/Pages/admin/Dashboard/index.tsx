"use client";

import React from "react";
import { Grid, Stack, Typography, Avatar } from "@mui/material";
import AnalyticsCard from "./AnalyticsCard";
import SalesByGender from "./SalesByGender";
import YearlySalesChart from "./YearlySalesChart";
import Scrollbar from "react-browser-scrollbar";
import SalesOverview from "./SalesOverview";
import Balance from "./Balance";
import CustomTable, { ColumnConfig } from "@src/components/Table";

const analyticsItem = [
   {
      title: "Completed",
      value: 765,
      percentage: "+2.6%",
      isPositive: true,
      data: [50, 80, 120, 110, 140, 130, 100],
   },
   {
      title: "Return",
      value: 165,
      percentage: "-1.6%",
      isPositive: false,
      data: [70, 90, 100, 60, 50, 80, 90],
   },
   {
      title: "Canceled",
      value: 950,
      percentage: "+2.6%",
      isPositive: true,
      data: [40, 70, 75, 70, 50, 28, 7, 64],
   },
];

export const SellerProFile = ({ name, url }: { name: string; url: string }) => (
   <Stack spacing={1} direction="row" alignItems="center" height={"100%"}>
      <Avatar src={url} />
      <Typography variant="body1">{name}</Typography>
   </Stack>
);

const columns: ColumnConfig[] = [
   {
      field: "seller",
      headerName: "Seller",
      flex: 1,
      renderCell: (params) => {
         const row = params.row;
         return <SellerProFile name={row.seller.name} url={row.seller.url} />;
      },
   },
   { field: "call", headerName: "Call" },
   { field: "conform", headerName: "Conform" },
   { field: "cancel", headerName: "Cancel" },
   { field: "rank", headerName: "Rank", chip: true },
];
const rows = [
   {
      id: 1,
      seller: { name: "Jubayer Ahmed", url: "/assets/avatar.jpg" },
      call: 120,
      conform: 110,
      cancel: 10,
      rank: "A",
      color: "primary",
   },
   {
      id: 2,
      seller: { name: "Najrul Ahmed", url: "/assets/avatar.jpg" },
      call: 80,
      conform: 60,
      cancel: 20,
      rank: "B",
      color: "secondary",
   },
   {
      id: 3,
      seller: { name: "Sajib Ahmed", url: "/assets/avatar.jpg" },
      call: 100,
      conform: 70,
      cancel: 30,
      rank: "C",
      color: "warning",
   },
   {
      id: 4,
      seller: { name: "Sajib Ahmed", url: "/assets/avatar.jpg" },
      call: 100,
      conform: 70,
      cancel: 30,
      rank: "D",
      color: "error",
   },
   {
      id: 5,
      seller: { name: "Sajib Ahmed", url: "/assets/avatar.jpg" },
      call: 100,
      conform: 70,
      cancel: 30,
      rank: "E",
      color: "info",
   },
];

const Dashboard = () => {
   return (
      <Stack>
         <Scrollbar autoHide thumbSize={6} darkMode>
            <Grid container spacing={3}>
               {analyticsItem.map((item, idx) => {
                  return (
                     <Grid size={{ xs: 12, md: 4 }} key={idx}>
                        <AnalyticsCard {...item} />
                     </Grid>
                  );
               })}
               <Grid size={{ xs: 12, md: 4 }}>
                  <SalesByGender />
               </Grid>
               <Grid size={{ xs: 12, md: 8 }}>
                  <YearlySalesChart />
               </Grid>
               <Grid size={{ xs: 12, md: 8 }}>
                  <SalesOverview />
               </Grid>
               <Grid size={{ xs: 12, md: 4 }}>
                  <Balance />
               </Grid>
               <Grid size={{ xs: 12, md: 12 }}>
                  <CustomTable rows={rows} columns={columns} />
               </Grid>
            </Grid>
         </Scrollbar>
      </Stack>
   );
};

export default Dashboard;
