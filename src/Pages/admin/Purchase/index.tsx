"use client";

import {
   Alert,
   Button,
   Stack,
   useTheme,
   IconButton,
   Tooltip,
   Typography,
   TextField,
} from "@mui/material";
import { GridRenderCellParams } from "@mui/x-data-grid";
import AlertDialog from "@src/components/AlertDialog";
import Icon from "@src/components/Icon";
import CustomModal from "@src/components/Modal";
import CustomTable, { ColumnConfig, MenuItem } from "@src/components/Table";
import { TableSkeleton } from "@src/components/SkeletonLoader";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import { fetchAllPages } from "@src/lib/fetchAllPages";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { PurchaseDetailModal, SupplierDetailModal } from "@src/components/EntityDetailModals/EntityModals";
import PurchaseReturnForm from "@src/components/EntityDetailModals/PurchaseReturnForm";

// Client mirror of lib/auth.ts normalizePermissions (same key
// normalisation the Sidebar uses: lower-case, spaces → underscores;
// both stored permission shapes).
function normalizePermissions(raw: unknown): Record<string, boolean> {
   const out: Record<string, boolean> = {};
   if (!raw) return out;
   if (Array.isArray(raw)) {
      for (const entry of raw as any[]) {
         if (entry && typeof entry === "object") {
            const key = String(entry.key || entry.name || "")
               .trim()
               .toLowerCase()
               .replace(/\s+/g, "_");
            if (key) out[key] = entry.allow !== false && entry.value !== false;
         } else if (typeof entry === "string") {
            out[entry.trim().toLowerCase().replace(/\s+/g, "_")] = true;
         }
      }
      return out;
   }
   if (typeof raw === "object") {
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
         out[k.trim().toLowerCase().replace(/\s+/g, "_")] =
            v === true || v === "true";
      }
   }
   return out;
}

// The same permission family the purchase-returns API enforces
// server-side (POST /api/purchases/[id]/returns). The menu item is
// only a shortcut — the API gate stays authoritative.
const RETURN_GATE_KEYS = [
   "suppliers",
   "supplier",
   "supplier_update",
   "purchases",
   "purchase_update",
];

export type PurchaseTypes = {
   id: number | string;
   customId?: string;
   date: string; // YYYY-MM-DD
   invoice: string;
   supplier: string;
   supplierId?: string;
   product: {
      id?: string;
      name: string;
      code: string;
      quantity: number;
      price: number;
      sub_total: number;
      images: string;
   };
   product_amount: number;
   others_cost?: number;
   discount?: number;
   total: number;
   pay: number;
   advance: number;
   due: number;
   note?: string;
   attachments?: {
      name: string;
      url: string;
      type?: string;
      size?: number;
   }[];
};
export const purchaseData: PurchaseTypes[] = [];

