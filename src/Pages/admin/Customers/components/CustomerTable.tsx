"use client";

import React, { useMemo } from "react";
import {
   Badge,
   Box,
   Button,
   Chip,
   IconButton,
   Stack,
   Tooltip,
   Typography,
} from "@mui/material";
import dayjs from "dayjs";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import { TableSkeleton } from "@src/components/SkeletonLoader";
import Icon from "@src/components/Icon";
import Customer from "../CustomerInfo";
import { CustomerRow } from "./customerFilterUtils";

interface CustomerTableProps {
   rows: CustomerRow[];
   loading: boolean;
   loadedOnce: boolean;
   activeCount: number;
   exporting: boolean;
   formatCurrency: (amount: number) => string;
   onOpenFilter: () => void;
   onOpenDetails: (row: CustomerRow) => void;
   onEditCustomer: (row: CustomerRow) => void;
   onDeleteCustomer: (row: CustomerRow) => void;
   onExport: (format: "csv" | "excel", selected: CustomerRow[]) => void;
}

const CustomerTable: React.FC<CustomerTableProps> = ({
   rows,
   loading,
   loadedOnce,
   activeCount,
   exporting,
   formatCurrency,
   onOpenFilter,
   onOpenDetails,
   onEditCustomer,
   onDeleteCustomer,
   onExport,
}) => {
   const columns: ColumnConfig[] = useMemo(
      () => [
         {
            field: "customId",
            headerName: "ID",
            width: 90,
            minWidth: 80,
            renderCell: (p: any) => (
               <Typography
                  variant="body2"
                  fontWeight={600}
                  color="primary.main"
                  sx={{
                     fontFamily: "monospace",
                     cursor: "pointer",
                     "&:hover": { textDecoration: "underline" },
                  }}
                  onClick={() => onOpenDetails(p.row)}
               >
                  {p.row.customId || "—"}
               </Typography>
            ),
         },
         {
            field: "customer",
            headerName: "Customer",
            flex: 1.2,
            minWidth: 190,
            renderCell: (p: any) => (
               <Box
                  sx={{ cursor: "pointer", minWidth: 0, width: "100%" }}
                  onClick={() => onOpenDetails(p.row)}
               >
                  <Customer
                     name={p.row.name}
                     email={p.row.email}
                     phone={p.row.phone || "-"}
                  />
               </Box>
            ),
         },
         {
            field: "totalOrders",
            headerName: "Total Orders",
            type: "number",
            width: 100,
            minWidth: 90,
            align: "right",
            headerAlign: "right",
            renderCell: (p: any) => (
               <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{
                     cursor: "pointer",
                     "&:hover": {
                        textDecoration: "underline",
                        color: "primary.main",
                     },
                  }}
                  onClick={() => onOpenDetails(p.row)}
               >
                  {p.row.totalOrders}
               </Typography>
            ),
         },
         {
            field: "totalPurchase",
            headerName: "Total Purchase",
            type: "number",
            width: 120,
            minWidth: 110,
            align: "right",
            headerAlign: "right",
            renderCell: (p: any) => (
               <Typography variant="body2">
                  {formatCurrency(p.row.totalPurchase)}
               </Typography>
            ),
         },
         {
            field: "totalPaid",
            headerName: "Total Paid",
            type: "number",
            width: 110,
            minWidth: 100,
            align: "right",
            headerAlign: "right",
            renderCell: (p: any) => (
               <Typography variant="body2">
                  {formatCurrency(p.row.totalPaid)}
               </Typography>
            ),
         },
         {
            field: "totalDue",
            headerName: "Total Due",
            type: "number",
            width: 105,
            minWidth: 95,
            align: "right",
            headerAlign: "right",
            renderCell: (p: any) =>
               p.row.totalDue > 0 ? (
                  <Typography
                     variant="body2"
                     fontWeight={700}
                     color="error.main"
                  >
                     {formatCurrency(p.row.totalDue)}
                  </Typography>
               ) : (
                  <Typography variant="body2" color="text.secondary">
                     {formatCurrency(0)}
                  </Typography>
               ),
         },
         {
            field: "lastOrderAt",
            headerName: "Last Order",
            width: 110,
            minWidth: 100,
            renderCell: (p: any) =>
               p.row.lastOrderAt ? (
                  <Typography variant="body2">
                     {dayjs(p.row.lastOrderAt).format("DD MMM YYYY")}
                  </Typography>
               ) : (
                  <Typography variant="body2" color="text.secondary">
                     Never
                  </Typography>
               ),
         },
         {
            field: "status",
            headerName: "Status",
            width: 100,
            minWidth: 90,
            chip: true,
            color: (p: any) => (p.value === "Returning" ? "info" : "success"),
         },
         { field: "@actions", headerName: "", width: 48 },
      ],
      [formatCurrency, onOpenDetails],
   );

   if (!loadedOnce && loading) {
      return <TableSkeleton rows={5} cols={5} />;
   }

   return (
      <Box
         sx={{
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            overflowX: "auto",
            borderRadius: 1,
         }}
      >
         <CustomTable
            rows={rows}
            columns={columns}
            checkBox={true}
            canPrint={false}
            canExport={false}
            filter={() => (
               <Tooltip title="Filter">
                  <Badge badgeContent={activeCount} color="primary">
                     <IconButton
                        data-testid="customer-filter-btn"
                        sx={{ color: "text.secondary" }}
                        onClick={onOpenFilter}
                     >
                        <Icon icon="solar:filters-bold-duotone" />
                     </IconButton>
                  </Badge>
               </Tooltip>
            )}
            customSelectionToolbar={(selectedRows, onClearSelection) => (
               <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
               >
                  <Chip
                     size="small"
                     color="primary"
                     label={`${selectedRows.length} customer${selectedRows.length === 1 ? "" : "s"} selected`}
                     sx={{ fontWeight: 700, borderRadius: 1 }}
                  />
                  <Button
                     size="small"
                     variant="outlined"
                     disabled={exporting}
                     onClick={() =>
                        onExport("csv", selectedRows as CustomerRow[])
                     }
                     startIcon={
                        <Icon icon="solar:file-download-bold" size="small" />
                     }
                     sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                     Export CSV
                  </Button>
                  <Button
                     size="small"
                     variant="outlined"
                     disabled={exporting}
                     onClick={() =>
                        onExport("excel", selectedRows as CustomerRow[])
                     }
                     startIcon={
                        <Icon icon="solar:file-download-bold" size="small" />
                     }
                     sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                     Export Excel
                  </Button>
                  <Button
                     size="small"
                     variant="text"
                     color="inherit"
                     disabled={exporting}
                     onClick={onClearSelection}
                     sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                     Clear Selection
                  </Button>
               </Stack>
            )}
            menuItems={[
               {
                  label: "View Details & Print",
                  onClick: (p) => onOpenDetails(p.row as CustomerRow),
               },
               {
                  label: "Edit",
                  onClick: (p) => onEditCustomer(p.row as CustomerRow),
               },
               {
                  label: "Delete",
                  color: "error",
                  onClick: (p) => onDeleteCustomer(p.row as CustomerRow),
               },
            ]}
         />
      </Box>
   );
};

export default CustomerTable;
