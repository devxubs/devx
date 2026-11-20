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
   Autocomplete,
   MenuItem,
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
import { useSnackbar } from "@src/lib/snackbarContext";
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

// Phase 1 (NEW-02): tab counts were fabricated in code
// (`value: (i + 10) * i`). They now come from the orders API's real
// per-status groupBy (`ordersByStatus` in GET /api/orders). Until the
// first response arrives, tabs render without a count chip rather
// than with an invented number.
const orderStatus: StatusProps[] = [
   {
      label: "All",
   },
   ...orderStatuses.map((os) => ({ label: os })),
];

const statusLabelToApi: Record<string, string> = {
   Pending: "PENDING",
   Confirmed: "CONFIRMED",
   Cancelled: "CANCELLED",
   Hold: "HOLD",
   Completed: "COMPLETED",
   Delivered: "DELIVERED",
   Processing: "PROCESSING",
   Shipped: "SHIPPED",
   "Out for Delivery": "OUT_FOR_DELIVERY",
   Failed: "FAILED",
};

const BULK_COURIERS = [
   "Pathao",
   "Steadfast",
   "RedX",
   "Paperfly",
   "Sundarban",
   "SA Paribahan",
   "E-Courier",
   "Manual/Direct",
];
const BULK_COURIER_STATUSES = [
   "Pending",
   "In Courier",
   "Delivered",
   "Returned",
   "Hold",
   "Cancelled",
];

