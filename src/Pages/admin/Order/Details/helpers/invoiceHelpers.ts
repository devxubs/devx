import { InvoiceOrderData } from "@src/components/InvoiceTemplates/types";

/**
 * Maps an order database record or row object into the standardized InvoiceOrderData
 * required by the invoice templates and direct invoice printing pipeline.
 */
export function mapOrderToInvoiceData(order: any): InvoiceOrderData {
   const prods = Array.isArray(order.items)
      ? order.items
      : Array.isArray(order.products)
        ? order.products
        : [];

   return {
      id: order.id,
      orderId: order.orderCode || order.orderId || order.customId || `ORD_${order.id}`,
      invoiceNo: order.invoiceNo || order.orderCode || order.orderId || order.customId || `INV_${order.id}`,
      date: order.createdAt
         ? new Date(order.createdAt).toLocaleDateString()
         : new Date().toLocaleDateString(),
      createdAt: order.createdAt || new Date().toISOString(),
      paymentMethod: order.pricing?.paymentMethod || order.paymentMethod || "Cash On Delivery",
      paymentStatus: order.paymentStatus || "PAID",
      status: order.status || "COMPLETED",
      courier: order.courier,
      courierTrackingId: order.courierTrackingId,
      employeeName: order.employee?.name || order.employeeName,
      notes: order.orderNote || order.notes || "",
      customer: order.customer
         ? {
              name: order.customer.name || order.customerName || "Walk-in Customer",
              phone: order.customer.phone || order.customerPhone || "-",
              email: order.customer.email || order.customerEmail || "",
              address: order.customer.address || order.customerAddress || "-",
           }
         : {
              name: order.customerName || "Walk-in Customer",
              phone: order.customerPhone || "-",
              email: order.customerEmail || "",
              address: order.customerAddress || "-",
           },
      items: prods.map((it: any) => ({
         name: it.name || it.title || it.product?.productName || "Product Item",
         sku: it.sku || it.code || it.product?.sku || "-",
         barcode: it.barcode || it.product?.barcode,
         quantity: Number(it.quantity || 1),
         price: Number(it.price || 0),
         subtotal: Number(it.subtotal || Number(it.price || 0) * Number(it.quantity || 1)),
      })),
      subtotal: Number(order.pricing?.subtotal ?? order.subtotal ?? 0),
      deliveryCharge: Number(order.pricing?.deliveryCharge ?? order.deliveryCharge ?? 0),
      discount: Number(order.pricing?.discount ?? order.discount ?? 0),
      tax: Number(order.pricing?.tax ?? order.tax ?? 0),
      total: Number(order.pricing?.total ?? order.total ?? 0),
      advancePayment: Number(order.pricing?.advancePayment ?? order.advancePayment ?? order.paid ?? 0),
      dueAmount: Number(order.pricing?.dueAmount ?? order.dueAmount ?? order.due ?? 0),
   };
}
