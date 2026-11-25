// Purchase Create (redesign) — "Print Purchase Invoice" after a
// successful creation, through the app's existing shared print
// system (usePrint / TablePrintDocument — the same portal the order
// invoices and barcode labels use). No new print machinery: the
// created purchase returned by POST /api/purchases is rendered as a
// titled document with metadata, an items table and summary rows.

import type { PrintDocumentProps } from "@src/components/TablePrintDocument/TablePrintDocument";
import { paymentStatusLabel, type PurchasePaymentStatus } from "./calculations";

const fmt = (value: any): string => `৳${(Number(value) || 0).toFixed(2)}`;

export function buildPurchaseInvoicePrint(
   purchase: any,
   settings: PrintDocumentProps["settings"],
): PrintDocumentProps {
   const items = (purchase.items || []).map((it: any) => ({
      name: it.variant?.variantName
         ? `${it.name} — ${it.variant.variantName}`
         : it.name,
      code: it.code || "",
      quantity: it.quantity,
      price: Number(it.price) || 0,
      subtotal: Number(it.subtotal) || 0,
   }));

   const total = Number(purchase.total) || 0;
   const paid = Number(purchase.paid) || 0;
   const due = Number(purchase.due) || 0;
   const status: PurchasePaymentStatus =
      due > 0 ? (paid > 0 ? "PARTIAL" : "UNPAID") : "PAID";

   const dateText = purchase.createdAt
      ? new Date(purchase.createdAt).toLocaleDateString("en-GB", {
           day: "2-digit",
           month: "short",
           year: "numeric",
        })
      : "";

   return {
      title: `Purchase Invoice - ${purchase.customId || ""}`,
      selectedRecords: items,
      columns: [
         { field: "name", headerName: "Product" },
         {
            field: "code",
            headerName: "SKU",
            format: (v: any) => v || "—",
         },
         { field: "quantity", headerName: "Qty" },
         {
            field: "price",
            headerName: "Purchase Price",
            format: (v: any) => fmt(v),
         },
         {
            field: "subtotal",
            headerName: "Subtotal",
            format: (v: any) => fmt(v),
         },
      ],
      settings,
      metadata: [
         { label: "Purchase ID", value: purchase.customId || "—" },
         { label: "Supplier", value: purchase.supplier?.name || "—" },
         {
            label: "Supplier Invoice ID",
            value: purchase.invoice ? String(purchase.invoice) : "Not provided",
         },
         { label: "Date", value: dateText },
         { label: "Payment Status", value: paymentStatusLabel(status) },
      ],
      summaryRows: [
         { label: "Subtotal", value: fmt(purchase.productAmount) },
         { label: "Others Cost", value: fmt(purchase.othersCost) },
         { label: "Discount", value: `−${fmt(purchase.discount)}` },
         { label: "Grand Total", value: fmt(total), isTotal: true },
         { label: "Paid", value: fmt(paid) },
         { label: "Due", value: fmt(due) },
      ],
   };
}