const OrderTable = () => {
   const router = useRouter();
   const { formatCurrency, settings } = useSettings();
   const { showSnackbar } = useSnackbar();
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
   const [statusCounts, setStatusCounts] = useState<Record<string, number> | null>(null);
   const [loading, setLoading] = useState(false);
   // Phase 2 (2.1): server-side pagination — the API already accepts
   // page/limit and returns the filtered `total`; the list previously
   // fetched a flat limit=100 and paged those rows client-side, which
   // made every order past the first 100 unreachable.
   const [paginationModel, setPaginationModel] = useState({
      page: 0,
      pageSize: 25,
   });
   const [totalOrders, setTotalOrders] = useState(0);
   const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
   const [detailCustomerId, setDetailCustomerId] = useState<string | null>(
      null,
   );
   const [selectedOrders, setSelectedOrders] = useState<any[]>([]);
   // Phase 3B (3.5): bulk action state.
   const [bulkStatusAnchor, setBulkStatusAnchor] = useState<HTMLElement | null>(null);
   const [courierModalOpen, setCourierModalOpen] = useState(false);
   const [bulkCourier, setBulkCourier] = useState("");
   const [bulkCourierStatus, setBulkCourierStatus] = useState("");
   const [bulkWorking, setBulkWorking] = useState(false);
   const [bulkResults, setBulkResults] = useState<any>(null);
   const [exportModalOpen, setExportModalOpen] = useState(false);
   const [isUpdatingQuickEdit, setIsUpdatingQuickEdit] = useState(false);
   // P3-2: feedback goes through the central snackbar (useSnackbar).

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
         params.set("page", String(paginationModel.page + 1));
         params.set("limit", String(paginationModel.pageSize));

         const f = (filterQueryData.orderData || {}) as any;

         // Tab/filter labels are mapped through statusLabelToApi:
         // the API uppercases what it receives, so a raw label like
         // "Out for Delivery" never matched the OUT_FOR_DELIVERY
         // enum value.
         const currentStatus = orderStatus[orderTab]?.label;
         if (currentStatus && currentStatus !== "All") {
            params.set("status", statusLabelToApi[currentStatus] || currentStatus);
         } else if (f.status && f.status !== "All") {
            params.set("status", statusLabelToApi[f.status] || f.status);
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
            if (data.ordersByStatus) {
               setStatusCounts(data.ordersByStatus);
            }
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
                  variantId: it.variantId || null,
                  variantName: it.variant?.variantName || null,
                  name: it.name,
                  code: it.code || it.variant?.sku || it.product?.productCode || "",
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
                  // Phase 3B (3.6): carried so Quick Edit hydrates the
                  // reconciliation fields instead of clearing them.
                  paymentTxId: o.paymentTxId || "",
                  paymentSenderNumber: o.paymentSenderNumber || "",
                  subtotal: Number(o.subtotal),
                  deliveryCharge: Number(o.deliveryCharge),
                  discount: Number(o.discount),
                  total: Number(o.total),
                  advancePayment: Number(o.advancePayment),
                  dueAmount: Number(o.dueAmount),
               },
            }));
            setOrderRows(mapped);
            setTotalOrders(Number(data.total ?? mapped.length));
         }
      } catch {
         // fallback
      } finally {
         setLoading(false);
      }
   }, [orderTab, filterQueryData, paginationModel]);

   // Any tab / filter / search change returns to the first page so the
   // requested page can never point past the filtered result set.
   useEffect(() => {
      setPaginationModel((prev) =>
         prev.page === 0 ? prev : { ...prev, page: 0 },
      );
   }, [orderTab, filterQueryData]);

   useEffect(() => {
      loadOrders();
   }, [loadOrders]);

   // Phase 3B (3.5): run a bulk action through POST /api/orders/bulk.
   // The endpoint processes each order with the single-order PUT's
   // stock semantics and returns per-order results; the summary
   // dialog shows exactly which orders failed and why.
   const runBulk = React.useCallback(
      async (payload: Record<string, any>, rows: any[]) => {
         if (!rows || rows.length === 0 || bulkWorking) return;
         setBulkWorking(true);
         try {
            const res = await fetch("/api/orders/bulk", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  ...payload,
                  orderIds: rows.map((r) => r.id),
               }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
               throw new Error(data.message || data.error || "Bulk action failed");
            }
            setBulkResults(data);
            loadOrders();
         } catch (err: any) {
            showSnackbar(err?.message || "Bulk action failed", "error");
         } finally {
            setBulkWorking(false);
         }
      },
      [bulkWorking, loadOrders, showSnackbar],
   );

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

   // Real per-status counts from the API (see NEW-02 note above). A
   // status with no API count yet gets no chip, never a fake number.
   const orderStatusWithCounts: StatusProps[] = orderStatus.map((s) => {
      if (!statusCounts) return s;
      if (s.label === "All") {
         const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
         return { ...s, value: total };
      }
      const apiStatus = statusLabelToApi[s.label];
      return {
         ...s,
         value: apiStatus ? (statusCounts[apiStatus] ?? 0) : undefined,
      };
   });

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
               status={orderStatusWithCounts}
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
            serverPagination
            rowCount={totalOrders}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            loading={loading}
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
                  {/* Phase 3B (3.5): bulk status change + courier
                      assignment via POST /api/orders/bulk. */}
                  <Tooltip title="Bulk status change" disableInteractive>
                     <IconButton
                        aria-label="Bulk status change"
                        disabled={bulkWorking}
                        onClick={(e) => {
                           setSelectedOrders(selectedRows);
                           setBulkStatusAnchor(e.currentTarget);
                        }}
                     >
                        <Icon
                           icon="solar:refresh-circle-bold"
                           size="small"
                        />
                     </IconButton>
                  </Tooltip>
                  <Tooltip title="Assign courier to selected" disableInteractive>
                     <IconButton
                        aria-label="Assign courier to selected"
                        disabled={bulkWorking}
                        onClick={() => {
                           setSelectedOrders(selectedRows);
                           setCourierModalOpen(true);
                        }}
                     >
                        <Icon icon="solar:delivery-bold" size="small" />
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

         {/* Phase 3B (3.5): bulk status menu */}
         <CustomPopover
            anchorEl={bulkStatusAnchor}
            onClose={() => setBulkStatusAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
         >
            <Menu
               item={orderStatuses.map((s) => ({
                  label: s,
                  onClick: () => {
                     setBulkStatusAnchor(null);
                     runBulk(
                        { action: "status", status: statusLabelToApi[s] || s.toUpperCase() },
                        selectedOrders,
                     );
                  },
               }))}
               onClose={() => setBulkStatusAnchor(null)}
            />
         </CustomPopover>

         {/* Phase 3B (3.5): bulk courier assignment */}
         <CustomModal
            open={courierModalOpen}
            onClose={() => setCourierModalOpen(false)}
            // P3-1: responsive `size` token instead of the fixed
            // 420px width, which overflowed small phones.
            size="sm"
            sx={{ borderRadius: 1 }}
            title={`Assign courier (${selectedOrders.length} orders)`}
         >
            <Stack spacing={2}>
               <Autocomplete
                  freeSolo
                  options={BULK_COURIERS}
                  value={bulkCourier || null}
                  onChange={(_, v) => setBulkCourier(v || "")}
                  onInputChange={(_, v) => setBulkCourier(v)}
                  renderInput={(params) => (
                     <TextField {...params} label="Courier" size="small" />
                  )}
               />
               <TextField
                  select
                  label="Courier status (optional)"
                  size="small"
                  value={bulkCourierStatus}
                  onChange={(e) => setBulkCourierStatus(e.target.value)}
               >
                  <MenuItem value="">— Keep current —</MenuItem>
                  {BULK_COURIER_STATUSES.map((s) => (
                     <MenuItem key={s} value={s}>
                        {s}
                     </MenuItem>
                  ))}
               </TextField>
               {bulkCourierStatus === "In Courier" && (
                  <Typography variant="caption" color="text.secondary">
                     Orders without a submission time will be stamped as
                     handed to the courier now.
                  </Typography>
               )}
               <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                     variant="text"
                     color="inherit"
                     onClick={() => setCourierModalOpen(false)}
                  >
                     Cancel
                  </Button>
                  <Button
                     variant="contained"
                     color="primary"
                     disabled={!bulkCourier.trim() || bulkWorking}
                     onClick={() => {
                        setCourierModalOpen(false);
                        runBulk(
                           {
                              action: "courier",
                              courier: bulkCourier.trim(),
                              ...(bulkCourierStatus
                                 ? { courierStatus: bulkCourierStatus }
                                 : {}),
                           },
                           selectedOrders,
                        );
                     }}
                  >
                     Assign
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>

         {/* Phase 3B (3.5): bulk result summary — per-order outcomes,
             failures are never silent. */}
         <CustomModal
            open={Boolean(bulkResults)}
            onClose={() => setBulkResults(null)}
            // P3-1: responsive width (95% on phones, the previous
            // 480px from `sm` up) instead of a fixed 480px.
            sx={{ borderRadius: 1, width: { xs: "95%", sm: 480 } }}
            title="Bulk action results"
         >
            <Stack spacing={1.5}>
               <Typography variant="body2">
                  <b>{bulkResults?.succeeded ?? 0}</b> succeeded,{" "}
                  <b>{bulkResults?.failed ?? 0}</b> failed.
               </Typography>
               <Stack spacing={0.75} sx={{ maxHeight: 320, overflowY: "auto" }}>
                  {(bulkResults?.results || []).map((r: any) => (
                     <Stack
                        key={r.id}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent="space-between"
                     >
                        <Typography variant="body2" fontWeight={600}>
                           {r.orderId}
                        </Typography>
                        {r.ok ? (
                           <Typography variant="caption" color="success.main">
                              {r.note || "Updated"}
                           </Typography>
                        ) : (
                           <Typography variant="caption" color="error.main">
                              {r.error || "Failed"}
                           </Typography>
                        )}
                     </Stack>
                  ))}
               </Stack>
               <Stack direction="row" justifyContent="flex-end">
                  <Button
                     variant="contained"
                     color="primary"
                     onClick={() => setBulkResults(null)}
                  >
                     Done
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>

         {/* note modal */}
         <CustomModal
            open={Boolean(noteModal)}
            onClose={() => setNoteModal(null)}
            // P3-1: responsive `size` token instead of the fixed
            // 400px width, which overflowed small phones.
            size="sm"
            sx={{ borderRadius: 1 }}
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
                     showSnackbar("Order updated successfully", "success");
                  } catch (err: any) {
                     showSnackbar(err?.message || "Failed to update order", "error");
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
      </Stack>
   );
};

export default OrderTable;
