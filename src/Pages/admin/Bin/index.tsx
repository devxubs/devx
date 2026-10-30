"use client";

import {
   IconButton,
   Stack,
   Tab,
   Tabs,
   Tooltip,
   Typography,
   useTheme,
} from "@mui/material";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import Icon from "@src/components/Icon";
import AlertDialog from "@src/components/AlertDialog";
import {
   EmployeeDetailModal,
   ProductDetailModal,
   OrderDetailModal,
   CustomerDetailModal,
   PurchaseDetailModal,
   SupplierDetailModal,
   ExpenseDetailModal,
   AssetDetailModal,
} from "@src/components/EntityDetailModals/EntityModals";

const tabs = [
   "Products",
   "Categories",
   "Units",
   "Orders",
   "Purchases",
   "Customers",
   "Suppliers",
   "Expenses",
   "Assets",
   "Users",
];

const Bin = () => {
   const theme = useTheme();
   const [val, setVal] = React.useState(0);
   const router = useRouter();
   const params = useSearchParams();
   const tab = params?.get("tab") || "products";

   const [binItems, setBinItems] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);
   const [deleteConfirmItem, setDeleteConfirmItem] = useState<any | null>(null);
   const [selectedDetail, setSelectedDetail] = useState<{ type: string; id: string } | null>(null);

   const loadBinItems = React.useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/bin");
         if (res.ok) {
            const data = await res.json();
            setBinItems(data);
         }
      } catch {}
      setLoading(false);
   }, []);

   useEffect(() => {
      loadBinItems();
   }, [loadBinItems]);

   const handleAction = async (item: any, action: "restore" | "delete") => {
      try {
         await fetch("/api/bin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: item.type, id: item.id, action }),
         });
         loadBinItems();
      } catch {}
   };

   // Map active tab to item type safely
   const tabToTypeMap: Record<string, string> = {
      users: "user",
      products: "product",
      categories: "category",
      units: "unit",
      orders: "order",
      purchases: "purchase",
      customers: "customer",
      suppliers: "supplier",
      expenses: "expense",
      assets: "asset",
   };
   const normalizedTab = (tab || "products").toLowerCase();
   const targetType = tabToTypeMap[normalizedTab] || normalizedTab.replace(/s$/, "");
   const filteredItems = useMemo(
      () => binItems.filter((i) => i.type === targetType || i.type === normalizedTab),
      [binItems, targetType, normalizedTab],
   );

   const tableColumns: ColumnConfig[] = [
      {
         field: "id",
         headerName: "ID",
         flex: 0.3,
         renderCell: (params: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="primary.main"
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() =>
                  setSelectedDetail({
                     type: params.row.type,
                     id: params.row.customId || params.row.id,
                  })
               }
            >
               {params.row.customId || params.row.id}
            </Typography>
         ),
      },
      {
         field: "name",
         headerName: "Item Name",
         flex: 1,
      },
      {
         field: "deleteDate",
         headerName: "Deleted At",
         flex: 0.8,
         renderCell: (params) => {
            const d = params.row.deletedAt ? new Date(params.row.deletedAt) : new Date();
            return d.toLocaleDateString("en-US", {
               year: "numeric",
               month: "short",
               day: "numeric",
               hour: "2-digit",
               minute: "2-digit",
            });
         },
      },
      {
         field: "@restore",
         headerName: "Actions",
         flex: 0.4,
         renderCell: (params) => (
            <Stack direction="row" spacing={1}>
               <Tooltip title="Restore" placement="top" disableInteractive>
                  <IconButton
                     size="small"
                     color="primary"
                     onClick={() => handleAction(params.row, "restore")}
                  >
                     <Icon icon="solar:restart-square-bold-duotone" />
                  </IconButton>
               </Tooltip>
               <Tooltip title="Permanent Delete" placement="top" disableInteractive>
                  <IconButton
                     size="small"
                     color="error"
                     onClick={() => setDeleteConfirmItem(params.row)}
                  >
                     <Icon icon="solar:trash-bin-trash-bold" />
                  </IconButton>
               </Tooltip>
            </Stack>
         ),
      },
   ];

   useEffect(() => {
      if (tab) {
         const tabIndex = tabs.findIndex(
            (t) => t.toLowerCase() === tab.toLowerCase(),
         );
         if (tabIndex !== -1) {
            setVal(tabIndex);
         }
      }
   }, [tab]);

   const handleChange = (event: React.SyntheticEvent, newValue: number) => {
      setVal(newValue);
      router.push(`/admin/bin?tab=${tabs[newValue].toLowerCase()}`);
   };

   return (
      <Stack spacing={2}>
         <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            justifyContent="space-between"
         >
            <Tabs
               value={val}
               onChange={handleChange}
               variant="scrollable"
               TabIndicatorProps={{
                  children: <span className="MuiTabs-indicatorSpan" />,
               }}
               sx={{
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 1,
                  width: "100%",
                  "& .MuiTabs-scroller": {
                     scrollbarWidth: "none!important",
                  },
                  "& .MuiTabs-indicator": {
                     display: "flex",
                     justifyContent: "center",
                     backgroundColor: "transparent",
                  },
                  "& .MuiTabs-indicatorSpan": {
                     height: 4,
                     backgroundColor: theme.palette.common.white,
                     ...theme.applyStyles("light", {
                        backgroundColor: theme.palette.common.black,
                     }),
                  },

                  "& .MuiButtonBase-root:last-child": {
                     m: 0,
                  },
               }}
            >
               {tabs.map((t, index) => (
                  <Tab
                     key={index}
                     label={t}
                     sx={{
                        textTransform: "none",
                        fontWeight: 500,
                        fontSize: theme.typography.pxToRem(14),
                        marginRight: theme.spacing(1),
                        color: theme.palette.text.secondary,
                        minHeight: 50,
                        width: `calc(100% / ${tabs.length} - ${theme.spacing(1)})`,
                        "&.Mui-selected": {
                           color: theme.palette.common.white,
                           ...theme.applyStyles("light", {
                              color: theme.palette.common.black,
                           }),
                        },
                     }}
                  />
               ))}
            </Tabs>
         </Stack>

         <CustomTable rows={filteredItems} columns={tableColumns} />

         {/* Permanent delete confirmation dialog */}
         <AlertDialog
            open={Boolean(deleteConfirmItem)}
            onClose={() => setDeleteConfirmItem(null)}
            type="error"
            title={`Are you sure you want to permanently delete <b>${deleteConfirmItem?.name || deleteConfirmItem?.customId || "this item"}</b>?`}
            onConfirm={async () => {
               if (deleteConfirmItem) {
                  await handleAction(deleteConfirmItem, "delete");
                  setDeleteConfirmItem(null);
               }
            }}
         />

         {/* Detail Modals */}
         <EmployeeDetailModal
            open={Boolean(selectedDetail && (selectedDetail.type === "user" || selectedDetail.type === "employee"))}
            onClose={() => setSelectedDetail(null)}
            employeeId={selectedDetail?.id}
         />

         <ProductDetailModal
            open={Boolean(selectedDetail && selectedDetail.type === "product")}
            onClose={() => setSelectedDetail(null)}
            productId={selectedDetail?.id}
         />

         <OrderDetailModal
            open={Boolean(selectedDetail && selectedDetail.type === "order")}
            onClose={() => setSelectedDetail(null)}
            orderId={selectedDetail?.id}
         />

         <CustomerDetailModal
            open={Boolean(selectedDetail && selectedDetail.type === "customer")}
            onClose={() => setSelectedDetail(null)}
            customerId={selectedDetail?.id}
         />

         <PurchaseDetailModal
            open={Boolean(selectedDetail && selectedDetail.type === "purchase")}
            onClose={() => setSelectedDetail(null)}
            purchaseId={selectedDetail?.id}
         />

         <SupplierDetailModal
            open={Boolean(selectedDetail && selectedDetail.type === "supplier")}
            onClose={() => setSelectedDetail(null)}
            supplierId={selectedDetail?.id}
         />

         <ExpenseDetailModal
            open={Boolean(selectedDetail && selectedDetail.type === "expense")}
            onClose={() => setSelectedDetail(null)}
            expenseId={selectedDetail?.id}
         />

         <AssetDetailModal
            open={Boolean(selectedDetail && selectedDetail.type === "asset")}
            onClose={() => setSelectedDetail(null)}
            assetId={selectedDetail?.id}
         />
      </Stack>
   );
};

export default Bin;
