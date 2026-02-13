"use client";

import { Stack, Typography } from "@mui/material";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import React from "react";
import Customer from "./CustomerInfo";

const CustomersData = [
   {
      id: 1,
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+8801712345678",
      total: 25,
      success: 20,
      failed: 5,
   },
   {
      id: 2,
      name: "Sarah Ahmed",
      email: "sarah.ahmed@example.com",
      phone: "+8801812345678",
      total: 18,
      success: 15,
      failed: 3,
   },
   {
      id: 3,
      name: "Michael Lee",
      email: "michael.lee@example.com",
      phone: "+8801912345678",
      total: 30,
      success: 28,
      failed: 2,
   },
   {
      id: 4,
      name: "Fatima Khan",
      email: "fatima.khan@example.com",
      phone: "+8801612345678",
      total: 12,
      success: 9,
      failed: 3,
   },
   {
      id: 5,
      name: "David Smith",
      email: "david.smith@example.com",
      phone: "+8801512345678",
      total: 40,
      success: 35,
      failed: 5,
   },
   {
      id: 6,
      name: "Ayesha Rahman",
      email: "ayesha.rahman@example.com",
      phone: "+8801312345678",
      total: 22,
      success: 19,
      failed: 3,
   },
   {
      id: 7,
      name: "Daniel Brown",
      email: "daniel.brown@example.com",
      phone: "+8801412345678",
      total: 15,
      success: 10,
      failed: 5,
   },
   {
      id: 8,
      name: "Nusrat Jahan",
      email: "nusrat.jahan@example.com",
      phone: "+8801212345678",
      total: 27,
      success: 25,
      failed: 2,
   },
   {
      id: 9,
      name: "Robert Wilson",
      email: "robert.wilson@example.com",
      phone: "+8801112345678",
      total: 33,
      success: 30,
      failed: 3,
   },
   {
      id: 10,
      name: "Tanvir Hasan",
      email: "tanvir.hasan@example.com",
      phone: "+8801012345678",
      total: 19,
      success: 14,
      failed: 5,
   },
];

const Customers = () => {
   const columns: ColumnConfig[] = [
      { field: "id", headerName: "Id", flex: 0 },
      {
         field: "customer",
         headerName: "Customer",
         flex: 1,
         renderCell: (p) => {
            console.log(p.row);

            return (
               <Customer
                  name={p.row.name}
                  email={p.row.email}
                  phone={p.row.phone}
               />
            );
         },
      },
      { field: "total", headerName: "Total Orders" },
      { field: "success", headerName: "Success Orders" },
      { field: "failed", headerName: "Failed Orders" },
   ];

   return (
      <Stack>
         <CustomTable
            rows={CustomersData}
            columns={columns}
            checkBox={true}
            menuItems={[]}
         />
      </Stack>
   );
};

export default Customers;
