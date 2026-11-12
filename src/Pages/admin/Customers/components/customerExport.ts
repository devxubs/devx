// Customer Page upgrade — export of the SELECTED customers only.
// CSV is generated in-browser (UTF-8 BOM, RFC-style quoting). Excel uses
// exceljs (existing project dependency) via dynamic import so it stays
// out of the main bundle. Monetary values are stored as numbers.
import dayjs from "dayjs";
import type { CustomerRow } from "./customerFilterUtils";

export const CUSTOMER_EXPORT_HEADERS = [
   "Customer ID",
   "Name",
   "Phone",
   "Email",
   "Address",
   "Registration Date",
   "Total Orders",
   "Total Purchase",
   "Total Paid",
   "Total Due",
   "Last Order Date",
   "Status",
] as const;

const money = (v: number) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
const dateOnly = (v: string | null | undefined) =>
   v ? dayjs(v).format("YYYY-MM-DD") : "";

function fileStamp() {
   return dayjs().format("YYYY-MM-DD");
}

function downloadBlob(blob: Blob, filename: string) {
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = filename;
   document.body.appendChild(a);
   a.click();
   a.remove();
   setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(value: string | number): string {
   const s = String(value ?? "");
   if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
   return s;
}

export function exportCustomersToCsv(rows: CustomerRow[]): void {
   const lines: string[] = [];
   lines.push(CUSTOMER_EXPORT_HEADERS.map(csvEscape).join(","));
   for (const r of rows) {
      lines.push(
         [
            csvEscape(r.customId || ""),
            csvEscape(r.name || ""),
            csvEscape(r.phone || ""),
            csvEscape(r.email || ""),
            csvEscape(r.address || ""),
            csvEscape(dateOnly(r.createdAt)),
            csvEscape(r.totalOrders),
            csvEscape(money(r.totalPurchase).toFixed(2)),
            csvEscape(money(r.totalPaid).toFixed(2)),
            csvEscape(money(r.totalDue).toFixed(2)),
            csvEscape(dateOnly(r.lastOrderAt)),
            csvEscape(r.status),
         ].join(","),
      );
   }
   // ﻿ prefix = UTF-8 BOM so Excel renders Bengali/Unicode correctly.
   const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
   });
   downloadBlob(blob, `devx-customers-${fileStamp()}.csv`);
}

export async function exportCustomersToExcel(
   rows: CustomerRow[],
): Promise<void> {
   const ExcelJSImport: any = await import("exceljs");
   const ExcelJS = ExcelJSImport.default ?? ExcelJSImport;

   const workbook = new ExcelJS.Workbook();
   workbook.creator = "DevX POS";
   workbook.created = new Date();
   const sheet = workbook.addWorksheet("Customers");

   sheet.columns = [
      { header: "Customer ID", key: "customId", width: 14 },
      { header: "Name", key: "name", width: 26 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Email", key: "email", width: 26 },
      { header: "Address", key: "address", width: 30 },
      { header: "Registration Date", key: "registered", width: 16 },
      { header: "Total Orders", key: "totalOrders", width: 13 },
      { header: "Total Purchase", key: "totalPurchase", width: 16 },
      { header: "Total Paid", key: "totalPaid", width: 16 },
      { header: "Total Due", key: "totalDue", width: 16 },
      { header: "Last Order Date", key: "lastOrder", width: 16 },
      { header: "Status", key: "status", width: 12 },
   ];

   const headerRow = sheet.getRow(1);
   headerRow.font = { bold: true };
   headerRow.alignment = { vertical: "middle" };

   for (const r of rows) {
      sheet.addRow({
         customId: r.customId || "",
         name: r.name || "",
         phone: r.phone || "",
         email: r.email || "",
         address: r.address || "",
         registered: r.createdAt ? dayjs(r.createdAt).toDate() : "",
         totalOrders: Number(r.totalOrders || 0),
         totalPurchase: money(r.totalPurchase),
         totalPaid: money(r.totalPaid),
         totalDue: money(r.totalDue),
         lastOrder: r.lastOrderAt ? dayjs(r.lastOrderAt).toDate() : "",
         status: r.status,
      });
   }

   sheet.getColumn("registered").numFmt = "yyyy-mm-dd";
   sheet.getColumn("lastOrder").numFmt = "yyyy-mm-dd";
   for (const key of ["totalPurchase", "totalPaid", "totalDue"]) {
      sheet.getColumn(key).numFmt = "#,##0.00";
   }
   sheet.getColumn("totalOrders").numFmt = "0";

   const buffer = await workbook.xlsx.writeBuffer();
   const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
   });
   downloadBlob(blob, `devx-customers-${fileStamp()}.xlsx`);
}
