"use client";

import React, { useEffect, useState } from "react";
import {
   Box,
   Button,
   CircularProgress,
   Stack,
   Typography,
   useTheme,
   MenuItem,
   TextField,
   Tooltip,
} from "@mui/material";
import { useParams, useRouter } from "next/navigation";
import Icon from "@src/components/Icon";
import PrintButton from "@src/components/PrintButton";
import { useSettings } from "@src/lib/settingsContext";
import { INVOICE_TEMPLATES } from "@src/components/InvoiceTemplates/templates";
import InvoiceRenderer from "@src/components/InvoiceTemplates/InvoiceRenderer";
import { InvoiceOrderData } from "@src/components/InvoiceTemplates/types";
import { exportToExcel, exportToWord } from "@src/lib/exportEngine";

export default function Preview() {
   const theme = useTheme();
   const router = useRouter();
   const params = useParams();
   const id = params?.id as string;
   const { settings } = useSettings();

   const [order, setOrder] = useState<any>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   const savedTemplate = settings?.customConfig?.invoiceTemplateId || "classic-pro";
   const [currentTemplateId, setCurrentTemplateId] = useState<string>(savedTemplate);

   useEffect(() => {
      if (settings?.customConfig?.invoiceTemplateId) {
         setCurrentTemplateId(settings.customConfig.invoiceTemplateId);
      }
   }, [settings]);

   useEffect(() => {
      if (!id) return;

      const fetchOrder = async () => {
         setLoading(true);
         try {
            const res = await fetch(`/api/orders/${id}`);
            if (!res.ok) {
               throw new Error("Order not found");
            }
            const data = await res.json();
            setOrder(data);
         } catch (err: any) {
            setError(err.message || "Failed to load order");
         } finally {
            setLoading(false);
         }
      };

      fetchOrder();
   }, [id]);

   if (loading) {
      return (
         <Stack alignItems="center" justifyContent="center" height="60vh">
            <CircularProgress />
         </Stack>
      );
   }

   if (error || !order) {
      return (
         <Stack spacing={2} alignItems="center" justifyContent="center" height="60vh">
            <Typography variant="h6" color="error">
               {error || "Order not found"}
            </Typography>
            <Button variant="outlined" onClick={() => router.push("/admin/order")}>
               Back to Orders
            </Button>
         </Stack>
      );
   }

   const mappedOrderData: InvoiceOrderData = {
      id: order.id,
      orderId: order.orderId || order.customId || `ORD_${order.id}`,
      invoiceNo: order.invoiceNo || order.orderId || `INV_${order.id}`,
      date: new Date(order.createdAt).toLocaleDateString(),
      createdAt: order.createdAt,
      paymentMethod: order.paymentMethod || "Cash",
      paymentStatus: order.paymentStatus || "PAID",
      status: order.status,
      courier: order.courier,
      courierTrackingId: order.courierTrackingId,
      employeeName: order.employee?.name,
      notes: order.notes,
      customer: order.customer,
      items: (order.items || []).map((it: any) => ({
         name: it.name || it.product?.productName || "Product Item",
         sku: it.sku || it.product?.sku || "-",
         barcode: it.barcode || it.product?.barcode,
         quantity: Number(it.quantity || 1),
         price: Number(it.price || 0),
         subtotal: Number(it.subtotal || it.price * it.quantity),
      })),
      subtotal: Number(order.subtotal || 0),
      deliveryCharge: Number(order.deliveryCharge || 0),
      discount: Number(order.discount || 0),
      tax: Number(order.tax || 0),
      total: Number(order.total || 0),
      advancePayment: Number(order.advancePayment || 0),
      dueAmount: Number(order.dueAmount || 0),
   };

   const invoiceExportPayload = {
      invoiceNo: mappedOrderData.invoiceNo || "INV-000",
      orderId: mappedOrderData.orderId,
      date: mappedOrderData.date || "",
      paymentMethod: mappedOrderData.paymentMethod,
      status: mappedOrderData.status,
      storeName: settings?.storeName || "DevX POS",
      storeAddress: settings?.address,
      storePhone: settings?.phone,
      storeEmail: settings?.email,
      customerName: mappedOrderData.customer?.name,
      customerPhone: mappedOrderData.customer?.phone,
      customerEmail: mappedOrderData.customer?.email,
      customerAddress: mappedOrderData.customer?.address,
      items: mappedOrderData.items,
      subtotal: mappedOrderData.subtotal,
      deliveryCharge: mappedOrderData.deliveryCharge,
      discount: mappedOrderData.discount,
      tax: mappedOrderData.tax,
      total: mappedOrderData.total,
      paid: mappedOrderData.advancePayment,
      due: mappedOrderData.dueAmount,
      notes: mappedOrderData.notes,
      terms: settings?.customConfig?.termsText,
   };

   const handleExportDocx = async () => {
      await exportToWord({
         filename: `Invoice_${mappedOrderData.invoiceNo || order.id}`,
         title: "Sales Invoice",
         columns: [],
         data: [],
         isInvoice: true,
         invoiceData: invoiceExportPayload,
      });
   };

   const handleExportXlsx = async () => {
      await exportToExcel({
         filename: `Invoice_${mappedOrderData.invoiceNo || order.id}`,
         title: "Sales Invoice",
         columns: [],
         data: [],
         isInvoice: true,
         invoiceData: invoiceExportPayload,
      });
   };

   return (
      <Stack spacing={3} sx={{ maxWidth: 900, mx: "auto", py: 2 }}>
         {/* Top Controls Toolbar (hidden on print) */}
         <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ sm: "center" }}
            spacing={2}
            sx={{ "@media print": { display: "none" } }}
         >
            <Button
               variant="text"
               color="inherit"
               startIcon={<Icon icon="solar:arrow-left-linear" size="small" />}
               onClick={() => router.push("/admin/order")}
            >
               Back to Orders
            </Button>

            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
               {/* 18 Templates Switcher Dropdown */}
               <TextField
                  select
                  size="small"
                  label="Template Layout (18 Designs)"
                  value={currentTemplateId}
                  onChange={(e) => setCurrentTemplateId(e.target.value)}
                  sx={{ minWidth: 220 }}
               >
                  {INVOICE_TEMPLATES.map((t) => (
                     <MenuItem key={t.id} value={t.id}>
                        {t.name} ({t.paperSize})
                     </MenuItem>
                  ))}
               </TextField>

               {/* Export Word */}
               <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  startIcon={<Icon icon="vscode-icons:file-type-word" size="small" />}
                  onClick={handleExportDocx}
               >
                  Word (.docx)
               </Button>

               {/* Export Excel */}
               <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  startIcon={<Icon icon="vscode-icons:file-type-excel" size="small" />}
                  onClick={handleExportXlsx}
               >
                  Excel (.xlsx)
               </Button>

               {/* Edit Order */}
               <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Icon icon="solar:pen-bold" size="small" />}
                  onClick={() => router.push(`/admin/order/publish?id=${order.id}`)}
               >
                  Edit
               </Button>

               {/* Print Invoice */}
               <PrintButton
                  variant="contained"
                  color="primary"
                  label="Print Invoice"
                  size="small"
               />
            </Stack>
         </Stack>

         {/* Render Selected Invoice Template */}
         <Box sx={{ width: "100%" }}>
            <InvoiceRenderer
               order={mappedOrderData}
               customization={{
                  ...settings,
                  ...(settings?.customConfig || {}),
                  templateId: currentTemplateId,
               }}
               templateId={currentTemplateId}
            />
         </Box>
      </Stack>
   );
}
