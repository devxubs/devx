"use client";

import React, { useState } from "react";
import { Stack, Button, Grid, Typography, TextField } from "@mui/material";
import { GridCellParams } from "@mui/x-data-grid";

import AnalyticsCard from "@cmp/AnalyticsCard";
import Icon from "@src/components/Icon";
import { formatCompactNumber } from "@src/handler";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import CustomModal from "@src/components/Modal";
import Modal from "./Modal";

interface InfoCardProps {
   title: string;
   value: number | string;
   icon: string;
}

const InfoCard = ({ title, value, icon }: InfoCardProps) => {
   return (
      <Stack
         className="billing_info_card"
         spacing={2}
         borderRight={1}
         // borderLeft={1}
         borderRadius={2}
         borderColor={"divider"}
         bgcolor={"background.paper"}
         boxShadow={"15"}
         p={2}
         px={3}
      >
         <Stack direction={"row"} spacing={1}>
            <Icon icon={icon} size="40" />
            <Typography variant="h4">
               {typeof value === "number" ? formatCompactNumber(value) : value}
            </Typography>
         </Stack>
         <Typography variant="subtitle1" color="textSecondary">
            {title}
         </Typography>
      </Stack>
   );
};

// Random date within the last 30 days
function getRandomDate(
   start: { getTime: () => any },
   end: { getTime: () => any },
) {
   const startTime = start.getTime();
   const endTime = end.getTime();
   const randomTime = startTime + Math.random() * (endTime - startTime);
   return new Date(randomTime);
}

const rows = [
   {
      id: 1,
      date: getRandomDate(new Date(10, 4, 2026), new Date()),
      amount: 2000,
      paymentMethod: "Bank",
      status: "Pending",
   },
   {
      id: 2,
      date: getRandomDate(new Date(4, 4, 2026), new Date()),
      amount: 1000,
      paymentMethod: "Bank",
      status: "Paid",
   },
   {
      id: 3,
      date: getRandomDate(new Date(18, 4, 2026), new Date()),
      amount: 1500,
      paymentMethod: "Bank",
      status: "Paid",
   },
   {
      id: 4,
      date: getRandomDate(new Date(25, 4, 2026), new Date()),
      amount: 7000,
      paymentMethod: "Bank",
      status: "Paid",
   },
   {
      id: 5,
      date: getRandomDate(new Date(1, 4, 2026), new Date()),
      amount: 2000,
      paymentMethod: "Bank",
      status: "Paid",
   },
];

const Billing = () => {
   const [openModal, setOpenModal] = useState(false);

   const [billingData, setBillingData] = useState(rows);

   const columns: ColumnConfig[] = [
      {
         field: "id",
         headerName: "ID",
         width: 70,
      },
      {
         field: "date",
         headerName: "Date",
         width: 150,
         flex: 0.4,
         renderCell: (params: GridCellParams) => {
            const date = new Date(params.value as string);
            return (
               <Stack justifyContent={"center"} height={"100%"}>
                  <Typography variant="body2">
                     {date.toLocaleDateString()}
                  </Typography>
                  <Typography
                     variant="caption"
                     fontWeight={500}
                     color="textSecondary"
                  >
                     {date.toLocaleTimeString()}
                  </Typography>
               </Stack>
            );
         },
      },
      {
         field: "amount",
         headerName: "Amount",
         width: 100,
         flex: 0.4,
      },
      {
         field: "paymentMethod",
         headerName: "Payment Method",
         width: 150,
         flex: 0.4,
      },
      {
         field: "status",
         headerName: "Status",
         width: 100,
      },
      {
         field: "@actions",
      },
   ];

   return (
      <Stack spacing={2} py={2} height={"100%"}>
         <Stack
            direction={"row"}
            justifyContent={"flex-end"}
            alignItems={"center"}
            width={"100%"}
         >
            <Button variant="contained" onClick={() => setOpenModal(true)}>
               Make Payment
            </Button>
         </Stack>
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Received Credit"}
                  value={"2348"}
                  isPositive={true}
                  data={[10, 15, 8, 12, 20, 18, 25]}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Available Credit"}
                  value={"2348"}
                  isPositive={true}
                  data={[10, 15, 8, 12, 20, 18, 25]}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Pending Credit"}
                  value={"1234"}
                  isPositive={true}
                  data={[5, 8, 6, 10, 15, 12, 18]}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
               <InfoCard
                  title={"Total Orders"}
                  value={4243}
                  icon={"solar:cart-large-bold-duotone"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
               <InfoCard
                  title={"Per Order Charge"}
                  value={"0.51"}
                  icon={"solar:wallet-money-bold-duotone"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
               <InfoCard
                  title={"Service Charge"}
                  value={"3%"}
                  icon={"solar:hand-money-bold-duotone"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
               <InfoCard
                  title={"Total Charge"}
                  value={1234}
                  icon={"solar:watch-square-minimalistic-charge-bold-duotone"}
               />
            </Grid>

            <Grid size={12}>
               <CustomTable
                  rows={billingData}
                  columns={columns}
                  menuItems={[
                     {
                        label: "Download Invoice",
                        onClick: (row) => {
                           console.log("Download invoice for", row);
                        },
                        icon: (
                           <Icon
                              icon="solar:download-square-bold-duotone"
                              size="small"
                           />
                        ),
                     },
                     {
                        label: "Print Invoice",
                        icon: (
                           <Icon
                              icon="solar:printer-minimalistic-bold"
                              size="small"
                           />
                        ),
                        onClick: (row) => {
                           console.log("Mark as paid", row);
                        },
                     },
                  ]}
               />
            </Grid>
         </Grid>

         {/* MAKE PAYMENT MODAL */}

         <CustomModal
            open={openModal}
            onClose={() => setOpenModal(false)}
            title="Make payment"
         >
            <Modal
               onSubmit={(formData) => {
                  setBillingData((prevData) => [
                     {
                        id: prevData.length + 1,
                        date: new Date(),
                        amount: Number(formData.amount),
                        paymentMethod: formData.paymentMethod.label,
                        status: "Pending",
                     },
                     ...prevData,
                  ]);
                  setOpenModal(false);
               }}
            />
         </CustomModal>
      </Stack>
   );
};

export default Billing;
