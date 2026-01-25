import { Stack } from "@mui/material";
import CustomPopover from "@src/components/CustomPopover";
import Table from "@src/components/Table";
import DataTable from "@src/components/Table/DataTable";
import Layout from "@src/Layout";
import * as React from "react";

export default function Home() {
   return (
      <Stack p={4}>
         <DataTable />
      </Stack>
   );
}
