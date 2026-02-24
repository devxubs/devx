"use client";

import { Stack, Button, useTheme } from "@mui/material";
import Icon from "@src/components/Icon";
import React, { useState } from "react";
import AlertDialog from "@src/components/AlertDialog";
import { useRouter } from "next/navigation";
import OrderTable from "./Table";

const Order = () => {
   const router = useRouter();
   const theme = useTheme();

   // Delete dialog states
   const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
   const [productToDelete, setProductToDelete] = useState<any>(null);

   const handleDeleteConfirm = () => {
      console.log("Deleting user:", productToDelete);
      // 👉 Here you can call API or update state
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
   };

   return (
      <>
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
         <AlertDialog
            type="delete"
            open={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            title={productToDelete?.product_name}
            onConfirm={handleDeleteConfirm}
         />
      </>
   );
};

export default Order;
