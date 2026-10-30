"use client";

import React, { useEffect, useState } from "react";
import { Stack, IconButton, Tooltip, TextField, Button, Typography } from "@mui/material";
import { GridRenderCellParams } from "@mui/x-data-grid";
import { useRouter } from "next/navigation";

import Icon from "@src/components/Icon";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import CustomPopover from "@src/components/CustomPopover";
import Menu from "@src/components/Menu";
import CustomModal from "@src/components/Modal";
import AlertDialog from "@src/components/AlertDialog";
import { useFilterQuery } from "@src/handler/useFilterQuery";

import { orders, orderStatuses } from "./data";
import CreateAt from "./CreateAt";
import User from "../Customers/CustomerInfo";
import OrderFilter from "./OrderFilter";
import OrderTab, { StatusProps } from "./OrderTab";
import { OrderType } from "./type";
import QuickEditModal from "./QuickEditModal";
import { useSettings } from "@src/lib/settingsContext";
import { OrderDetailModal, CustomerDetailModal } from "@src/components/EntityDetailModals/EntityModals";

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
   const { formatCurrency } = useSettings();
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
   const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);

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
         if (f.order_source && f.order_source !== "All") params.set("orderSource", f.order_source);
         if (f.excludeOrderSource) params.set("excludeOrderSource", "true");
         if (f.district && f.district !== "All") params.set("district", f.district);
         if (f.excludeDistrict) params.set("excludeDistrict", "true");
         if (f.courier && f.courier !== "All") params.set("courier", f.courier);
         if (f.excludeCourier) params.set("excludeCourier", "true");
         if (f.courierStatus && f.courierStatus !== "All") params.set("courierStatus", f.courierStatus);
         if (f.excludeCourierStatus) params.set("excludeCourierStatus", "true");
         if (f.print_status && f.print_status !== "All") params.set("printStatus", f.print_status);
         if (f.orderType && f.orderType !== "All") params.set("orderType", f.orderType);
         if (f.employee && f.employee !== "All") params.set("employee", f.employee);
         if (f.products && f.products !== "All") params.set("product", f.products);
         if (f.excludeProduct) params.set("excludeProduct", "true");
         if (f.category && f.category !== "All") params.set("category", f.category);
         if (f.excludeCategory) params.set("excludeCategory", "true");
         if (f.note) params.set("note", f.note);
         if (f.utmSource && f.utmSource !== "All") params.set("utmSource", f.utmSource);
         if (f.excludeUtmSource) params.set("excludeUtmSource", "true");
         if (f.referenceId) params.set("referenceId", f.referenceId);
         if (f.pathaoCity) params.set("pathaoCity", f.pathaoCity);
         if (f.pathaoZone) params.set("pathaoZone", f.pathaoZone);
         if (f.cancelReason && f.cancelReason !== "All") params.set("cancelReason", f.cancelReason);
         if (f.bdMobileNumber && f.bdMobileNumber !== "Any") params.set("bdMobileNumber", f.bdMobileNumber);
         if (f.paymentStatus && f.paymentStatus !== "All") params.set("paymentStatus", f.paymentStatus);
         if (f.deliveryCharge && f.deliveryCharge !== "All") params.set("deliveryCharge", f.deliveryCharge);
         if (f.discountAmount) {
            params.set("discountAmount", String(f.discountAmount));
            if (f.discountOp) params.set("discountOp", f.discountOp);
         }
         if (f.orderTag) params.set("orderTag", f.orderTag);
         if (f.customerTag) params.set("customerTag", f.customerTag);
         if (f.duplicateOrders) params.set("duplicateOrders", "true");
         if (f.customerType && f.customerType !== "All") params.set("customerType", f.customerType);
         if (f.minPrice) params.set("minPrice", String(f.minPrice));
         if (f.maxPrice) params.set("maxPrice", String(f.maxPrice));
         if (f.order_created_at?.[0] && f.order_created_at?.[1]) {
            params.set("startDate", new Date(f.order_created_at[0]).toISOString());
            params.set("endDate", new Date(f.order_created_at[1]).toISOString());
         }
         if (f.courier_submitted_at?.[0] && f.courier_submitted_at?.[1]) {
            params.set("courierStartDate", new Date(f.courier_submitted_at[0]).toISOString());
            params.set("courierEndDate", new Date(f.courier_submitted_at[1]).toISOString());
         }
         if (f.status_added_at?.[0] && f.status_added_at?.[1]) {
            params.set("statusStartDate", new Date(f.status_added_at[0]).toISOString());
            params.set("statusEndDate", new Date(f.status_added_at[1]).toISOString());
         }

         const res = await fetch(`/api/orders?${params.toString()}`);
         if (res.ok) {
            const data = await res.json();
            const mapped: OrderType[] = (data.orders || []).map((o: any) => ({
               id: o.id,
               orderId: o.customId || o.orderId || o.id,
               invoiceNo: o.invoiceNo,
               status: o.status ? (o.status.charAt(0) + o.status.slice(1).toLowerCase()) : "Pending",
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
                  id: it.id,
                  name: it.name,
                  code: it.code || "",
                  quantity: it.quantity,
                  price: Number(it.price),
                  subtotal: Number(it.subtotal),
                  images: it.product?.images?.[0] || "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-1.webp",
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
               sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
               onClick={() => setDetailOrderId(params.row.orderId || params.row.customId || params.row.id)}
            >
               {params.row.orderId || params.row.customId || params.row.id}
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
                  sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                  onClick={() => setDetailCustomerId(params.row.customer?.id || params.row.customer?.name)}
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
            canPrint={true}
            canExport={true}
            printConfig={{
               title: "DevX POS - Orders Register",
               isInvoiceModule: true,
            }}
            exportConfig={{
               filename: `Orders_Export_${new Date().toISOString().split("T")[0]}`,
               title: "DevX POS - Orders Report",
               fetchAllData: async () => {
                  try {
                     const res = await fetch("/api/orders?all=true");
                     if (!res.ok) return [];
                     const data = await res.json();
                     return (data.orders || []).map((o: any) => ({
                        orderId: o.customId || o.orderId || o.id,
                        customerName: o.customer?.name || "Walk-in",
                        customerPhone: o.customer?.phone || "-",
                        date: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "-",
                        orderSource: o.orderSource || "Direct",
                        subtotal: Number(o.subtotal || 0),
                        deliveryCharge: Number(o.deliveryCharge || 0),
                        discount: Number(o.discount || 0),
                        total: Number(o.total || 0),
                        status: o.status || "Pending",
                     }));
                  } catch {
                     return [];
                  }
               },
               summaryRows: (data: any[]) => {
                  const totalSum = data.reduce((acc, row) => acc + (Number(row.total) || 0), 0);
                  return [
                     { label: "Total Orders Count:", value: String(data.length) },
                     { label: "Grand Total Revenue:", value: `৳ ${totalSum.toFixed(2)}`, isTotal: true },
                  ];
               },
            }}
            menuItems={[
               {
                  label: "View & Print",
                  icon: (
                     <Icon
                        icon="solar:printer-minimalistic-bold"
                        size="small"
                     />
                  ),
                  onClick: (params: GridRenderCellParams) => {
                     router.push(`/admin/order/${params.row.id}`);
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
                  sm: 700,
               },
            }}
            title="Quick Edit"
         >
            <QuickEditModal
               products={editModal?.products || []}
               onClose={() => setEditModal(null)}
               onUpdate={(p) => {
                  if (!editModal) return;

                  setOrderRows((prev) =>
                     prev.map((or) =>
                        or.orderId === editModal.orderId
                           ? { ...or, products: p }
                           : or,
                     ),
                  );
               }}
            />
         </CustomModal>

         <AlertDialog
            open={deleteDialog.open}
            type={"delete"}
            title={`Are you sure you want to delete <b>${deleteDialog.orderRow?.orderId || "this"}</b> order?`}
            onClose={() => {
               setDeleteDialog((prev) => ({ ...prev, open: false }));
            }}
            onConfirm={async () => {
               if (!deleteDialog.orderRow) return;
               const targetId = deleteDialog.orderRow.id;
               setOrderRows((prev) =>
                  prev.filter((or) => or.id !== targetId),
               );
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

          <CustomerDetailModal
             open={Boolean(detailCustomerId)}
             onClose={() => setDetailCustomerId(null)}
             customerId={detailCustomerId}
          />
       </Stack>
   );
};

export default OrderTable;
