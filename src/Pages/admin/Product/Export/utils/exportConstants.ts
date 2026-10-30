import { ExportColumn, HeaderStyleOption, BorderStyleOption } from "@src/lib/exportEngine";
import { FormatOptionItem } from "../types/export.types";

export const PRODUCT_EXPORT_COLUMNS: ExportColumn[] = [
   { field: "customId", headerName: "ID", width: 14 },
   { field: "productName", headerName: "Product Name", width: 28 },
   { field: "category", headerName: "Category", width: 18 },
   { field: "productSku", headerName: "SKU", width: 16 },
   { field: "quantity", headerName: "Stock Qty", type: "number", width: 14 },
   { field: "stockValue", headerName: "Stock Status", width: 15 },
   { field: "price", headerName: "Price", type: "currency", width: 16 },
   { field: "date", headerName: "Created Date", type: "date", width: 16 },
];

export const HEADER_STYLE_OPTIONS: HeaderStyleOption[] = [
   "Default",
   "Modern",
   "Minimal",
   "Bold",
   "Professional",
   "Colored Header",
];

export const BORDER_STYLE_OPTIONS: BorderStyleOption[] = [
   "Horizontal Lines",
   "All Borders",
   "Outer Border",
   "Minimal Borders",
   "No Borders",
];

export const FORMAT_OPTIONS: FormatOptionItem[] = [
   {
      key: "xlsx",
      label: "Excel (.xlsx)",
      ext: ".xlsx",
      icon: "vscode-icons:file-type-excel",
      desc: "Full spreadsheet with formatted columns, styling, and numerical data.",
   },
   {
      key: "docx",
      label: "Word (.docx)",
      ext: ".docx",
      icon: "vscode-icons:file-type-word",
      desc: "Professional printable document with headers, tables, and company details.",
   },
   {
      key: "csv",
      label: "CSV (.csv)",
      ext: ".csv",
      icon: "solar:document-text-bold",
      desc: "Standard comma-delimited plain tabular data for raw data transfer.",
   },
];