const Purchase = () => {
   const theme = useTheme();
   const router = useRouter();
   const { filterQueryData } = useFilterQuery();
   const searchText = filterQueryData.searchText || "";
   const [purchases, setPurchases] = useState<PurchaseTypes[]>([]);
   const [loading, setLoading] = useState(false);
   const [detailPurchaseId, setDetailPurchaseId] = useState<string | null>(null);
   const [detailSupplierId, setDetailSupplierId] = useState<string | null>(null);
   // Purchase Return shortcut (row Action Menu): the full purchase
   // (items + stock) is fetched on demand and handed to the SAME
   // PurchaseReturnForm the purchase detail modal uses — no second
   // return flow. Visibility follows the returns API permission
   // family, loaded like the Sidebar loads it.
   const [canReturn, setCanReturn] = useState(false);
   const [returnPurchase, setReturnPurchase] = useState<any | null>(null);
   const [returnError, setReturnError] = useState<string | null>(null);

   React.useEffect(() => {
      let cancelled = false;
      fetch("/api/auth/me")
         .then((r) => (r.ok ? r.json() : null))
         .then((data) => {
            if (cancelled || !data?.user) return;
            const perms = normalizePermissions(
               data.user.roleDetails?.permissions,
            );
            setCanReturn(
               perms["all"] === true ||
                  RETURN_GATE_KEYS.some((k) => perms[k] === true) ||
                  Object.entries(perms).some(
                     ([key, granted]) =>
                        granted &&
                        (key.startsWith("purchases_") ||
                           key.startsWith("purchase_") ||
                           key.startsWith("suppliers_") ||
                           key.startsWith("supplier_")),
                  ),
            );
         })
         .catch(() => {});
      return () => {
         cancelled = true;
      };
   }, []);

   const openReturnFlow = React.useCallback(async (row: PurchaseTypes) => {
      setReturnError(null);
      try {
         const res = await fetch(`/api/purchases/${row.id}`);
         if (!res.ok) throw new Error("load failed");
         const data = await res.json();
         setReturnPurchase(data);
      } catch {
         setReturnError(
            "Could not load that purchase for returning. Please try again.",
         );
      }
   }, []);
   // Phase 2 (2.1): server-side pagination + toolbar search — the API
   // already accepts page/limit/search and returns the filtered total;
   // the list previously fetched a flat limit=100 with no search wiring.
   const [paginationModel, setPaginationModel] = useState({
      page: 0,
      pageSize: 25,
   });
   const [totalPurchases, setTotalPurchases] = useState(0);
   const [loadError, setLoadError] = useState(false);

   // Phase 2 (2.3): global-search deep link — /admin/purchase?purchase=<id>
   React.useEffect(() => {
      const id = new URLSearchParams(window.location.search).get("purchase");
      if (id) setDetailPurchaseId(id);
   }, []);

   const loadPurchases = React.useCallback(async () => {
      setLoading(true);
      try {
         const params = new URLSearchParams();
         params.set("page", String(paginationModel.page + 1));
         params.set("limit", String(paginationModel.pageSize));
         if (searchText.trim()) params.set("search", searchText.trim());
         const res = await fetch(`/api/purchases?${params.toString()}`);
         if (res.ok) {
            const data = await res.json();
            const mapped = (data.purchases || []).map((p: any) => ({
               id: p.id,
               customId: p.customId,
               date: p.createdAt ? new Date(p.createdAt).toISOString().split("T")[0] : "",
               invoice: p.invoice || p.customId,
               supplier: p.supplier?.name || "Direct Supplier",
               supplierId: p.supplierId || p.supplier?.id || p.supplier?.customId,
               product: {
                  name: p.items?.[0]?.name || "Purchased Goods",
                  code: p.items?.[0]?.code || "",
                  quantity: p.items?.[0]?.quantity || 1,
                  price: Number(p.items?.[0]?.price) || 0,
                  sub_total: Number(p.items?.[0]?.subtotal) || 0,
                  images: "",
               },
               product_amount: Number(p.productAmount),
               others_cost: Number(p.othersCost),
               discount: Number(p.discount),
               total: Number(p.total),
               pay: Number(p.paid),
               advance: 0,
               due: Number(p.due),
               note: p.note || "",
               attachments: p.attachments || [],
            }));
            setPurchases(mapped);
            setTotalPurchases(Number(data.total ?? mapped.length));
            setLoadError(false);
         } else {
            setLoadError(true);
         }
      } catch {
         setLoadError(true);
      } finally {
         setLoading(false);
      }
   }, [paginationModel, searchText]);

   React.useEffect(() => {
      loadPurchases();
   }, [loadPurchases]);

   // Search changes return to the first page.
   React.useEffect(() => {
      setPaginationModel((prev) =>
         prev.page === 0 ? prev : { ...prev, page: 0 },
      );
   }, [searchText]);

   // note
   const [note, setNote] = useState<string>("");
   const [updateNote, setUpdateNote] = useState<PurchaseTypes | null>(null);

   // delete
   const [deleteItem, setDeleteItem] = useState<PurchaseTypes | null>(null);

   const columns: ColumnConfig[] = [
      {
         field: "customId",
         headerName: "Purchase ID",
         width: 110,
         renderCell: (params: any) => (
            <Typography
               variant="body2"
               fontWeight={700}
               color="primary.main"
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => setDetailPurchaseId(params.row.customId || params.row.id)}
            >
               {params.row.customId || params.row.id}
            </Typography>
         ),
      },
      {
         field: "invoice",
         headerName: "Invoice ID",
         width: 130,
         renderCell: (params: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="secondary.main"
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => setDetailPurchaseId(params.row.customId || params.row.invoice || params.row.id)}
            >
               {params.row.invoice || "N/A"}
            </Typography>
         ),
      },
      {
         field: "date",
         headerName: "Date",
         width: 110,
      },
      {
         field: "supplier",
         headerName: "Supplier",
         renderCell: (params: any) => (
            <Typography
               variant="body2"
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline", color: "primary.main" } }}
               onClick={() => setDetailSupplierId(params.row.supplierId || params.row.supplier)}
            >
               {params.row.supplier}
            </Typography>
         ),
      },
      {
         field: "product",
         headerName: "Product",
         valueFormatter: (value: any) => value.name,
      },
      {
         field: "product_amount",
         headerName: "Product Amount",
      },
      {
         field: "others_cost",
         headerName: "Others Cost",
      },
      {
         field: "discount",
         headerName: "Discount",
      },
      {
         field: "total",
         headerName: "Total",
      },
      {
         field: "note",
         headerName: "Note",
         renderCell: (params) => (
            <Tooltip
               title={
                  params.row.note?.length === 20
                     ? params.row.note.slice(0, 20) + "..."
                     : params.row.note
               }
               disableInteractive
            >
               <IconButton
                  size="small"
                  onClick={() => {
                     setUpdateNote(params.row);
                     setNote(params.row.note || "");
                  }}
               >
                  <Icon icon="solar:notes-bold-duotone" size="small" />
               </IconButton>
            </Tooltip>
         ),
      },
      {
         field: "@actions",
         headerName: "",
      },
   ];

   // Action menu for each row
   const actionMenu: MenuItem[] = [
      {
         label: "view",
         icon: <Icon icon="solar:eye-bold" size="small" />,
         onClick: (params: GridRenderCellParams) => {
            setDetailPurchaseId(params.row.customId || params.row.invoice || params.row.id);
         },
      },
      {
         label: "edit",
         icon: <Icon icon="solar:pen-bold" size="small" />,
         onClick: (params: GridRenderCellParams) => {
            router.push("/admin/purchase/publish?id=" + params.row.id);
         },
      },
      {
         label: "print",
         icon: <Icon icon="solar:printer-minimalistic-bold" size="small" />,
         color: undefined,
         onClick: (params: GridRenderCellParams) => {
            setDetailPurchaseId(params.row.customId || params.row.invoice || params.row.id);
         },
      },
      {
         label: "delete",
         color: "error",
         onClick: (params: GridRenderCellParams) => {
            setDeleteItem(params.row);
         },
         icon: (
            <Icon
               icon="solar:trash-bin-trash-bold"
               size="small"
               color="error"
            />
         ),
      },
      // Purchase Return — same flow as the detail modal's
      // "Return Items" (existing form, API and settlement rules).
      // Shown only with the returns permission family; whether a
      // specific purchase still has returnable units is answered by
      // the form itself (per-line returnable caps) and re-validated
      // by the API, so no parallel eligibility rules live here.
      ...(canReturn
         ? [
              {
                 label: "Purchase Return",
                 icon: <Icon icon="solar:undo-left-bold" size="small" />,
                 onClick: (params: GridRenderCellParams) => {
                    openReturnFlow(params.row);
                 },
              },
           ]
         : []),
   ];

   return (
      <Stack spacing={2} py={2}>
         {/* Header */}
         <Stack direction="row" justifyContent="flex-end" spacing={2}>
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
               onClick={() => router.push("/admin/purchase/publish")}
            >
               Add purchase
            </Button>
         </Stack>
         {loadError && !loading && (
            <Alert
               severity="error"
               action={
                  <Button color="inherit" size="small" onClick={loadPurchases}>
                     Retry
                  </Button>
               }
            >
               Failed to load purchases. Please try again.
            </Alert>
         )}
         {returnError && (
            <Alert severity="error" onClose={() => setReturnError(null)}>
               {returnError}
            </Alert>
         )}
         {loading && purchases.length === 0 ? (
            <TableSkeleton rows={5} cols={6} />
         ) : (
            <CustomTable
               rows={purchases}
               columns={columns}
               serverPagination
               loading={loading}
               rowCount={totalPurchases}
               paginationModel={paginationModel}
               onPaginationModelChange={setPaginationModel}
               checkBox
               hideSelectionActions={true}
               canPrint={true}
               canExport={true}
               printConfig={{
                  title: "DevX POS - Purchases Summary Register",
               }}
               exportConfig={{
                  filename: `Purchases_Summary_${new Date().toISOString().split("T")[0]}`,
                  title: "DevX POS - Purchases Summary",
                  fetchAllData: async () => {
                     // PERF-03: page through the list API in
                     // bounded chunks; same rows, same order. A
                     // failed page makes fetchAllPages throw and the
                     // export dialog shows the error instead of
                     // exporting partial data as the complete set.
                     const purchases = await fetchAllPages(
                        (page, limit) => `/api/purchases?page=${page}&limit=${limit}`,
                        (d) => d.purchases || [],
                        (d) => d.total,
                     );
                     return purchases.map((p: any) => ({
                        // Real identity only — the old fallback
                        // fabricated PUR_<row index> when customId
                        // was missing (same anti-pattern removed
                        // from Reports in the runtime-fix round).
                        id: p.customId || p.id,
                        invoice: p.invoice || "-",
                        date: p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : "-",
                        supplier: p.supplier?.name || "-",
                        total: Number(p.totalAmount || 0),
                        paid: Number(p.paid || 0),
                        due: Number(p.due || 0),
                        status: p.status || "RECEIVED",
                     }));
                  },
                  summaryRows: (data: any[]) => {
                     const totalSum = data.reduce((acc, row) => acc + (Number(row.total) || 0), 0);
                     return [
                        { label: "Total Purchases Count:", value: String(data.length) },
                        { label: "Grand Total Value:", value: `৳ ${totalSum.toFixed(2)}`, isTotal: true },
                     ];
                  },
               }}
               menuItems={actionMenu}
            />
         )}

         <CustomModal
            open={Boolean(updateNote)}
            onClose={() => {
               setUpdateNote(null);
            }}
            title="Note"
            sx={{
               width: 300,
            }}
         >
            <TextField
               label="Note"
               fullWidth
               multiline
               minRows={2}
               maxRows={3}
               value={note || ""}
               onChange={(e) => setNote(e.target.value || "")}
            />
            <Stack
               spacing={2}
               direction="row"
               justifyContent="flex-end"
               width="100%"
               mt={2}
            >
               <Button
                  variant="text"
                  color="inherit"
                  onClick={() => setUpdateNote(null)}
               >
                  Cancel
               </Button>

               <Button
                  variant="contained"
                  color="primary"
                  onClick={async () => {
                     if (updateNote) {
                        // Phase 2 (2.4): persist the note through the
                        // purchases API — this dialog previously updated
                        // only local state, so the note vanished on the
                        // next reload.
                        try {
                           const res = await fetch(
                              `/api/purchases/${updateNote.id}`,
                              {
                                 method: "PUT",
                                 headers: {
                                    "Content-Type": "application/json",
                                 },
                                 body: JSON.stringify({ note }),
                              },
                           );
                           if (!res.ok) throw new Error("save failed");
                           setPurchases((prev) =>
                              prev.map((item) =>
                                 item.id === updateNote.id
                                    ? { ...item, note: note }
                                    : item,
                              ),
                           );
                           setUpdateNote(null);
                        } catch {
                           // Keep the dialog open so the note is not lost.
                        }
                     }
                  }}
                  sx={
                     {
                        // position: "relative",
                        // overflow: "hidden",
                     }
                  }
               >
                  Submit
               </Button>
            </Stack>
         </CustomModal>

         <AlertDialog
            open={Boolean(deleteItem)}
            onClose={function (): void {
               setDeleteItem(null);
            }}
            onConfirm={async () => {
               if (deleteItem) {
                  try {
                     await fetch(`/api/purchases/${deleteItem.id}`, { method: "DELETE" });
                  } catch {}
                  setPurchases((prev) =>
                     prev.filter((item) => item.id !== deleteItem.id),
                  );
                  setDeleteItem(null);
               }
            }}
            type={"error"}
            title={`Are you sure want to delete "${deleteItem?.invoice}"?`}
         />

         <PurchaseDetailModal
            open={Boolean(detailPurchaseId)}
            onClose={() => setDetailPurchaseId(null)}
            purchaseId={detailPurchaseId}
         />

         <SupplierDetailModal
            open={Boolean(detailSupplierId)}
            onClose={() => setDetailSupplierId(null)}
            supplierId={detailSupplierId}
         />

         <PurchaseReturnForm
            purchase={returnPurchase}
            open={Boolean(returnPurchase)}
            onClose={() => setReturnPurchase(null)}
            onSaved={() => {
               setReturnPurchase(null);
               loadPurchases();
            }}
         />
      </Stack>
   );
};

export default Purchase;
