"use client";

import {
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
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { PurchaseDetailModal, SupplierDetailModal } from "@src/components/EntityDetailModals/EntityModals";

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
   const [purchases, setPurchases] = useState<PurchaseTypes[]>([]);
   const [loading, setLoading] = useState(false);
   const [detailPurchaseId, setDetailPurchaseId] = useState<string | null>(null);
   const [detailSupplierId, setDetailSupplierId] = useState<string | null>(null);

   const loadPurchases = React.useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/purchases?limit=100");
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
         }
      } catch {
         // fallback
      } finally {
         setLoading(false);
      }
   }, []);

   React.useEffect(() => {
      loadPurchases();
   }, [loadPurchases]);

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
         {loading ? (
            <TableSkeleton rows={5} cols={6} />
         ) : (
            <CustomTable
               rows={purchases}
               columns={columns}
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
                     try {
                        const res = await fetch("/api/purchases?all=true");
                        if (!res.ok) return [];
                        const d = await res.json();
                        return (d.purchases || []).map((p: any, idx: number) => ({
                           id: p.customId || `PUR_${idx + 1}`,
                           invoice: p.invoice || "-",
                           date: p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : "-",
                           supplier: p.supplier?.name || "-",
                           total: Number(p.totalAmount || 0),
                           paid: Number(p.paid || 0),
                           due: Number(p.due || 0),
                           status: p.status || "RECEIVED",
                        }));
                     } catch {
                        return [];
                     }
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
               onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                     if (updateNote) {
                        setPurchases((prev) =>
                           prev.map((item) =>
                              item.id === updateNote.id
                                 ? { ...item, note: note }
                                 : item,
                           ),
                        );
                     }
                     setUpdateNote(null);
                  }
               }}
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
                  onClick={() => {
                     if (updateNote) {
                        setPurchases((prev) =>
                           prev.map((item) =>
                              item.id === updateNote.id
                                 ? { ...item, note: note }
                                 : item,
                           ),
                        );
                        setUpdateNote(null);
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
      </Stack>
   );
};

export default Purchase;
