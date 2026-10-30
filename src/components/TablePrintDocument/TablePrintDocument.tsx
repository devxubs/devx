"use client";

import React from "react";
import { ExportColumn, SummaryRowItem, getColField, getColHeader } from "@src/lib/exportEngine";
import { StoreSettings } from "@src/lib/settingsContext";
import InvoiceRenderer from "../InvoiceTemplates/InvoiceRenderer";
import { InvoiceOrderData } from "../InvoiceTemplates/types";

export interface PrintDocumentProps {
   title: string;
   selectedRecords: any[];
   columns: ExportColumn[];
   settings: StoreSettings;
   summaryRows?: SummaryRowItem[];
   metadata?: { label: string; value: string }[];
   isInvoiceBatch?: boolean;
   invoiceOrders?: InvoiceOrderData[];
}

export default function TablePrintDocument({
   title,
   selectedRecords,
   columns,
   settings,
   summaryRows,
   metadata,
   isInvoiceBatch,
   invoiceOrders,
}: PrintDocumentProps) {
   // 1. Batch Invoices Mode (Orders)
   if (isInvoiceBatch && invoiceOrders && invoiceOrders.length > 0) {
      return (
         <div className="devx-print-document-container" style={{ width: "100%", background: "#fff", color: "#000" }}>
            {invoiceOrders.map((orderData, index) => (
               <div
                  key={orderData.orderId || orderData.id || index}
                  style={{
                     pageBreakAfter: index === invoiceOrders.length - 1 ? "avoid" : "always",
                     breakAfter: index === invoiceOrders.length - 1 ? "avoid" : "page",
                     marginBottom: "15mm",
                  }}
               >
                  <InvoiceRenderer
                     order={orderData}
                     customization={{
                        ...settings,
                        ...(settings?.customConfig || {}),
                     }}
                  />
               </div>
            ))}
         </div>
      );
   }

   // 2. Tabular Document Mode (Customers, Suppliers, Purchases, Expenses, Assets, Billing, Reports, Orders Table)
   return (
      <div
         className="devx-print-document-container"
         style={{
            width: "100%",
            background: "#ffffff",
            color: "#0f172a",
            fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            padding: "5mm 0",
            boxSizing: "border-box",
         }}
      >
         {/* HEADER SECTION (Centered Company Branding & Document Details) */}
         <div style={{ textAlign: "center", marginBottom: "20px" }}>
            {settings.logoUrl && (
               <div style={{ marginBottom: "8px" }}>
                  <img
                     src={settings.logoUrl}
                     alt={settings.storeName || "DevX POS"}
                     style={{ maxHeight: "50px", objectFit: "contain" }}
                  />
               </div>
            )}
            <div style={{ fontSize: "22px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", color: "#0f172a" }}>
               {settings.storeName || "DevX POS"}
            </div>
            {settings.tagline && (
               <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  {settings.tagline}
               </div>
            )}
            <div
               style={{
                  display: "inline-block",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "#0284c7",
                  marginTop: "6px",
                  borderBottom: "2px solid #0284c7",
                  paddingBottom: "3px",
               }}
            >
               {title}
            </div>
            <div style={{ fontSize: "10px", color: "#475569", marginTop: "8px", lineHeight: "1.4" }}>
               <span>Generated on: <strong>{new Date().toLocaleString()}</strong></span>
               <span> &bull; Selected Records: <strong>{selectedRecords.length}</strong></span>
               {settings.phone && <span> &bull; Phone: {settings.phone}</span>}
               {settings.email && <span> &bull; Email: {settings.email}</span>}
               {settings.address && <div>Address: {settings.address}</div>}
            </div>
         </div>

         {/* OPTIONAL METADATA CHIPS */}
         {metadata && metadata.length > 0 && (
            <div
               style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  marginBottom: "16px",
                  fontSize: "11px",
                  background: "#f8fafc",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "1px solid #e2e8f0",
               }}
            >
               {metadata.map((m, idx) => (
                  <div key={idx}>
                     <span style={{ color: "#64748b" }}>{m.label}: </span>
                     <strong style={{ color: "#0f172a" }}>{m.value}</strong>
                  </div>
               ))}
            </div>
         )}

         {/* DATA TABLE */}
         <table
            style={{
               width: "100%",
               borderCollapse: "collapse",
               fontSize: "10.5pt",
               marginTop: "10px",
            }}
         >
            <thead>
               <tr style={{ backgroundColor: "#1e293b", color: "#ffffff" }}>
                  <th
                     style={{
                        padding: "8px 6px",
                        textAlign: "center",
                        border: "1px solid #334155",
                        width: "35px",
                        fontSize: "9pt",
                        fontWeight: "700",
                     }}
                  >
                     SL
                  </th>
                  {columns.map((col, idx) => (
                     <th
                        key={idx}
                        style={{
                           padding: "8px 8px",
                           textAlign: col.type === "currency" || col.type === "number" ? "right" : "left",
                           border: "1px solid #334155",
                           fontSize: "9pt",
                           fontWeight: "700",
                           whiteSpace: "nowrap",
                        }}
                     >
                        {getColHeader(col)}
                     </th>
                  ))}
               </tr>
            </thead>
            <tbody>
               {selectedRecords.map((row, rIdx) => (
                  <tr
                     key={rIdx}
                     style={{
                        backgroundColor: rIdx % 2 === 1 ? "#f8fafc" : "#ffffff",
                        pageBreakInside: "avoid",
                     }}
                  >
                     <td
                        style={{
                           padding: "6px 6px",
                           textAlign: "center",
                           border: "1px solid #e2e8f0",
                           color: "#64748b",
                           fontSize: "9pt",
                        }}
                     >
                        {rIdx + 1}
                     </td>
                     {columns.map((col, cIdx) => {
                        const val = row[getColField(col)];
                        let formatted = val ?? "-";
                        if (col.format) {
                           formatted = col.format(val, row);
                        } else if (col.type === "currency") {
                           formatted = `৳ ${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        } else if (col.type === "date" && val) {
                           formatted = new Date(val).toLocaleDateString();
                        }

                        return (
                           <td
                              key={cIdx}
                              style={{
                                 padding: "6px 8px",
                                 textAlign: col.type === "currency" || col.type === "number" ? "right" : "left",
                                 border: "1px solid #e2e8f0",
                                 fontSize: "9.5pt",
                              }}
                           >
                              {String(formatted)}
                           </td>
                        );
                     })}
                  </tr>
               ))}
            </tbody>
            {/* SUMMARY TOTALS */}
            {summaryRows && summaryRows.length > 0 && (
               <tfoot>
                  {summaryRows.map((s, idx) => (
                     <tr
                        key={idx}
                        style={{
                           fontWeight: "bold",
                           backgroundColor: "#f1f5f9",
                           borderTop: "2px solid #cbd5e1",
                        }}
                     >
                        <td
                           colSpan={columns.length}
                           style={{
                              padding: "8px 10px",
                              textAlign: "right",
                              border: "1px solid #cbd5e1",
                              fontSize: "10pt",
                              fontWeight: "700",
                           }}
                        >
                           {s.label}
                        </td>
                        <td
                           style={{
                              padding: "8px 10px",
                              textAlign: "right",
                              border: "1px solid #cbd5e1",
                              fontSize: "10.5pt",
                              fontWeight: "800",
                              color: s.isTotal ? "#0f766e" : "#0f172a",
                           }}
                        >
                           {String(s.value)}
                        </td>
                     </tr>
                  ))}
               </tfoot>
            )}
         </table>

         {/* SIGNATURES SECTION */}
         <div
            style={{
               marginTop: "40px",
               display: "flex",
               justifyContent: "space-between",
               pageBreakInside: "avoid",
               paddingTop: "30px",
            }}
         >
            <div style={{ textAlign: "center", width: "180px", borderTop: "1px solid #64748b", paddingTop: "6px" }}>
               <div style={{ fontSize: "10pt", fontWeight: "600", color: "#0f172a" }}>Prepared By</div>
               <div style={{ fontSize: "8pt", color: "#64748b" }}>Staff Signature</div>
            </div>
            <div style={{ textAlign: "center", width: "180px", borderTop: "1px solid #64748b", paddingTop: "6px" }}>
               <div style={{ fontSize: "10pt", fontWeight: "600", color: "#0f172a" }}>Authorized By</div>
               <div style={{ fontSize: "8pt", color: "#64748b" }}>Management Signature</div>
            </div>
         </div>

         {/* PAGE FOOTER */}
         <div
            style={{
               textAlign: "center",
               fontSize: "8.5pt",
               color: "#94a3b8",
               marginTop: "30px",
               borderTop: "1px dashed #e2e8f0",
               paddingTop: "8px",
            }}
         >
            DevX POS Business Management System &bull; Confidential Business Document
         </div>
      </div>
   );
}
