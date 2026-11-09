"use client";

import React, { useEffect, useState } from "react";
import {
   Stack,
   IconButton,
   Tooltip,
   TextField,
   Button,
   Typography,
   Chip,
   Snackbar,
   Alert,
} from "@mui/material";
import { GridRenderCellParams } from "@mui/x-data-grid";
import { useRouter } from "next/navigation";

import Icon from "@src/components/Icon";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import CustomPopover from "@src/components/CustomPopover";
import Menu from "@src/components/Menu";
import CustomModal from "@src/components/Modal";
import AlertDialog from "@src/components/AlertDialog";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import { usePrint } from "@src/components/TablePrintDocument/PrintPortal";

import { orders, orderStatuses } from "./data";
import CreateAt from "./CreateAt";
import User from "../Customers/CustomerInfo";
import OrderFilter from "./OrderFilter";
import OrderTab, { StatusProps } from "./OrderTab";
import { OrderType } from "./type";
import QuickEditModal from "./QuickEditModal";
import ExportOrderModal from "./Export/ExportOrderModal";
import { mapOrderToInvoiceData } from "./Details/helpers";
import { useSettings } from "@src/lib/settingsContext";
import { OrderDetailModal, CustomerProfileModal } from "./components";

const statusColor: Record<
   string,
   "default" | "warning" | "success" | "info" | "error"
> = {
   All: "default",
   Pending: "warning",
   Confirmed: "success",
   Processing: "info",
   Shipped: "info",
   "Out for Delivery": "info",
   Delivered: "success",
   Completed: "success",
   Hold: "default",
   Cancelled: "error",
   Failed: "error",
} as const;

const orderStatus: StatusProps[] = [
   {
      label: "All",
   },
   ...orderStatuses.map((os, i) => ({ label: os, value: (i + 10) * i })),
];

