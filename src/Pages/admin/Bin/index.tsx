"use client";

import {
   Alert,
   Button,
   IconButton,
   Snackbar,
   Stack,
   Tab,
   Tabs,
   Tooltip,
   Typography,
   useTheme,
} from "@mui/material";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import { filterRowsBySearch } from "@src/lib/tableSearch";
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
   // Phase 1 (1.8): the "Users" tab is removed. The Bin API (BIN-01
   // fix) deliberately excludes users — accounts have no soft-delete,
   // and INACTIVE/SUSPENDED status is managed in User Management — so
   // the tab was permanently empty and taught a wrong mental model.
];

const Bin = () => {
   const theme = useTheme();
   const [val, setVal] = React.useState(0);
   const router = useRouter();
   const params = useSearchParams();
   const tab = params?.get("tab") || "products";

   const [binItems, setBinItems] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);
   // Phase 2 (2.6): standard list feedback states — a failed load must
   // be visible with a retry, and restore/delete must confirm via
   // Snackbar instead of failing silently.
   const [loadError, setLoadError] = useState<string | null>(null);
   const [snackbar, setSnackbar] = useState<{
      open: boolean;
      message: string;
      severity: "success" | "error";
   }>({ open: false, message: "", severity: "success" });
   const [deleteConfirmItem, setDeleteConfirmItem] = useState<any | null>(null);
   const [selectedDetail, setSelectedDetail] = useState<{ type: string; id: string } | null>(null);

   const loadBinItems = React.useCallback(async () => {
      setLoading(true);
      setLoadError(null);
      try {
         const res = await fetch("/api/bin");
         if (res.ok) {
            const data = await res.json();
            setBinItems(data);
         } else {
            setLoadError("Failed to load deleted items.");
         }
      } catch {
         setLoadError("Failed to load deleted items.");
      }
      setLoading(false);
   }, []);

   useEffect(() => {
      loadBinItems();
   }, [loadBinItems]);

   const handleAction = async (item: any, action: "restore" | "delete") => {
      try {
         const res = await fetch("/api/bin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: item.type, id: item.id, action }),
         });
         if (!res.ok) throw new Error("request failed");
         setSnackbar({
            open: true,
            message:
               action === "restore"
                  ? "Item restored successfully."
                  : "Item permanently deleted.",
            severity: "success",
         });
         loadBinItems();
      } catch {
         setSnackbar({
            open: true,
            message:
               action === "restore"
                  ? "Failed to restore the item."
                  : "Failed to delete the item.",
            severity: "error",
         });
      }
   };

   // Map active tab to item type safely
   const tabToTypeMap: Record<string, string> = {
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
   // Phase B4b (P1-5): consume the shared toolbar search — the bin
   // loads its complete item set in one fetch, so the term filters
   // the active tab's rows client-side (lib/tableSearch) over the
   // displayed name / ID fields, on top of the existing tab filter.
   const { filterQueryData } = useFilterQuery();
   const searchText = filterQueryData.searchText || "";
   const filteredItems = useMemo(
      () =>
         filterRowsBySearch(
            binItems.filter(
               (i) => i.type === targetType || i.type === normalizedTab,
            ),
            searchText,
            ["name", "customId", "id"],
         ),
      [binItems, targetType, normalizedTab, searchText],
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
         // Phase 3A (BIN-03): deletedAt is now a real column, set by
         // every delete path and cleared on restore. Rows deleted
         // before BIN-03 have deletedAt = NULL — render those honestly
         // as "Not recorded" (last-modified time in the tooltip)
         // instead of presenting updatedAt as the deletion time.
         headerName: "Deleted At",
         flex: 0.8,
         renderCell: (params) => {
            if (params.row.deletedAt) {
               const d = new Date(params.row.deletedAt);
               return d.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
               });
            }
            return (
               <Tooltip
                  title={
                     params.row.updatedAt
                        ? `Deletion time not recorded (deleted before BIN-03). Last modified ${new Date(params.row.updatedAt).toLocaleString()}`
                        : "Deletion time not recorded"
                  }
                  placement="top"
                  disableInteractive
               >
                  <Typography variant="body2" color="text.secondary">
                     Not recorded
                  </Typography>
               </Tooltip>
            );
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

         {loadError && (
            <Alert
               severity="error"
               action={
                  <Button color="inherit" size="small" onClick={loadBinItems}>
                     Retry
                  </Button>
               }
            >
               {loadError}
            </Alert>
         )}

         <CustomTable rows={filteredItems} columns={tableColumns} />

         <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
         >
            <Alert
               severity={snackbar.severity}
               onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
               sx={{ width: "100%" }}
            >
               {snackbar.message}
            </Alert>
         </Snackbar>

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
