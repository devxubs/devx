"use client";

import { Stack, Typography } from "@mui/material";
import CustomTable from "@src/components/Table";
import React from "react";
import Customer from "../../../components/CustomerInfo";
import { orders } from "../Order/data";
import { OrderType } from "../Order/type";

const cOrder = (orders as OrderType[]).map((o, i) => {
   const total = orders.filter(
      (order) =>
         order.customer.phone === o.customer.phone &&
         order.customer.email === o.customer.email
   );
   const success = total.filter((ts) => ts.status === "Completed");
   const failed = total.filter((tf) => tf.status === "Cancelled");
   return {
      ...o,
      id: o.customer.id,
      customer: (
         <Customer
            name={o.customer.name}
            email={o.customer.email}
            number={o.customer.phone}
         />
      ),
      total: total.length,
      success: success.length,
      failed: failed.length,
   };
});

const Customers = () => {
   const customer = {
      head: ["@check", "Id", "Customer", "Total", "Success", "Failed"],
      body: cOrder as any,
   };

   return (
      <Stack>
         <CustomTable
            type={"default"}
            head={customer.head}
            body={customer.body}
         />
      </Stack>
   );
};

export default Customers;