const OrderTable = () => {
   const router = useRouter();
   const { formatCurrency, settings } = useSettings();
   const { printDocument } = usePrint();
   const [status, setStatus] = useState<{
      orderRow: OrderType;
      anchorEl: HTMLElement | null;
   }>(
      {} as {
         orderRow: OrderType;
         anchorEl: HTMLElement | null;
      },
   );
   const [orderRows, setOrderRows] = useState<OrderType[]>([]);
   const [loading, setLoading] = useState(false);
   const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
   const [detailCustomerId, setDetailCustomerId] = useState<string | null>(
      null,
   );
   const [selectedOrders, setSelectedOrders] = useState<any[]>([]);
   const [exportModalOpen, setExportModalOpen] = useState(false);
   const [isUpdatingQuickEdit, setIsUpdatingQuickEdit] = useState(false);
   const [feedback, setFeedback] = useState<{
      type: "success" | "error";
      message: string;
   } | null>(null);

   const handleSingleInvoicePrint = React.useCallback(
      (orderRow: any) => {
         if (!orderRow) return;
         const invoiceData = mapOrderToInvoiceData(orderRow);
         printDocument({
            title: `Invoice - ${invoiceData.invoiceNo || invoiceData.orderId}`,
            selectedRecords: [orderRow],
            columns: [],
            settings,
            isInvoiceBatch: true,
            invoiceOrders: [invoiceData],
         });
      },
      [printDocument, settings],
   );

   const handleBatchInvoicePrint = React.useCallback(
      (ordersToPrint: any[]) => {
         if (!ordersToPrint || ordersToPrint.length === 0) return;
         const invoiceOrders = ordersToPrint.map((o) =>
            mapOrderToInvoiceData(o),
         );
         printDocument({
            title: "DevX POS - Customer Invoices",
            selectedRecords: ordersToPrint,
            columns: [],
            settings,
            isInvoiceBatch: true,
            invoiceOrders,
         });
      },
      [printDocument, settings],
   );

   // order tab
   const { filterQueryData, setFilterQueryData } = useFilterQuery();
   const [orderTab, setOrderTab] = useState(0);

   const loadOrders = React.useCallback(async () => {
      setLoading(true);
      try {
         const params = new URLSearchParams();
         params.set("limit", "100");

         const f = (filterQueryData.orderData || {}) as any;

         const currentStatus = orderStatus[orderTab]?.label;
         if (currentStatus && currentStatus !== "All") {
            params.set("status", currentStatus);
         } else if (f.status && f.status !== "All") {
            params.set("status", f.status);
         }

         if (filterQueryData.searchText) {
            params.set("search", filterQueryData.searchText);
         }

         if (f.excludeStatus) params.set("excludeStatus", "true");
         if (f.order_source && f.order_source !== "All")
            params.set("orderSource", f.order_source);
         if (f.excludeOrderSource) params.set("excludeOrderSource", "true");
         if (f.district && f.district !== "All")
            params.set("district", f.district);
         if (f.excludeDistrict) params.set("excludeDistrict", "true");
         if (f.courier && f.courier !== "All") params.set("courier", f.courier);
         if (f.excludeCourier) params.set("excludeCourier", "true");
         if (f.courierStatus && f.courierStatus !== "All")
            params.set("courierStatus", f.courierStatus);
         if (f.excludeCourierStatus) params.set("excludeCourierStatus", "true");
         if (f.print_status && f.print_status !== "All")
            params.set("printStatus", f.print_status);
         if (f.orderType && f.orderType !== "All")
            params.set("orderType", f.orderType);
         if (f.employee && f.employee !== "All")
            params.set("employee", f.employee);
         if (f.products && f.products !== "All")
            params.set("product", f.products);
         if (f.excludeProduct) params.set("excludeProduct", "true");
         if (f.category && f.category !== "All")
            params.set("category", f.category);
         if (f.excludeCategory) params.set("excludeCategory", "true");
         if (f.note) params.set("note", f.note);
         if (f.utmSource && f.utmSource !== "All")
            params.set("utmSource", f.utmSource);
         if (f.excludeUtmSource) params.set("excludeUtmSource", "true");
         if (f.referenceId) params.set("referenceId", f.referenceId);
         if (f.pathaoCity) params.set("pathaoCity", f.pathaoCity);
         if (f.pathaoZone) params.set("pathaoZone", f.pathaoZone);
         if (f.cancelReason && f.cancelReason !== "All")
            params.set("cancelReason", f.cancelReason);
         if (f.bdMobileNumber && f.bdMobileNumber !== "Any")
            params.set("bdMobileNumber", f.bdMobileNumber);
         if (f.paymentStatus && f.paymentStatus !== "All")
            params.set("paymentStatus", f.paymentStatus);
         if (f.deliveryCharge && f.deliveryCharge !== "All")
            params.set("deliveryCharge", f.deliveryCharge);
         if (f.discountAmount) {
            params.set("discountAmount", String(f.discountAmount));
            if (f.discountOp) params.set("discountOp", f.discountOp);
         }
         if (f.orderTag) params.set("orderTag", f.orderTag);
         if (f.customerTag) params.set("customerTag", f.customerTag);
         if (f.duplicateOrders) params.set("duplicateOrders", "true");
         if (f.customerType && f.customerType !== "All")
            params.set("customerType", f.customerType);
         if (f.minPrice) params.set("minPrice", String(f.minPrice));
         if (f.maxPrice) params.set("maxPrice", String(f.maxPrice));
         if (f.order_created_at?.[0] && f.order_created_at?.[1]) {
            params.set(
               "startDate",
               new Date(f.order_created_at[0]).toISOString(),
            );
            params.set(
               "endDate",
               new Date(f.order_created_at[1]).toISOString(),
            );
         }
         if (f.courier_submitted_at?.[0] && f.courier_submitted_at?.[1]) {
            params.set(
               "courierStartDate",
               new Date(f.courier_submitted_at[0]).toISOString(),
            );
            params.set(
               "courierEndDate",
               new Date(f.courier_submitted_at[1]).toISOString(),
            );
         }
         if (f.status_added_at?.[0] && f.status_added_at?.[1]) {
            params.set(
               "statusStartDate",
               new Date(f.status_added_at[0]).toISOString(),
            );
            params.set(
               "statusEndDate",
               new Date(f.status_added_at[1]).toISOString(),
            );
         }

         const res = await fetch(`/api/orders?${params.toString()}`);
         if (res.ok) {
            const data = await res.json();
            const mapped: OrderType[] = (data.orders || []).map((o: any) => ({
               id: o.id,
               orderCode: o.orderCode || o.customId || o.orderId,
               customId: o.customId || o.orderCode || o.orderId,
               orderId: o.orderCode || o.customId || o.orderId || o.id,
               invoiceNo: o.invoiceNo,
               status: o.status
                  ? o.status.charAt(0) + o.status.slice(1).toLowerCase()
                  : "Pending",
               orderNote: o.orderNote || "",
               orderSource: o.orderSource || "Direct",
               createdAt: o.createdAt,
               updatedAt: o.updatedAt,
               timestamps: {
                  createdAt: o.createdAt,
                  updatedAt: o.updatedAt,
                  deliveryTime: o.deliveredAt,
               },
               employee: {
                  id: o.employee?.id || "EMP01",
                  name: o.employee?.name || "Admin",
               },
               customer: {
                  id: o.customer?.id || "",
                  name: o.customer?.name || "Walk-in Customer",
                  email: o.customer?.email || "",
                  address: o.customer?.address || "",
                  phone: o.customer?.phone || "",
               },
               products: (o.items || []).map((it: any) => ({
                  id: it.product?.id || it.productId || it.id,
                  productId: it.product?.id || it.productId || null,
                  orderItemId: it.id,
                  name: it.name,
                  code: it.code || it.product?.productCode || "",
                  quantity: it.quantity,
                  price: Number(it.price),
                  subtotal: Number(it.subtotal),
                  images:
                     it.product?.images?.[0] ||
                     "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-1.webp",
                  isDeleted: Boolean(it.product?.isDeleted),
               })),
               pricing: {
                  paymentMethod: o.paymentMethod || "Cash on Delivery",
                  subtotal: Number(o.subtotal),
                  deliveryCharge: Number(o.deliveryCharge),
                  discount: Number(o.discount),
                  total: Number(o.total),
                  advancePayment: Number(o.advancePayment),
                  dueAmount: Number(o.dueAmount),
               },
            }));
            setOrderRows(mapped);
         }
      } catch {
         // fallback
      } finally {
         setLoading(false);
      }
   }, [orderTab, filterQueryData]);

   useEffect(() => {
      loadOrders();
   }, [loadOrders]);

   // note info
   const [noteModal, setNoteModal] = useState<OrderType | null>(null);
   const [note, setNote] = useState(noteModal?.orderNote || "");

   // quick edit info
   const [editModal, setEditModal] = useState<OrderType | null>(null);

   // delete dialog
   const [deleteDialog, setDeleteDialog] = useState<{
      open: boolean;
      orderRow: OrderType;
   }>({} as { open: boolean; orderRow: OrderType });

   useEffect(() => {
      if (filterQueryData.orderData?.status) {
         const findOSIndex = orderStatus.findIndex(
            (os) => os.label === filterQueryData.orderData?.status,
         );
         if (findOSIndex !== -1) {
            setOrderTab(findOSIndex);
         }
      }
   }, [filterQueryData]);

   useEffect(() => {
      setFilterQueryData({
         orderData: {
            status: orderStatus[orderTab]?.label || "",
         },
      });
   }, [orderTab]);

   const columns: ColumnConfig[] = [
      {
         field: "orderId",
         headerName: "ID",
         flex: 0.3,
         renderCell: (params: any) => (
            <Typography
               variant="body2"
               fontWeight={600}
               color="primary.main"
               sx={{
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
               }}
               onClick={() => {
                  const targetId =
                     params.row.orderCode ||
                     params.row.customId ||
                     params.row.orderId ||
                     params.row.id;
                  router.push(`/admin/order/${targetId}`);
               }}
            >
               {params.row.orderCode || params.row.orderId || params.row.customId || params.row.id}
            </Typography>
         ),
      },
      {
         field: "note",
         headerName: "Note",
         renderCell: (params) => {
            return (
               <>
                  <Tooltip title={params.row.orderNote} disableInteractive>
                     <IconButton
                        onClick={() => {
                           setNoteModal(params.row);
                           setNote(params.row.orderNote);
                        }}
                     >
                        <Icon icon="solar:add-square-broken" size="small" />
                     </IconButton>
                  </Tooltip>
               </>
            );
         },
         flex: 0.3,
      },
      {
         field: "customer",
         headerName: "Customer",
         renderCell: (params) => {
            return (
               <Stack
                  sx={{ cursor: "pointer" }}
                  onClick={() =>
                     setDetailCustomerId(
                        params.row.customer?.id || params.row.customer?.name,
                     )
                  }
               >
                  <User {...params.row.customer} />
               </Stack>
            );
         },
         flex: 1,
      },
      {
         field: "date",
         headerName: "Date",
         renderCell: (params) => {
            const d = new Date(params.row.createdAt);
            const dateOnly = d.toLocaleDateString();
            const timeOnly = d.toLocaleTimeString();

            return <CreateAt date={dateOnly} time={timeOnly} />;
         },
      },
      {
         field: "orderSource",
         headerName: "Source",
      },
      {
         field: "subtotal",
         headerName: "Price",
         renderCell: (params) => {
            let productSubtotal = 0;
            params.row.products.map((p: any) => {
               p.subtotal = p.price * p.quantity;
               productSubtotal += p.subtotal;
            });

            return formatCurrency(productSubtotal);
         },
      },
      {
         field: "status",
         headerName: "Status",
         flex: 0.5,
         chip: true,
         color: (params) => {
            return statusColor[params.row.status] || "default";
         },
         onClick: (params, e) => {
            setStatus({ orderRow: params.row, anchorEl: e.currentTarget });
         },
      },
      {
         field: "__quick_edit__",
         headerName: "",
         align: "right",
         flex: 0.1,
         sortable: false,
         filterable: false,
         disableColumnMenu: true,
         renderCell: (params) => {
            return (
               <Tooltip title={"Quick Edit"} disableInteractive>
                  <IconButton
                     size="small"
                     onClick={() => setEditModal(params.row)}
                  >
                     <Icon icon="solar:pen-bold" size="small" />
                  </IconButton>
               </Tooltip>
            );
         },
      },
      { field: "@actions", headerName: "", flex: 0.1 },
   ];

   return (
      <Stack
         bgcolor={"background.paper"}
         sx={{
            borderRadius: 1,
            overflow: "hidden",
         }}
      >
         {/* Order tab */}
         <Stack>
            <OrderTab
               status={orderStatus}
               value={orderTab}
               onChange={(s) => {
                  setFilterQueryData({
                     orderData: { status: s.label !== "All" ? s.label : null },
                  });
               }}
            />
         </Stack>
         <CustomTable
            rows={orderRows as OrderType[]}
            columns={columns}
            filter={(data, onChange) =>
               OrderFilter(data, (d: any) => {
                  onChange(d);
               })
            }
            checkBox
            hideSelectionActions={true}
            canPrint={false}
            canExport={false}
            onSelectionChange={(selected) => setSelectedOrders(selected)}
            customSelectionToolbar={(selectedRows) => (
               <Stack direction="row" spacing={1} alignItems="center">
                  <Tooltip title="Export selected orders" disableInteractive>
                     <IconButton
                        aria-label="Export selected orders"
                        onClick={() => {
                           setSelectedOrders(selectedRows);
                           setExportModalOpen(true);
                        }}
                     >
                        <Icon
                           icon="solar:download-square-bold-duotone"
                           size="small"
                        />
                     </IconButton>
                  </Tooltip>
                  <Tooltip title="Print selected invoices" disableInteractive>
                     <IconButton
                        aria-label="Print selected invoices"
                        onClick={() => handleBatchInvoicePrint(selectedRows)}
                     >
                        <Icon
                           icon="solar:printer-minimalistic-bold"
                           size="small"
                        />
                     </IconButton>
                  </Tooltip>
               </Stack>
            )}
            menuItems={[
               {
                  label: "Print",
                  icon: (
                     <Icon
                        icon="solar:printer-minimalistic-bold"
                        size="small"
                     />
                  ),
                  onClick: (params: GridRenderCellParams) => {
                     handleSingleInvoicePrint(params.row);
                  },
               },
               {
                  label: "View Details",
                  icon: <Icon icon="solar:eye-bold" size="small" />,
                  onClick: (params: GridRenderCellParams) => {
                     const targetId =
                        params.row.orderCode ||
                        params.row.customId ||
                        params.row.orderId ||
                        params.row.id;
                     router.push(`/admin/order/${targetId}`);
                  },
               },
               {
                  label: "edit",
                  icon: <Icon icon="solar:pen-bold" size="small" />,
                  onClick: (params: GridRenderCellParams) => {
                     router.push(
                        `/admin/order/publish?id=${encodeURIComponent(params.row.id)}`,
                     );
                  },
               },
               {
                  label: "delete",
                  color: "error",
                  icon: (
                     <Icon
                        icon="solar:trash-bin-trash-bold"
                        size="small"
                        color="error"
                     />
                  ),
                  onClick: (params: GridRenderCellParams) => {
                     setDeleteDialog({ open: true, orderRow: params.row });
                  },
               },
            ]}
         />

         {/* status Changing */}
         <CustomPopover
            anchorEl={status.anchorEl}
            onClose={() => setStatus((prev) => ({ ...prev, anchorEl: null }))}
            anchorOrigin={{
               vertical: "bottom",
               horizontal: "right",
            }}
            transformOrigin={{
               vertical: "top",
               horizontal: "right",
            }}
         >
            <Menu
               item={
                  orderStatuses?.map((s) => ({
                     label: s,
                     onClick: async (l) => {
                        const targetId = status.orderRow.id;
                        setOrderRows((prev) =>
                           prev.map((or) =>
                              or.id === targetId ? { ...or, status: l } : or,
                           ),
                        );
                        setStatus((prev) => ({ ...prev, anchorEl: null }));
                        try {
                           await fetch(`/api/orders/${targetId}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: l.toUpperCase() }),
                           });
                        } catch {}
                     },
                  })) ?? []
               }
               onClose={() =>
                  setStatus((prev) => ({ ...prev, anchorEl: null }))
               }
            />
         </CustomPopover>

         {/* note modal */}
         <CustomModal
            open={Boolean(noteModal)}
            onClose={() => setNoteModal(null)}
            sx={{ borderRadius: 1, width: 400 }}
            title="Note"
         >
            <Stack spacing={2}>
               <TextField
                  label="Note"
                  variant="outlined"
                  required
                  value={note}
                  onChange={(e) => {
                     setNote(e.target.value);
                  }}
               />
               <Stack
                  spacing={2}
                  direction={"row"}
                  alignItems={"center"}
                  justifyContent={"flex-end"}
               >
                  <Button
                     variant="text"
                     color="inherit"
                     onClick={() => {
                        setNoteModal(null);
                     }}
                  >
                     Cancel
                  </Button>
                  <Button
                     variant="contained"
                     color="primary"
                     type="submit"
                     disabled={note.length === 0}
                     onClick={async () => {
                        if (noteModal === null) return;
                        const targetId = noteModal.id;
                        setOrderRows((prev) =>
                           prev.map((or) =>
                              or.id === targetId
                                 ? { ...or, orderNote: note }
                                 : or,
                           ),
                        );
                        setNoteModal(null);
                        try {
                           await fetch(`/api/orders/${targetId}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ orderNote: note }),
                           });
                        } catch {}
                     }}
                  >
                     {noteModal?.orderNote.length ? "Update note" : "Add note"}
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>

         {/* quick edit modal */}
         <CustomModal
            open={Boolean(editModal)}
            onClose={() => setEditModal(null)}
            sx={{
               width: {
                  xs: "100%",
                  sm: 750,
                  md: 850,
               },
            }}
            title="Quick Edit Order"
         >
            <QuickEditModal
               order={editModal}
               products={editModal?.products || []}
               isLoading={isUpdatingQuickEdit}
               onClose={() => setEditModal(null)}
               onUpdate={async (p, extraFields) => {
                  if (!editModal) return;
                  setIsUpdatingQuickEdit(true);
                  try {
                     const targetId = editModal.id;
                     const newSubtotal = p.reduce(
                        (acc, it) =>
                           acc + Number(it.price) * Number(it.quantity),
                        0,
                     );
                     const deliveryCharge =
                        extraFields?.pricing?.deliveryCharge !== undefined
                           ? extraFields.pricing.deliveryCharge
                           : Number(editModal.pricing?.deliveryCharge || 0);
                     const discount =
                        extraFields?.pricing?.discount !== undefined
                           ? extraFields.pricing.discount
                           : Number(editModal.pricing?.discount || 0);
                     const total = Math.max(0, newSubtotal + deliveryCharge - discount);
                     const advancePayment =
                        extraFields?.pricing?.advancePayment !== undefined
                           ? extraFields.pricing.advancePayment
                           : Number(editModal.pricing?.advancePayment || 0);
                     const dueAmount = Math.max(0, total - advancePayment);

                     setOrderRows((prev) =>
                        prev.map((or) => {
                           if (or.id === targetId) {
                              return {
                                 ...or,
                                 status: extraFields?.status || or.status,
                                 orderSource:
                                    extraFields?.orderSource || or.orderSource,
                                 orderNote:
                                    extraFields?.orderNote !== undefined
                                       ? extraFields.orderNote
                                       : or.orderNote,
                                 customer: extraFields?.customer
                                    ? {
                                         ...or.customer,
                                         name: extraFields.customer.name,
                                         phone: extraFields.customer.phone,
                                         address: extraFields.customer.address,
                                         email:
                                            extraFields.customer.email ||
                                            or.customer?.email ||
                                            "",
                                      }
                                    : or.customer,
                                 products: p.map((prod) => ({
                                    ...prod,
                                    subtotal:
                                       Number(prod.price) *
                                       Number(prod.quantity),
                                 })),
                                 pricing: {
                                    ...or.pricing,
                                    subtotal: newSubtotal,
                                    deliveryCharge,
                                    discount,
                                    advancePayment,
                                    total,
                                    dueAmount,
                                 },
                              };
                           }
                           return or;
                        }),
                     );
                     setEditModal(null);
                     setFeedback({
                        type: "success",
                        message: "Order updated successfully",
                     });
                  } catch (err: any) {
                     setFeedback({
                        type: "error",
                        message: err?.message || "Failed to update order",
                     });
                     throw err;
                  } finally {
                     setIsUpdatingQuickEdit(false);
                  }
               }}
            />
         </CustomModal>

         <AlertDialog
            open={deleteDialog.open}
            type={"delete"}
            title={`Are you sure you want to delete <b>${deleteDialog.orderRow?.orderCode || deleteDialog.orderRow?.orderId || "this"}</b> order?`}
            onClose={() => {
               setDeleteDialog((prev) => ({ ...prev, open: false }));
            }}
            onConfirm={async () => {
               if (!deleteDialog.orderRow) return;
               const targetId = deleteDialog.orderRow.id;
               setOrderRows((prev) => prev.filter((or) => or.id !== targetId));
               setDeleteDialog({
                  open: false,
                  orderRow: {} as OrderType,
               });
               try {
                  await fetch(`/api/orders/${targetId}`, { method: "DELETE" });
               } catch {}
            }}
         />
         <OrderDetailModal
            open={Boolean(detailOrderId)}
            onClose={() => setDetailOrderId(null)}
            orderId={detailOrderId}
         />

         <CustomerProfileModal
            open={Boolean(detailCustomerId)}
            onClose={() => setDetailCustomerId(null)}
            customerId={detailCustomerId}
         />

         <ExportOrderModal
            open={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            selectedOrders={selectedOrders}
         />



         <Snackbar
            open={Boolean(feedback)}
            autoHideDuration={4000}
            onClose={() => setFeedback(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
         >
            <Alert
               severity={feedback?.type || "info"}
               onClose={() => setFeedback(null)}
               variant="filled"
            >
               {feedback?.message}
            </Alert>
         </Snackbar>
      </Stack>
   );
};

export default OrderTable;
