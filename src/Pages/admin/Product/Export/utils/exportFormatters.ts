import { ExportColumn, formatExportCellValue, getColField, sanitizeCellValue } from "@src/lib/exportEngine";
import { ExportFormat } from "../types/export.types";

/**
 * Removes characters not allowed in file names across common operating systems.
 */
export function sanitizeFileNameInput(input: string): string {
   return input.replace(/[/\\?%*:|"<>]/g, "-").trim();
}

/**
 * Returns validated filename ensuring appropriate single file extension.
 */
export function getValidatedFileName(
   rawName: string,
   format: ExportFormat,
   defaultPrefix = "devx-products",
): string {
   const todayStr = new Date().toISOString().split("T")[0];
   const cleaned = sanitizeFileNameInput(rawName) || `${defaultPrefix}-${todayStr}`;
   const stripped = cleaned.replace(/\.(xlsx|docx|csv)$/i, "");
   return `${stripped}.${format}`;
}

/**
 * Formats a cell value based on column definition.
 */
export function formatCellValue(col: ExportColumn, rawVal: any, row?: any): string {
   return formatExportCellValue(col, rawVal, row);
}

/**
 * Generates raw CSV text from columns and dataset with sanitization.
 */
export function generateRawCsvString(columns: ExportColumn[], data: any[]): string {
   const headers = columns.map((c) => `"${(c.headerName || c.header || getColField(c)).replace(/"/g, '""')}"`).join(",");
   const rows = data.map((item) => {
      return columns
         .map((col) => {
            const raw = item[getColField(col)];
            const val = formatExportCellValue(col, raw, item);
            const sanitized = sanitizeCellValue(val);
            return `"${String(sanitized).replace(/"/g, '""')}"`;
         })
         .join(",");
   });
   return [headers, ...rows].join("\n");
}
