"use client";

import React from "react";
import { Grid, Stack, useTheme, Typography, Avatar } from "@mui/material";
import AnalyticsCard from "./AnalyticsCard";
import useGlobalState from "@src/handler/globalState";
import SalesByGender from "./SalesByGender";
import YearlySalesChart from "./YearlySalesChart";
import Scrollbar from "react-browser-scrollbar";
import SalesOverview from "./SalesOverview";
import Balance from "./Balance";
import CustomTable, { TableProps, TableRow } from "@src/components/Table";
import AnimatedAvatar from "@src/components/AnimateAvatar";

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

const SellerProFile = ({ name, url }: { name: string; url: string }) => (
  <Stack spacing={1} direction="row" alignItems="center">
    <Avatar src={url} />
    <Typography variant="body1">{name}</Typography>
  </Stack>
);

const rankSalesman: Omit<TableProps, "type"> = {
  head: ["Seller", "Call", "Conform", "Cancel", "Rank"],
  body: [
    {
      seller: (
        <SellerProFile
          name={"Ikhtiar (Repeat Sales Exicutive)"}
          url={
            "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-25.webp"
          }
        />
      ),
      call: 3000,
      conform: 2000,
      cancel: 1000,
      rank: "Top 1",
      chip: "rank",
      color: "primary",
    },
    {
      seller: (
        <SellerProFile
          name={"Mohammod siam hossian (Manager)"}
          url={
            "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-10.webp"
          }
        />
      ),
      call: 2000,
      conform: 1500,
      cancel: 500,
      rank: "Top 2",
      chip: "rank",
      color: "secondary",
    },
    {
      seller: <SellerProFile name={"Sheikh Rejvi (Team Leader)"} url={""} />,
      call: 1500,
      conform: 1000,
      cancel: 500,
      rank: "Top 3",
      chip: "rank",
      color: "success",
    },
    {
      seller: (
        <SellerProFile
          name={"Samanta Islam (Courier Exicutive)"}
          url={
            "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-11.webp"
          }
        />
      ),
      call: 1000,
      conform: 750,
      cancel: 250,
      rank: "Top 4",
      chip: "rank",
      color: "warning",
    },
    {
      seller: (
        <SellerProFile
          name={"Sumaiya Islam (Reseller)"}
          url={
            "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-13.webp"
          }
        />
      ),
      call: 750,
      conform: 500,
      cancel: 250,
      rank: "Top 5",
      chip: "rank",
      color: "error",
    },
  ],
};

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
            <CustomTable
              type="rank"
              head={rankSalesman.head}
              body={rankSalesman.body}
            />
          </Grid>
        </Grid>
      </Scrollbar>
    </Stack>
  );
};

export default Dashboard;
