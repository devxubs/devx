"use client";

import { Stack, Button, useTheme } from "@mui/material";
import Icon from "@src/components/Icon";
import React from "react";
import { useRouter } from "next/navigation";
import OrderTable from "./Table";

const Order = () => {
   const router = useRouter();
   const theme = useTheme();

   return (
      <Stack spacing={2} py={2}>
         {/* Header */}
         <Stack direction={"row"} justifyContent={"flex-end"} spacing={2}>
            <Button
               variant="contained"
               color="primary"
               startIcon={
                  <Icon
                     icon="mingcute:add-line"
                     style={{
                        color: theme.palette.text.primary,
                     }}
                  />
               }
               onClick={() => router.push("/admin/order/publish")}
            >
               Create order
            </Button>
         </Stack>
         <Stack width={"100%"} overflow={"hidden"}>
            <OrderTable />
         </Stack>
      </Stack>
   );
};

export default Order;
