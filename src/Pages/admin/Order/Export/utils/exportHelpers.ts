import { ExportColumn, SummaryRowItem } from "@src/lib/exportEngine";
import { NormalizedOrderRow, OrderFieldKey } from "../types/export.types";
import { ORDER_FIELD_GROUPS } from "./exportConstants";

export function normalizeOrderData(orders: any[]): NormalizedOrderRow[] {
   return (orders || []).map((o, idx) => {
      const prods = Array.isArray(o.items)
         ? o.items
         : Array.isArray(o.products)
           ? o.products
           : [];

      const productNames = prods
         .map((p: any) => p.name || p.title || p.product?.productName || "Item")
         .join(", ");
      const skus = prods
         .map((p: any) => p.sku || p.code || p.product?.sku || "-")
         .filter((s: string) => s !== "-")
         .join(", ");
      const categories = prods
         .map((p: any) => p.category || p.product?.category || "-")
         .filter((c: string) => c !== "-")
         .join(", ");
      const totalQty = prods.reduce(
         (acc: number, p: any) => acc + (Number(p.quantity) || 1),
         0,
      );
      const avgPrice =
         prods.length > 0
            ? prods.reduce((acc: number, p: any) => acc + (Number(p.price) || 0), 0) /
              prods.length
            : Number(o.total || 0);

      const customer = o.customer || {};
      const employee = o.employee || {};

      const subtotal = Number(o.pricing?.subtotal ?? o.subtotal ?? 0);
      const deliveryCharge = Number(o.pricing?.deliveryCharge ?? o.deliveryCharge ?? o.courierCharge ?? 0);
      const discount = Number(o.pricing?.discount ?? o.discount ?? 0);
      const total = Number(o.pricing?.total ?? o.total ?? 0);
      const paid = Number(o.pricing?.advancePayment ?? o.advancePayment ?? o.paid ?? 0);
      const due = Number(o.pricing?.dueAmount ?? o.dueAmount ?? o.due ?? Math.max(0, total - paid));
      const paymentMethod = String(o.pricing?.paymentMethod || o.paymentMethod || "Cash On Delivery");

      const paymentStatus =
         due <= 0 && total > 0
            ? "Paid"
            : paid > 0 && due > 0
              ? "Partial"
              : "Unpaid";

      return {
         id: String(o.id || `order-${idx + 1}`),
         orderId: String(o.orderCode || o.orderId || o.customId || `ORD_${idx + 1}`),
         invoiceNo: String(o.invoiceNo || o.orderId || `INV-${idx + 1}`),
         status: String(o.status || "Pending"),
         paymentStatus,
         orderNote: String(o.orderNote || o.notes || "-"),
         createdAt: o.createdAt
            ? new Date(o.createdAt).toLocaleDateString()
            : "-",
         updatedAt: o.updatedAt
            ? new Date(o.updatedAt).toLocaleDateString()
            : "-",
         customerName: String(customer.name || o.customerName || "Walk-in Customer"),
         customerPhone: String(customer.phone || o.customerPhone || "-"),
         customerEmail: String(customer.email || o.customerEmail || "-"),
         customerAddress: String(customer.address || o.customerAddress || "-"),
         productName: productNames || "-",
         sku: skus || "-",
         category: categories || "-",
         quantity: totalQty || 1,
         unit: String(o.unit || "pc"),
         unitPrice: avgPrice,
         discount,
         tax: Number(o.tax || 0),
         subtotal,
         total,
         paid,
         due,
         paymentMethod,
         deliveryCharge,
         courier: String(o.courier || "-"),
         courierStatus: String(o.courierStatus || "-"),
         orderSource: String(o.orderSource || "Direct"),
         orderType: String(o.orderType || "Regular"),
         createdBy: String(employee.name || "-"),
         printStatus: String(o.printStatus || "Not Printed"),
         raw: o,
      };
   });
}

const FIELD_LABEL_MAP = new Map<OrderFieldKey, string>();
ORDER_FIELD_GROUPS.forEach((g) => {
   g.fields.forEach((f) => {
      FIELD_LABEL_MAP.set(f.key, f.label);
   });
});

export function buildOrderExportColumns(
   selectedKeys: Set<OrderFieldKey>,
): ExportColumn[] {
   // Preserve predefined group order
   const columns: ExportColumn[] = [];

   ORDER_FIELD_GROUPS.forEach((g) => {
      g.fields.forEach((f) => {
         if (selectedKeys.has(f.key)) {
            const isCurrency =
               f.key === "total" ||
               f.key === "paid" ||
               f.key === "due" ||
               f.key === "subtotal" ||
               f.key === "deliveryCharge" ||
               f.key === "discount" ||
               f.key === "tax" ||
               f.key === "unitPrice";

            columns.push({
               field: f.key,
               headerName: f.label,
               width: f.key === "customerAddress" || f.key === "productName" ? 30 : 20,
               type: isCurrency ? "currency" : undefined,
            });
         }
      });
   });

   return columns;
}

export function buildOrderSummaryRows(
   selectedKeys: Set<OrderFieldKey>,
   rows: NormalizedOrderRow[],
): SummaryRowItem[] {
   const summaries: SummaryRowItem[] = [];

   summaries.push({
      label: "Total Orders Selected:",
      value: String(rows.length),
   });

   if (selectedKeys.has("total")) {
      const sumTotal = rows.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
      summaries.push({
         label: "Grand Total Revenue:",
         value: `৳ ${sumTotal.toFixed(2)}`,
         isTotal: true,
      });
   }

   if (selectedKeys.has("paid")) {
      const sumPaid = rows.reduce((acc, r) => acc + (Number(r.paid) || 0), 0);
      summaries.push({
         label: "Total Paid Amount:",
         value: `৳ ${sumPaid.toFixed(2)}`,
      });
   }

   if (selectedKeys.has("due")) {
      const sumDue = rows.reduce((acc, r) => acc + (Number(r.due) || 0), 0);
      summaries.push({
         label: "Total Due Amount:",
         value: `৳ ${sumDue.toFixed(2)}`,
      });
   }

   return summaries;
}
