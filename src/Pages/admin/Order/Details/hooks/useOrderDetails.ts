"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSettings } from "@src/lib/settingsContext";
import { usePrint } from "@src/components/TablePrintDocument/PrintPortal";
import { mapOrderToInvoiceData } from "../helpers";
import { FeedbackState, QuickEditProduct } from "../types";

export function useOrderDetails(orderIdProp?: string) {
   const params = useParams();
   const id = (orderIdProp || params?.id) as string;

   const { printDocument } = usePrint();
   const { settings } = useSettings();

   const [order, setOrder] = useState<any>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [feedback, setFeedback] = useState<FeedbackState | null>(null);

   const fetchOrder = useCallback(async () => {
      if (!id) return;
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
   }, [id]);

   const handlePrintInvoice = useCallback(() => {
      if (!order) return;
      const invoiceData = mapOrderToInvoiceData(order);
      printDocument({
         title: `Invoice - ${invoiceData.invoiceNo || invoiceData.orderId}`,
         selectedRecords: [order],
         columns: [],
         settings,
         isInvoiceBatch: true,
         invoiceOrders: [invoiceData],
      });
   }, [order, printDocument, settings]);

   useEffect(() => {
      fetchOrder();
   }, [fetchOrder]);

   // Extracted notes
   const notes = useMemo(() => {
      const tagsObj =
         typeof order?.orderTags === "object" && order?.orderTags !== null
            ? (order.orderTags as Record<string, any>)
            : {};
      return {
         courierNote: tagsObj.courierNote || "",
         customerNote: tagsObj.customerNote || order?.orderNote || "",
         packingNote: tagsObj.packingNote || "",
         employeeNote: tagsObj.employeeNote || "",
      };
   }, [order]);

   // Quick edit products formatting
   const quickEditProducts = useMemo((): QuickEditProduct[] => {
      return (order?.items || []).map((it: any) => ({
         id: it.product?.id || it.productId || it.id || "",
         productId: it.product?.id || it.productId || null,
         orderItemId: it.id,
         name: it.name || it.product?.productName || "Product Item",
         price: Number(it.price || 0),
         quantity: Number(it.quantity || 1),
         images: it.product?.images?.[0] || it.product?.image || "",
         code: it.code || it.product?.productCode || it.product?.productSku || it.sku || "",
         subtotal: Number(it.subtotal || Number(it.price || 0) * Number(it.quantity || 1)),
         isDeleted: Boolean(it.product?.isDeleted),
      }));
   }, [order]);

   const isCancelledOrder = useMemo(() => {
      return ["CANCELLED", "FAILED", "RETURNED"].includes(
         String(order?.status || "").toUpperCase(),
      );
   }, [order?.status]);

   const displayOrderId = useMemo(() => {
      if (!order) return "";
      return order.orderCode || order.orderId || order.customId || `ORD_${order.id}`;
   }, [order]);

   const orderDate = useMemo(() => {
      return order?.createdAt ? new Date(order.createdAt) : new Date();
   }, [order?.createdAt]);

   return {
      id,
      order,
      loading,
      error,
      feedback,
      notes,
      quickEditProducts,
      isCancelledOrder,
      displayOrderId,
      orderDate,
      setOrder,
      setFeedback,
      fetchOrder,
      handlePrintInvoice,
   };
}
