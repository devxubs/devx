"use client";

// Order Create (upgrade) — dedicated print-only invoice.
// Rendered hidden on screen; a scoped <style> block (unique class prefix)
// makes ONLY this invoice visible when printing — sidebar, navbar and the
// form are never printed. Before the order is saved there is no server
// invoice number yet, so the document is clearly labelled as a preview.
import React from "react";
import { formatBDT, lineDiscountAmount, lineTotal } from "./orderCalculations";
import type { CustomerFormState, OrderLine, OrderTotals } from "./types";

export interface InvoicePrintProps {
   storeName: string;
   tagline?: string;
   logoUrl?: string;
   storeAddress?: string;
   storePhone?: string;
   storeEmail?: string;
   invoiceFooter?: string;
   /** Real server ids — only present after a successful creation. */
   orderIdLabel?: string;
   invoiceLabel?: string;
   isPreview: boolean;
   customer: CustomerFormState;
   lines: OrderLine[];
   totals: OrderTotals;
   paymentMethod: string;
   courier: string;
   currencySymbol?: string;
}

const PRINT_CSS = `
.oc-print-root { display: none; }
@media print {
  body * { visibility: hidden !important; }
  .oc-print-root, .oc-print-root * { visibility: visible !important; }
  .oc-print-root {
    display: block !important;
    position: absolute;
    inset: 0;
    width: 100%;
    padding: 24px;
    background: #ffffff;
    color: #111111;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
  }
  .oc-print-root table { width: 100%; border-collapse: collapse; }
  .oc-print-root th, .oc-print-root td { border: 1px solid #cccccc; padding: 6px 8px; text-align: left; }
  .oc-print-root th { background: #f2f2f2; }
  .oc-print-root .r { text-align: right; }
  .oc-print-root .c { text-align: center; }
}
`;

const InvoicePrint = (props: InvoicePrintProps) => {
   const {
      storeName,
      tagline,
      logoUrl,
      storeAddress,
      storePhone,
      storeEmail,
      invoiceFooter,
      orderIdLabel,
      invoiceLabel,
      isPreview,
      customer,
      lines,
      totals,
      paymentMethod,
      courier,
      currencySymbol = "৳",
   } = props;

   const dateLabel = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "short",
      year: "numeric",
   }).format(new Date());

   return (
      <>
         <style>{PRINT_CSS}</style>
         <div className="oc-print-root">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
               <div>
                  {logoUrl ? (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img src={logoUrl} alt={storeName} style={{ height: 42, objectFit: "contain" }} />
                  ) : null}
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{storeName}</div>
                  {tagline ? <div>{tagline}</div> : null}
                  {storeAddress ? <div>{storeAddress}</div> : null}
                  <div>{[storePhone, storeEmail].filter(Boolean).join(" · ")}</div>
               </div>
               <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>
                     INVOICE{isPreview ? " (PREVIEW)" : ""}
                  </div>
                  <div>Invoice No: {invoiceLabel || "Assigned on save"}</div>
                  <div>Order ID: {orderIdLabel || "Assigned on save"}</div>
                  <div>Date: {dateLabel}</div>
                  {courier ? <div>Delivery: {courier}</div> : null}
               </div>
            </div>

            <hr style={{ margin: "14px 0" }} />

            <div>
               <strong>Bill To:</strong> {customer.name || "Walk-in Customer"}
               <br />
               {customer.phone ? <>Phone: {customer.phone}<br /></> : null}
               {customer.email ? <>Email: {customer.email}<br /></> : null}
               {customer.address ? <>Address: {customer.address}</> : null}
            </div>

            <table style={{ marginTop: 14 }}>
               <thead>
                  <tr>
                     <th>Product</th>
                     <th className="c">Qty</th>
                     <th className="r">Unit Price</th>
                     <th className="r">Discount</th>
                     <th className="r">Line Total</th>
                  </tr>
               </thead>
               <tbody>
                  {lines.map((l) => (
                     <tr key={l.productId}>
                        <td>
                           {l.name}
                           {l.code ? <div style={{ color: "#666" }}>SKU: {l.code}</div> : null}
                        </td>
                        <td className="c">{l.quantity}</td>
                        <td className="r">{formatBDT(l.listPrice, currencySymbol)}</td>
                        <td className="r">{formatBDT(lineDiscountAmount(l), currencySymbol)}</td>
                        <td className="r">{formatBDT(lineTotal(l), currencySymbol)}</td>
                     </tr>
                  ))}
               </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
               <table style={{ width: 280 }}>
                  <tbody>
                     <tr><td>Subtotal</td><td className="r">{formatBDT(totals.subtotal, currencySymbol)}</td></tr>
                     <tr><td>Product Discount</td><td className="r">− {formatBDT(totals.productDiscount, currencySymbol)}</td></tr>
                     <tr><td>Overall Discount</td><td className="r">− {formatBDT(totals.overallDiscount, currencySymbol)}</td></tr>
                     <tr><td>Tax / VAT</td><td className="r">{formatBDT(totals.taxAmount, currencySymbol)}</td></tr>
                     <tr><td>Delivery Charge</td><td className="r">{formatBDT(totals.deliveryCharge, currencySymbol)}</td></tr>
                     <tr><td><strong>Grand Total</strong></td><td className="r"><strong>{formatBDT(totals.grandTotal, currencySymbol)}</strong></td></tr>
                     <tr><td>Paid (Advance)</td><td className="r">{formatBDT(totals.advancePayment, currencySymbol)}</td></tr>
                     <tr><td><strong>Due</strong></td><td className="r"><strong>{formatBDT(totals.dueAmount, currencySymbol)}</strong></td></tr>
                  </tbody>
               </table>
            </div>

            <div style={{ marginTop: 12 }}>
               Payment Method: {paymentMethod || "—"} · Payment Status: {totals.paymentStatus}
            </div>
            {invoiceFooter ? <div style={{ marginTop: 16, color: "#555" }}>{invoiceFooter}</div> : null}
            {isPreview ? (
               <div style={{ marginTop: 8, color: "#888" }}>
                  Preview only — the invoice number is assigned when the order is created.
               </div>
            ) : null}
         </div>
      </>
   );
};

export default InvoicePrint;
