import { ExportColumn } from "@src/lib/exportEngine";
import { NormalizedOrderRow, OrderFieldKey } from "../types/export.types";

export function sanitizeFileNameInput(rawName: string): string {
   return rawName.replace(/[/\\?%*:|"<>]/g, "_").trim();
}

export function getValidatedFileName(rawName: string, defaultName: string): string {
   const sanitized = sanitizeFileNameInput(rawName);
   return sanitized.length > 0 ? sanitized : defaultName;
}

export function formatOrderCellValue(
   row: NormalizedOrderRow,
   key: OrderFieldKey,
): string | number {
   const val = row[key];
   if (val === undefined || val === null) return "-";
   if (typeof val === "number") {
      if (
         key === "total" ||
         key === "paid" ||
         key === "due" ||
         key === "subtotal" ||
         key === "deliveryCharge" ||
         key === "discount" ||
         key === "tax" ||
         key === "unitPrice"
      ) {
         return `৳ ${val.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
         })}`;
      }
      return val;
   }
   return String(val);
}

export function formatOrderCsvCellValue(
   row: NormalizedOrderRow,
   key: OrderFieldKey,
): string {
   const val = row[key];
   if (val === undefined || val === null) return "";
   if (typeof val === "number") {
      if (
         key === "total" ||
         key === "paid" ||
         key === "due" ||
         key === "subtotal" ||
         key === "deliveryCharge" ||
         key === "discount" ||
         key === "tax" ||
         key === "unitPrice"
      ) {
         return val.toFixed(2);
      }
      return String(val);
   }
   return String(val);
}

export function generateRawOrderCsvString(
   columns: ExportColumn[],
   data: NormalizedOrderRow[],
): string {
   const headers = columns.map((col) => {
      const headerText = String(col.headerName || col.field || "");
      return `"${headerText.replace(/"/g, '""')}"`;
   });
   const rows = data.map((item) =>
      columns
         .map((col) => {
            const fieldName = col.field as OrderFieldKey;
            const val = fieldName ? formatOrderCsvCellValue(item, fieldName) : "";
            return `"${String(val).replace(/"/g, '""')}"`;
         })
         .join(","),
   );
   return [headers.join(","), ...rows].join("\r\n");
}
