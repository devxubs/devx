/**
 * Export column definitions + the two trivial column helpers
 * (P4-3 split from lib/exportEngine).
 *
 * These types and helpers have NO dependencies, but they used to
 * live inside exportEngine.ts — which statically imports ExcelJS
 * and docx. Every consumer that needed only a column type or
 * `getColField` (the shared table filter, the print document that
 * the root theme provider mounts on every page, the export preview
 * components) therefore dragged the whole export engine into its
 * bundle. They now live here; exportEngine re-exports them, so
 * existing `from "@src/lib/exportEngine"` imports keep working
 * unchanged, while light consumers import from this module.
 */

export interface ExportColumn {
   field?: string;
   key?: string;
   headerName?: string;
   header?: string;
   type?: "string" | "number" | "currency" | "date" | "boolean";
   format?: (val: any, row?: any) => string;
   width?: number;
}

export const getColField = (col: ExportColumn): string => col.field || col.key || "";
export const getColHeader = (col: ExportColumn): string => col.headerName || col.header || getColField(col);

export interface SummaryRowItem {
   label: string;
   value: string | number;
   isTotal?: boolean;
}

// ── Style options + pure formatting helpers (moved from exportEngine, P4-3) ──

export type DocumentThemeOption = "light" | "dark";

export type HeaderStyleOption =
   | "Default"
   | "Modern"
   | "Minimal"
   | "Bold"
   | "Professional"
   | "Colored Header"
   | "blue"
   | "teal"
   | "slate"
   | "gray"
   | "primary";

export type BorderStyleOption =
   | "No Borders"
   | "Horizontal Lines"
   | "All Borders"
   | "Outer Border"
   | "Minimal Borders"
   | "thin"
   | "medium"
   | "none";

export function resolveHeaderStyleColors(style?: string) {
   switch (style) {
      case "Modern":
      case "teal":
         return { bg: "#0F766E", text: "#FFFFFF", argb: "FF0F766E", wordFill: "0F766E", wordText: "FFFFFF" };
      case "Minimal":
         return { bg: "#F1F5F9", text: "#0F172A", argb: "FFF1F5F9", wordFill: "F1F5F9", wordText: "0F172A" };
      case "Bold":
         return { bg: "#0F172A", text: "#FFFFFF", argb: "FF0F172A", wordFill: "0F172A", wordText: "FFFFFF" };
      case "Professional":
      case "slate":
         return { bg: "#1E293B", text: "#FFFFFF", argb: "FF1E293B", wordFill: "1E293B", wordText: "FFFFFF" };
      case "Colored Header":
         return { bg: "#4F46E5", text: "#FFFFFF", argb: "FF4F46E5", wordFill: "4F46E5", wordText: "FFFFFF" };
      case "gray":
         return { bg: "#475569", text: "#FFFFFF", argb: "FF475569", wordFill: "475569", wordText: "FFFFFF" };
      case "Default":
      case "blue":
      case "primary":
      default:
         return { bg: "#0284C7", text: "#FFFFFF", argb: "FF0284C7", wordFill: "0284C7", wordText: "FFFFFF" };
   }
}

export function formatExportCellValue(col: ExportColumn, rawVal: any, item?: any): string {
   if (col.format) {
      return col.format(rawVal, item);
   }
   if (col.type === "currency") {
      const n = Number(rawVal);
      return `৳ ${isNaN(n) ? "0.00" : n.toFixed(2)}`;
   }
   if (col.type === "number") {
      const n = Number(rawVal);
      return isNaN(n) ? "0" : n.toLocaleString();
   }
   if (col.type === "date" && rawVal) {
      return new Date(rawVal).toLocaleDateString();
   }
   return rawVal == null || rawVal === "" ? "-" : String(rawVal);
}

/**
 * Neutralizes potential spreadsheet formula injection (=, +, -, @)
 */
export function sanitizeCellValue(val: any): any {
   if (typeof val === "string") {
      const trimmed = val.trim();
      if (
         trimmed.startsWith("=") ||
         trimmed.startsWith("+") ||
         trimmed.startsWith("-") ||
         trimmed.startsWith("@")
      ) {
         return "'" + val;
      }
   }
   return val;
}

