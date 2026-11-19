"use client";

import React from "react";
import { Box, Typography, Stack, Divider, Table, TableHead, TableRow, TableCell, TableBody, Chip } from "@mui/material";
import { InvoiceOrderData, InvoiceCustomization } from "./types";
import { INVOICE_TEMPLATES } from "./templates";
import { INVOICE_LABELS, BENGALI_FONT_STACK, resolveInvoiceLanguage } from "./labels";

interface InvoiceRendererProps {
   order: InvoiceOrderData;
   customization?: InvoiceCustomization;
   templateId?: string;
   isPrintPreview?: boolean;
}

export default function InvoiceRenderer({
   order,
   customization = {},
   templateId,
   isPrintPreview = false,
}: InvoiceRendererProps) {
   const selectedId = templateId || customization.templateId || "classic-pro";
   const templateMeta = INVOICE_TEMPLATES.find((t) => t.id === selectedId) || INVOICE_TEMPLATES[0];

   const lang = resolveInvoiceLanguage(customization.language);
   const L = INVOICE_LABELS[lang];
   const isBn = lang === "bn";

   const storeName = customization.storeName || "DevX POS";
   const storeTagline = customization.tagline || "Smart Point of Sale & ERP";
   const storePhone = customization.phone || "+880 1700-000000";
   const storeEmail = customization.email || "info@devxpos.com";
   const storeAddress = customization.address || "Banani, Dhaka-1213, Bangladesh";
   const invoiceTitle = customization.invoiceTitle || L.defaultTitle;
   const invoiceHeader = customization.invoiceHeader || L.defaultHeader;
   const invoiceFooter = customization.invoiceFooter || L.defaultFooter;
   const accentColor = customization.accentColor || templateMeta.accent || "#0F766E";

   const showCustomer = customization.showCustomerInfo !== false;
   const showCourier = customization.showCourierInfo !== false;
   const showCashier = customization.showCashierName !== false;
   const showBarcode = customization.showBarcode !== false;
   const showSku = customization.showSkuColumn !== false;
   const showTerms = customization.showTerms !== false;
   const showSign = customization.showSignatureBox !== false;

   const formatMoney = (val?: number) => `৳ ${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

   // ─────────────────────────────────────────────────────────────────────────────
   // 1. THERMAL POS RECEIPTS (80mm & 58mm)
   // ─────────────────────────────────────────────────────────────────────────────
   if (selectedId === "pos-thermal" || selectedId === "compact-thermal") {
      const is58mm = selectedId === "compact-thermal";
      return (
         <Box
            id="printable-invoice"
            className="pos-thermal-receipt"
            sx={{
               width: is58mm ? "54mm" : "76mm",
               maxWidth: "100%",
               mx: "auto",
               p: is58mm ? 1 : 2,
               fontFamily: isBn ? BENGALI_FONT_STACK : "'Courier New', Courier, monospace",
               fontSize: is58mm ? "10px" : "12px",
               lineHeight: 1.3,
               bgcolor: "#FFFFFF",
               color: "#000000",
               border: "1px dashed #CCCCCC",
               borderRadius: 1,
            }}
         >
            {/* Store Header */}
            <Box textAlign="center" mb={1}>
               <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: "inherit", fontSize: is58mm ? "13px" : "16px" }}>
                  {storeName.toUpperCase()}
               </Typography>
               <Typography variant="caption" sx={{ fontFamily: "inherit", display: "block" }}>
                  {storeAddress}
               </Typography>
               <Typography variant="caption" sx={{ fontFamily: "inherit", display: "block" }}>
                  {L.tel}: {storePhone}
               </Typography>
            </Box>

            <Divider sx={{ my: 0.5, borderStyle: "dashed", borderColor: "#000" }} />

            {/* Receipt Metadata */}
            <Box sx={{ fontSize: "inherit", mb: 0.5 }}>
               <Stack direction="row" justifyContent="space-between">
                  <span>{L.invoiceNo}:</span>
                  <b>{order.invoiceNo || order.orderId}</b>
               </Stack>
               <Stack direction="row" justifyContent="space-between">
                  <span>{L.date}:</span>
                  <span>{order.date || (order.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString())}</span>
               </Stack>
               {showCashier && order.employeeName && (
                  <Stack direction="row" justifyContent="space-between">
                     <span>{L.server}:</span>
                     <span>{order.employeeName}</span>
                  </Stack>
               )}
               {showCustomer && order.customer?.name && (
                  <Stack direction="row" justifyContent="space-between">
                     <span>{L.customer}:</span>
                     <span>{order.customer.name}</span>
                  </Stack>
               )}
            </Box>

            <Divider sx={{ my: 0.5, borderStyle: "dashed", borderColor: "#000" }} />

            {/* Items Table */}
            <Box mb={1}>
               <Stack direction="row" justifyContent="space-between" fontWeight={700} pb={0.5}>
                  <span style={{ width: "55%" }}>{L.item}</span>
                  <span style={{ width: "15%", textAlign: "center" }}>{L.qty}</span>
                  <span style={{ width: "30%", textAlign: "right" }}>{L.total}</span>
               </Stack>
               {order.items.map((it, idx) => (
                  <Box key={idx} sx={{ py: 0.25 }}>
                     <Stack direction="row" justifyContent="space-between">
                        <span style={{ width: "55%", wordBreak: "break-word" }}>{it.name}</span>
                        <span style={{ width: "15%", textAlign: "center" }}>{it.quantity}</span>
                        <span style={{ width: "30%", textAlign: "right" }}>{Number(it.subtotal).toFixed(2)}</span>
                     </Stack>
                     <Typography variant="caption" sx={{ fontFamily: "inherit", color: "#444", fontSize: "9px" }}>
                        @{Number(it.price).toFixed(2)}
                     </Typography>
                  </Box>
               ))}
            </Box>

            <Divider sx={{ my: 0.5, borderStyle: "dashed", borderColor: "#000" }} />

            {/* Totals */}
            <Stack spacing={0.25} sx={{ fontSize: "inherit" }}>
               <Stack direction="row" justifyContent="space-between">
                  <span>{L.subtotal}:</span>
                  <span>{formatMoney(order.subtotal)}</span>
               </Stack>
               {Boolean(order.deliveryCharge) && (
                  <Stack direction="row" justifyContent="space-between">
                     <span>{L.delivery}:</span>
                     <span>{formatMoney(order.deliveryCharge)}</span>
                  </Stack>
               )}
               {Boolean(order.discount) && (
                  <Stack direction="row" justifyContent="space-between">
                     <span>{L.discount}:</span>
                     <span>-{formatMoney(order.discount)}</span>
                  </Stack>
               )}
               <Divider sx={{ my: 0.25, borderStyle: "dashed", borderColor: "#000" }} />
               <Stack direction="row" justifyContent="space-between" fontWeight={800} fontSize={is58mm ? "11px" : "13px"}>
                  <span>{L.totalUpper}:</span>
                  <span>{formatMoney(order.total)}</span>
               </Stack>
               {order.advancePayment != null && (
                  <Stack direction="row" justifyContent="space-between">
                     <span>{L.paid}:</span>
                     <span>{formatMoney(order.advancePayment)}</span>
                  </Stack>
               )}
               {Boolean(order.dueAmount) && (
                  <Stack direction="row" justifyContent="space-between" fontWeight={700}>
                     <span>{L.due}:</span>
                     <span>{formatMoney(order.dueAmount)}</span>
                  </Stack>
               )}
            </Stack>

            <Divider sx={{ my: 1, borderStyle: "dashed", borderColor: "#000" }} />

            {/* Barcode representation & Footer */}
            {showBarcode && (
               <Box textAlign="center" my={1}>
                  <Box
                     sx={{
                        letterSpacing: "4px",
                        fontSize: "14px",
                        fontWeight: 900,
                        borderTop: "1px solid #000",
                        borderBottom: "1px solid #000",
                        py: 0.5,
                        display: "inline-block",
                     }}
                  >
                     * {order.orderId || order.invoiceNo || "DEVX-ORD"} *
                  </Box>
               </Box>
            )}

            <Typography variant="caption" textAlign="center" display="block" sx={{ fontFamily: "inherit", mt: 1 }}>
               {invoiceFooter}
            </Typography>
            <Typography variant="caption" textAlign="center" display="block" sx={{ fontFamily: "inherit", fontSize: "8px", mt: 0.5, color: "#666" }}>
               Powered by DevX POS
            </Typography>
         </Box>
      );
   }

   // ─────────────────────────────────────────────────────────────────────────────
   // 2. A5 BUSINESS INVOICE
   // ─────────────────────────────────────────────────────────────────────────────
   if (selectedId === "a5-business") {
      return (
         <Box
            id="printable-invoice"
            sx={{
               width: "100%",
               ...(isBn ? { fontFamily: BENGALI_FONT_STACK } : {}),
               maxWidth: 650,
               mx: "auto",
               p: 2.5,
               bgcolor: "#FFFFFF",
               color: "#000000",
               borderRadius: 1,
               border: "1px solid #E2E8F0",
               boxShadow: 1,
            }}
         >
            {/* Compact Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" borderBottom={`2px solid ${accentColor}`} pb={1.5} mb={2}>
               <Box>
                  <Typography variant="h6" fontWeight={800} color={accentColor}>
                     {storeName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                     {storeAddress} | {L.tel}: {storePhone}
                  </Typography>
               </Box>
               <Box textAlign="right">
                  <Typography variant="subtitle2" fontWeight={800}>
                     {L.a5Title}
                  </Typography>
                  <Typography variant="caption" fontWeight={700} color="primary.main">
                     #{order.invoiceNo || order.orderId}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                     {L.date}: {order.date || new Date().toLocaleDateString()}
                  </Typography>
               </Box>
            </Stack>

            {/* Bill To Info */}
            {showCustomer && (
               <Box mb={2} p={1} bgcolor="#F8FAFC" borderRadius={1} border="1px solid #EDF2F7">
                  <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                     {L.billTo}
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                     {order.customer?.name || L.walkInCustomer}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                     {order.customer?.phone} | {order.customer?.address || L.noAddress}
                  </Typography>
               </Box>
            )}

            {/* Table */}
            <Table size="small" sx={{ mb: 2 }}>
               <TableHead>
                  <TableRow sx={{ bgcolor: accentColor }}>
                     <TableCell sx={{ color: "#FFF", fontWeight: 700, py: 0.75 }}>{L.item}</TableCell>
                     <TableCell align="center" sx={{ color: "#FFF", fontWeight: 700, py: 0.75 }}>{L.qty}</TableCell>
                     <TableCell align="right" sx={{ color: "#FFF", fontWeight: 700, py: 0.75 }}>{L.rate}</TableCell>
                     <TableCell align="right" sx={{ color: "#FFF", fontWeight: 700, py: 0.75 }}>{L.total}</TableCell>
                  </TableRow>
               </TableHead>
               <TableBody>
                  {order.items.map((it, idx) => (
                     <TableRow key={idx}>
                        <TableCell sx={{ py: 0.75 }}>{it.name}</TableCell>
                        <TableCell align="center" sx={{ py: 0.75 }}>{it.quantity}</TableCell>
                        <TableCell align="right" sx={{ py: 0.75 }}>{formatMoney(it.price)}</TableCell>
                        <TableCell align="right" sx={{ py: 0.75, fontWeight: 700 }}>{formatMoney(it.subtotal)}</TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>

            {/* Totals */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
               <Box maxWidth={300}>
                  <Typography variant="caption" color="text.secondary">
                     {L.paymentMethod}: <b>{order.paymentMethod || "Cash"}</b>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                     {invoiceFooter}
                  </Typography>
               </Box>
               <Stack spacing={0.5} width={200}>
                  <Stack direction="row" justifyContent="space-between">
                     <Typography variant="caption">{L.subtotal}:</Typography>
                     <Typography variant="caption" fontWeight={600}>{formatMoney(order.subtotal)}</Typography>
                  </Stack>
                  {Boolean(order.deliveryCharge) && (
                     <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption">{L.delivery}:</Typography>
                        <Typography variant="caption">{formatMoney(order.deliveryCharge)}</Typography>
                     </Stack>
                  )}
                  {Boolean(order.discount) && (
                     <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption">{L.discount}:</Typography>
                        <Typography variant="caption">-{formatMoney(order.discount)}</Typography>
                     </Stack>
                  )}
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                     <Typography variant="subtitle2" fontWeight={800} color={accentColor}>{L.total}:</Typography>
                     <Typography variant="subtitle2" fontWeight={800} color={accentColor}>{formatMoney(order.total)}</Typography>
                  </Stack>
               </Stack>
            </Stack>

            {showSign && (
               <Stack direction="row" justifyContent="flex-end" pt={2}>
                  <Box textAlign="center" width={160} borderTop="1px solid #CBD5E1">
                     <Typography variant="caption" fontWeight={600}>{L.authorizedSignature}</Typography>
                  </Box>
               </Stack>
            )}
         </Box>
      );
   }

   // ─────────────────────────────────────────────────────────────────────────────
   // 3. ELEGANT BORDER TEMPLATE
   // ─────────────────────────────────────────────────────────────────────────────
   if (selectedId === "elegant-border") {
      return (
         <Box
            id="printable-invoice"
            sx={{
               width: "100%",
               ...(isBn ? { fontFamily: BENGALI_FONT_STACK } : {}),
               maxWidth: 820,
               mx: "auto",
               p: 4,
               bgcolor: "#FFFFFF",
               color: "#000000",
               border: "3px double #1E293B",
               borderRadius: 2,
               boxShadow: 2,
            }}
         >
            {/* Ornate Header */}
            <Box textAlign="center" borderBottom="1px solid #E2E8F0" pb={2.5} mb={3}>
               <Typography variant="h5" fontWeight={900} letterSpacing={isBn ? 0 : 2} textTransform="uppercase" color={accentColor}>
                  {storeName}
               </Typography>
               <Typography variant="body2" color="text.secondary" fontStyle="italic">
                  {storeTagline}
               </Typography>
               <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  {storeAddress} | {L.phone}: {storePhone} | {storeEmail}
               </Typography>
               <Chip label={L.officialInvoice} size="small" sx={{ mt: 1.5, fontWeight: 700, letterSpacing: 1 }} />
            </Box>

            {/* Bill Details */}
            <Stack direction="row" justifyContent="space-between" mb={3} px={1}>
               <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">{L.invoicedTo}</Typography>
                  <Typography variant="subtitle2" fontWeight={700}>{order.customer?.name || L.valuedCustomer}</Typography>
                  <Typography variant="caption" display="block">{order.customer?.phone}</Typography>
                  <Typography variant="caption" display="block">{order.customer?.address}</Typography>
               </Box>
               <Box textAlign="right">
                  <Typography variant="caption" fontWeight={700} color="text.secondary">{L.invoiceDetails}</Typography>
                  <Typography variant="subtitle2" fontWeight={700}>#{order.invoiceNo || order.orderId}</Typography>
                  <Typography variant="caption" display="block">{L.date}: {order.date || new Date().toLocaleDateString()}</Typography>
                  <Typography variant="caption" display="block">{L.method}: {order.paymentMethod || "Cash"}</Typography>
               </Box>
            </Stack>

            {/* Items */}
            <Table sx={{ mb: 3 }}>
               <TableHead>
                  <TableRow sx={{ borderTop: "2px solid #000", borderBottom: "2px solid #000" }}>
                     <TableCell sx={{ fontWeight: 800 }}>{L.description}</TableCell>
                     {showSku && <TableCell align="center" sx={{ fontWeight: 800 }}>{L.sku}</TableCell>}
                     <TableCell align="center" sx={{ fontWeight: 800 }}>{L.quantity}</TableCell>
                     <TableCell align="right" sx={{ fontWeight: 800 }}>{L.price}</TableCell>
                     <TableCell align="right" sx={{ fontWeight: 800 }}>{L.amount}</TableCell>
                  </TableRow>
               </TableHead>
               <TableBody>
                  {order.items.map((it, idx) => (
                     <TableRow key={idx} sx={{ borderBottom: "1px dashed #CBD5E1" }}>
                        <TableCell sx={{ fontWeight: 600 }}>{it.name}</TableCell>
                        {showSku && <TableCell align="center">{it.sku || "-"}</TableCell>}
                        <TableCell align="center">{it.quantity}</TableCell>
                        <TableCell align="right">{formatMoney(it.price)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatMoney(it.subtotal)}</TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>

            {/* Totals */}
            <Stack direction="row" justifyContent="flex-end" mb={3}>
               <Stack spacing={1} width={260} borderTop="1px solid #CBD5E1" pt={1}>
                  <Stack direction="row" justifyContent="space-between">
                     <Typography variant="body2">{L.subtotal}:</Typography>
                     <Typography variant="body2" fontWeight={600}>{formatMoney(order.subtotal)}</Typography>
                  </Stack>
                  {Boolean(order.deliveryCharge) && (
                     <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">{L.deliveryCharge}:</Typography>
                        <Typography variant="body2">{formatMoney(order.deliveryCharge)}</Typography>
                     </Stack>
                  )}
                  {Boolean(order.discount) && (
                     <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">{L.discount}:</Typography>
                        <Typography variant="body2">-{formatMoney(order.discount)}</Typography>
                     </Stack>
                  )}
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                     <Typography variant="subtitle1" fontWeight={900} color={accentColor}>{L.totalAmount}:</Typography>
                     <Typography variant="subtitle1" fontWeight={900} color={accentColor}>{formatMoney(order.total)}</Typography>
                  </Stack>
               </Stack>
            </Stack>

            {/* Footer */}
            <Box borderTop="1px solid #E2E8F0" pt={2} textAlign="center">
               <Typography variant="caption" fontStyle="italic" color="text.secondary">
                  {invoiceFooter}
               </Typography>
            </Box>
         </Box>
      );
   }

   // ─────────────────────────────────────────────────────────────────────────────
   // 4. BOLD HEADER / CORPORATE / CLASSIC PRO / MODERN MINIMAL & ALL OTHER A4 TEMPLATES
   // ─────────────────────────────────────────────────────────────────────────────
   const isBoldHeader = selectedId === "bold-header";
   const isCorporate = selectedId === "corporate";
   const isMonochrome = selectedId === "clean-monochrome";
   const isCashMemo = selectedId === "simple-cash-memo";

   return (
      <Box
         id="printable-invoice"
         sx={{
            width: "100%",
            ...(isBn ? { fontFamily: BENGALI_FONT_STACK } : {}),
            maxWidth: 850,
            mx: "auto",
            p: { xs: 2.5, sm: 4 },
            bgcolor: "#FFFFFF",
            color: "#000000",
            borderRadius: 2,
            boxShadow: 2,
            border: isMonochrome ? "2px solid #000" : "1px solid #E2E8F0",
         }}
      >
         {/* Top Banner (Specialized for Bold Header or Corporate) */}
         {isBoldHeader ? (
            <Box sx={{ bgcolor: "#0F172A", color: "#FFFFFF", p: 3, mx: -4, mt: -4, mb: 3, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
               <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                     <Typography variant="h5" fontWeight={900} letterSpacing={1}>
                        {storeName}
                     </Typography>
                     <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                        {storeTagline} | {storeAddress}
                     </Typography>
                  </Box>
                  <Box textAlign="right">
                     <Typography variant="h6" fontWeight={800} color="#38BDF8">
                        {L.invoice}
                     </Typography>
                     <Typography variant="body2" sx={{ color: "#CBD5E1", fontFamily: "monospace" }}>
                        #{order.invoiceNo || order.orderId}
                     </Typography>
                  </Box>
               </Stack>
            </Box>
         ) : isCashMemo ? (
            <Box textAlign="center" borderBottom="2px solid #BE123C" pb={2} mb={3}>
               <Typography variant="h5" fontWeight={900} color="#BE123C" letterSpacing={isBn ? 0 : 2}>
                  {L.cashMemo}
               </Typography>
               <Typography variant="h6" fontWeight={700}>
                  {storeName}
               </Typography>
               <Typography variant="caption" color="text.secondary">
                  {storeAddress} | {L.phone}: {storePhone}
               </Typography>
            </Box>
         ) : (
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="flex-start" spacing={2} pb={3} mb={3} borderBottom="1px solid #E2E8F0">
               <Box>
                  <Typography variant="h5" fontWeight={800} color={isMonochrome ? "#000" : accentColor}>
                     {storeName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                     {storeTagline}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                     {storeAddress}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                     {L.tel}: {storePhone} | {storeEmail}
                  </Typography>
               </Box>
               <Box textAlign={{ sm: "right" }}>
                  <Typography variant="h6" fontWeight={800} letterSpacing={1} color={isMonochrome ? "#000" : accentColor}>
                     {templateMeta.name.toUpperCase()}
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontFamily: "monospace" }}>
                     {L.invoiceNo} #{order.invoiceNo || order.orderId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                     {L.date}: {order.date || new Date().toLocaleDateString()}
                  </Typography>
                  {order.status && (
                     <Chip
                        label={order.status}
                        size="small"
                        color={order.status === "COMPLETED" || order.status === "DELIVERED" ? "success" : "primary"}
                        sx={{ mt: 0.5, fontWeight: 700 }}
                     />
                  )}
               </Box>
            </Stack>
         )}

         {/* Customer & Shipping Details Grid */}
         <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} mb={3} p={2} bgcolor="#F8FAFC" borderRadius={1.5} border="1px solid #EDF2F7">
            {showCustomer && (
               <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                     {L.customerInvoicedTo}
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700}>
                     {order.customer?.name || L.walkInCustomer}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                     {L.phone}: {order.customer?.phone || "N/A"}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                     {L.address}: {order.customer?.address || L.noAddress}
                  </Typography>
               </Box>
            )}

            <Box textAlign={{ sm: "right" }}>
               <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                  {L.orderPaymentDetails}
               </Typography>
               <Typography variant="caption" display="block">
                  {L.paymentMethod}: <b>{order.paymentMethod || "Cash"}</b>
               </Typography>
               {showCourier && order.courier && (
                  <Typography variant="caption" display="block">
                     {L.courier}: <b>{order.courier}</b> {order.courierTrackingId ? `(${order.courierTrackingId})` : ""}
                  </Typography>
               )}
               {showCashier && order.employeeName && (
                  <Typography variant="caption" display="block">
                     {L.servedBy}: <b>{order.employeeName}</b>
                  </Typography>
               )}
            </Box>
         </Stack>

         {/* Products Table */}
         <Table sx={{ mb: 3 }}>
            <TableHead>
               <TableRow sx={{ bgcolor: isMonochrome ? "#000" : accentColor }}>
                  <TableCell sx={{ color: "#FFF", fontWeight: 700 }}>#</TableCell>
                  <TableCell sx={{ color: "#FFF", fontWeight: 700 }}>{L.itemDescription}</TableCell>
                  {showSku && <TableCell align="center" sx={{ color: "#FFF", fontWeight: 700 }}>{L.sku}</TableCell>}
                  <TableCell align="center" sx={{ color: "#FFF", fontWeight: 700 }}>{L.qty}</TableCell>
                  <TableCell align="right" sx={{ color: "#FFF", fontWeight: 700 }}>{L.unitPrice}</TableCell>
                  <TableCell align="right" sx={{ color: "#FFF", fontWeight: 700 }}>{L.subtotal}</TableCell>
               </TableRow>
            </TableHead>
            <TableBody>
               {order.items.map((it, idx) => (
                  <TableRow key={idx} sx={{ "&:nth-of-type(even)": { bgcolor: "#FAFAFA" } }}>
                     <TableCell>{idx + 1}</TableCell>
                     <TableCell sx={{ fontWeight: 600 }}>{it.name}</TableCell>
                     {showSku && <TableCell align="center" sx={{ color: "text.secondary" }}>{it.sku || "-"}</TableCell>}
                     <TableCell align="center">{it.quantity}</TableCell>
                     <TableCell align="right">{formatMoney(it.price)}</TableCell>
                     <TableCell align="right" sx={{ fontWeight: 700 }}>{formatMoney(it.subtotal)}</TableCell>
                  </TableRow>
               ))}
            </TableBody>
         </Table>

         {/* Summary & Totals */}
         <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={4}>
            <Box maxWidth={400}>
               {order.notes && (
                  <Box mb={2}>
                     <Typography variant="caption" fontWeight={700} color="text.secondary">{L.orderRemarks}</Typography>
                     <Typography variant="body2" color="text.secondary">{order.notes}</Typography>
                  </Box>
               )}
               {showTerms && (
                  <Box>
                     <Typography variant="caption" fontWeight={700} color="text.secondary">{L.termsTitle}</Typography>
                     <Typography variant="caption" display="block" color="text.secondary">
                        {customization.termsText || L.termsDefault}
                     </Typography>
                  </Box>
               )}
            </Box>

            <Stack spacing={1} width={260} borderTop="1px solid #E2E8F0" pt={1}>
               <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">{L.subtotal}:</Typography>
                  <Typography variant="body2" fontWeight={600}>{formatMoney(order.subtotal)}</Typography>
               </Stack>
               {Boolean(order.deliveryCharge) && (
                  <Stack direction="row" justifyContent="space-between">
                     <Typography variant="body2">{L.deliveryCharge}:</Typography>
                     <Typography variant="body2">{formatMoney(order.deliveryCharge)}</Typography>
                  </Stack>
               )}
               {Boolean(order.discount) && (
                  <Stack direction="row" justifyContent="space-between">
                     <Typography variant="body2">{L.discount}:</Typography>
                     <Typography variant="body2">-{formatMoney(order.discount)}</Typography>
                  </Stack>
               )}
               {Boolean(order.tax) && (
                  <Stack direction="row" justifyContent="space-between">
                     <Typography variant="body2">{L.taxVat}:</Typography>
                     <Typography variant="body2">{formatMoney(order.tax)}</Typography>
                  </Stack>
               )}
               <Divider />
               <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1" fontWeight={800} color={isMonochrome ? "#000" : accentColor}>
                     {L.grandTotal}:
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={800} color={isMonochrome ? "#000" : accentColor}>
                     {formatMoney(order.total)}
                  </Typography>
               </Stack>
               {order.advancePayment != null && (
                  <Stack direction="row" justifyContent="space-between">
                     <Typography variant="body2">{L.paidAmount}:</Typography>
                     <Typography variant="body2" fontWeight={600}>{formatMoney(order.advancePayment)}</Typography>
                  </Stack>
               )}
               {Boolean(order.dueAmount) && (
                  <Stack direction="row" justifyContent="space-between">
                     <Typography variant="body2" color="error.main" fontWeight={700}>{L.dueBalance}:</Typography>
                     <Typography variant="body2" color="error.main" fontWeight={700}>{formatMoney(order.dueAmount)}</Typography>
                  </Stack>
               )}
            </Stack>
         </Stack>

         {/* Signatures & Footer */}
         {showSign && (
            <Stack direction="row" justifyContent="space-between" pt={4} mb={2}>
               <Box textAlign="center" width={180} borderTop="1px solid #94A3B8">
                  <Typography variant="caption" fontWeight={600}>{L.cashierOperator}</Typography>
               </Box>
               <Box textAlign="center" width={180} borderTop="1px solid #94A3B8">
                  <Typography variant="caption" fontWeight={600}>{L.customerAcceptance}</Typography>
               </Box>
               <Box textAlign="center" width={180} borderTop="1px solid #94A3B8">
                  <Typography variant="caption" fontWeight={600}>{L.authorizedSignature}</Typography>
               </Box>
            </Stack>
         )}

         <Box borderTop="1px solid #E2E8F0" pt={2} textAlign="center">
            <Typography variant="caption" color="text.secondary">
               {invoiceFooter}
            </Typography>
         </Box>
      </Box>
   );
}
