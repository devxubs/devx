"use client";

import { Paper, Stack, Typography } from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import CustomTable, { TableProps, Type } from "@src/components/Table";
import React, { useEffect, useState } from "react";
import { OrderItem } from "../Order";
import { products } from "../Product";
import { users } from "../User";

const option = ["Order", "Product", "User"];

const Bin = () => {
   const [selectOption, setSelectOption] = useState<string>("Order");
   const [tableData, setTableData] = useState<TableProps | null>(null);

   const typeMap: Record<string, Type> = {
      Order: "order",
      Product: "product",
      User: "user",
   };

   useEffect(() => {
      const mappedType = typeMap[selectOption];

      if (!selectOption || !mappedType) {
         setTableData(null);
         return;
      }

      let head: string[] = [];
      let body: any[] = [];

      if (mappedType === "order") {
         head = OrderItem.head.filter(
            (h) => h !== "@action" && h !== "@check" && h !== "Note"
         );
         body = OrderItem.body;
      } else if (mappedType === "product") {
         head = products.head.filter((h) => h !== "@action" && h !== "@check");
         body = products.body;
      } else if (mappedType === "user") {
         head = users.head.filter((h) => h !== "@action" && h !== "@check");
         body = users.body;
      }

      // If body is empty, set tableData to null to trigger "No data" message
      if (!body || body.length === 0) {
         setTableData(null);
      } else {
         setTableData({
            type: mappedType,
            head,
            body,
         });
      }
   }, [selectOption]);

   return (
      <Stack spacing={2}>
         <Stack direction="row">
            <CustomAutocomplete
               option={option}
               placeholder="Select"
               label="Select"
               arrow
               sx={{ width: "30%" }}
               value={selectOption}
               onChange={(v) => setSelectOption(v)}
            />
         </Stack>

         {tableData === null ? (
            <Stack
               direction="row"
               alignItems="center"
               justifyContent="center"
               height={200}
               bgcolor="background.paper"
               borderRadius={2}
            >
               <Typography color="text.secondary" variant="body1">
                  No data found
               </Typography>
            </Stack>
         ) : (
            <CustomTable
               type={tableData.type}
               head={tableData.head}
               body={tableData.body}
            />
         )}
      </Stack>
   );
};

export default Bin;
