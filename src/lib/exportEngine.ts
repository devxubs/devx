import ExcelJS from "exceljs";
import {
   Document,
   Packer,
   Paragraph,
   Table,
   TableRow,
   TableCell,
   TextRun,
   WidthType,
   AlignmentType,
   HeadingLevel,
   BorderStyle,
   ShadingType,
} from "docx";

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

export interface InvoiceExportData {
   invoiceNo: string;
   orderId?: string;
   date: string;
   dueDate?: string;
   paymentMethod?: string;
   status?: string;
   storeName: string;
   storeAddress?: string;
   storePhone?: string;
   storeEmail?: string;
   customerName?: string;
   customerPhone?: string;
   customerEmail?: string;
   customerAddress?: string;
   items: Array<{
      name: string;
      sku?: string;
      barcode?: string;
      quantity: number;
      price: number;
      subtotal: number;
   }>;
   subtotal: number;
   deliveryCharge?: number;
   discount?: number;
   tax?: number;
   total: number;
   paid?: number;
   due?: number;
   notes?: string;
   terms?: string;
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

/**
 * Triggers browser download for a Blob
 */
export function downloadBlob(blob: Blob, filename: string) {
   if (typeof window === "undefined") return;
   const url = window.URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = filename;
   document.body.appendChild(a);
   a.click();
   setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
   }, 1000);
}

// ============================================================================
// 1. EXCEL EXPORT (.xlsx)
// ============================================================================

export async function exportToExcel(options: {
   filename: string;
   title: string;
   subtitle?: string;
   metadata?: { label: string; value: string }[];
   companyInfo?: { name?: string; phone?: string; email?: string; address?: string; logoUrl?: string };
   columns: ExportColumn[];
   data: any[];
   summaryRows?: SummaryRowItem[];
   isInvoice?: boolean;
   invoiceData?: InvoiceExportData;
   headerStyle?: HeaderStyleOption;
   borderStyle?: BorderStyleOption;
   documentTheme?: DocumentThemeOption;
   includeCompany?: boolean;
   includeContact?: boolean;
   includeDate?: boolean;
   includeLogo?: boolean;
}): Promise<void> {
   const workbook = new ExcelJS.Workbook();
   workbook.creator = "DevX POS";
   workbook.lastModifiedBy = "DevX POS";
   workbook.created = new Date();
   workbook.modified = new Date();

   if (options.isInvoice && options.invoiceData) {
      const inv = options.invoiceData;
      const sheet = workbook.addWorksheet("Invoice", {
         views: [{ showGridLines: true }],
         pageSetup: { paperSize: 9, orientation: "portrait" }, // A4
      });

      // Header Banner
      sheet.mergeCells("A1:E1");
      const titleCell = sheet.getCell("A1");
      titleCell.value = inv.storeName || "DevX POS - Sales Invoice";
      titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.fill = {
         type: "pattern",
         pattern: "solid",
         fgColor: { argb: "FF1E293B" }, // dark slate
      };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      sheet.getRow(1).height = 36;

      // Subtitle / Contact Info
      sheet.mergeCells("A2:E2");
      const subCell = sheet.getCell("A2");
      subCell.value = `${inv.storeAddress || ""} | Tel: ${inv.storePhone || ""} | Email: ${inv.storeEmail || ""}`;
      subCell.font = { name: "Arial", size: 9, color: { argb: "FF64748B" } };
      subCell.alignment = { horizontal: "center" };
      sheet.getRow(2).height = 18;

      sheet.addRow([]); // Blank row

      // Invoice Details & Customer Info
      sheet.addRow(["Invoice No:", sanitizeCellValue(inv.invoiceNo), "", "Customer:", sanitizeCellValue(inv.customerName || "Walk-in")]);
      sheet.addRow(["Order ID:", sanitizeCellValue(inv.orderId || inv.invoiceNo), "", "Phone:", sanitizeCellValue(inv.customerPhone || "N/A")]);
      sheet.addRow(["Date:", inv.date, "", "Address:", sanitizeCellValue(inv.customerAddress || "N/A")]);
      sheet.addRow(["Payment Method:", sanitizeCellValue(inv.paymentMethod || "Cash"), "", "Status:", sanitizeCellValue(inv.status || "COMPLETED")]);

      for (let r = 4; r <= 7; r++) {
         sheet.getCell(`A${r}`).font = { bold: true, color: { argb: "FF475569" } };
         sheet.getCell(`D${r}`).font = { bold: true, color: { argb: "FF475569" } };
      }

      sheet.addRow([]); // Blank row

      // Table Header
      const headerRowIndex = 9;
      const headers = ["SL", "Item Description", "SKU", "Quantity", "Unit Price", "Subtotal"];
      const headerRow = sheet.addRow(headers);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
         cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
         cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF0F766E" }, // Teal accent
         };
         cell.alignment = { vertical: "middle", horizontal: "center" };
         cell.border = {
            top: { style: "thin", color: { argb: "FFCBD5E1" } },
            bottom: { style: "medium", color: { argb: "FFCBD5E1" } },
         };
      });

      // Table Items
      inv.items.forEach((item, index) => {
         const row = sheet.addRow([
            index + 1,
            sanitizeCellValue(item.name),
            sanitizeCellValue(item.sku || "-"),
            Number(item.quantity),
            Number(item.price),
            Number(item.subtotal),
         ]);
         row.getCell(1).alignment = { horizontal: "center" };
         row.getCell(4).alignment = { horizontal: "center" };
         row.getCell(5).numFmt = "৳ #,##0.00";
         row.getCell(6).numFmt = "৳ #,##0.00";
         row.eachCell((cell) => {
            cell.border = {
               bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            };
         });
      });

      sheet.addRow([]); // Blank row

      // Financial Summary
      const addSummaryRow = (label: string, value: number, isGrandTotal = false) => {
         const row = sheet.addRow(["", "", "", "", label, value]);
         const labelCell = row.getCell(5);
         const valCell = row.getCell(6);
         labelCell.font = { bold: true, size: isGrandTotal ? 12 : 10 };
         valCell.font = { bold: true, size: isGrandTotal ? 12 : 10, color: isGrandTotal ? { argb: "FF0F766E" } : undefined };
         valCell.numFmt = "৳ #,##0.00";
         if (isGrandTotal) {
            labelCell.border = { top: { style: "thin" }, bottom: { style: "double" } };
            valCell.border = { top: { style: "thin" }, bottom: { style: "double" } };
         }
      };

      addSummaryRow("Subtotal:", Number(inv.subtotal));
      if (inv.deliveryCharge) addSummaryRow("Delivery Charge:", Number(inv.deliveryCharge));
      if (inv.discount) addSummaryRow("Discount:", -Number(inv.discount));
      if (inv.tax) addSummaryRow("Tax / VAT:", Number(inv.tax));
      addSummaryRow("Grand Total:", Number(inv.total), true);
      if (inv.paid != null) addSummaryRow("Paid Amount:", Number(inv.paid));
      if (inv.due != null) addSummaryRow("Due Amount:", Number(inv.due));

      // Column Widths
      sheet.columns = [
         { width: 8 },  // SL
         { width: 34 }, // Item
         { width: 16 }, // SKU
         { width: 12 }, // Qty
         { width: 18 }, // Price
         { width: 20 }, // Total
      ];
   } else {
      // Tabular Dataset Export (Orders, Customers, Suppliers, Reports, Expenses, Assets, etc.)
      const sheet = workbook.addWorksheet(options.title.substring(0, 31) || "Data Export", {
         views: [{ showGridLines: true }],
      });

      let currentRow = 1;
      const isDarkDoc = options.documentTheme === "dark";

      if (options.companyInfo?.name && options.includeCompany !== false) {
         sheet.mergeCells(currentRow, 1, currentRow, options.columns.length);
         const compCell = sheet.getCell(currentRow, 1);
         compCell.value = options.companyInfo.name;
         compCell.font = { name: "Arial", size: 16, bold: true, color: { argb: isDarkDoc ? "FFFFFFFF" : "FF0F172A" } };
         compCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isDarkDoc ? "FF0F172A" : "FFF1F5F9" },
         };
         compCell.alignment = { vertical: "middle", horizontal: "center" };
         sheet.getRow(currentRow).height = 32;
         currentRow++;
      }

      // Title Banner
      sheet.mergeCells(currentRow, 1, currentRow, options.columns.length);
      const titleCell = sheet.getCell(currentRow, 1);
      titleCell.value = options.title;
      titleCell.font = { name: "Arial", size: 13, bold: true, color: { argb: isDarkDoc ? "FFFFFFFF" : "FF0F172A" } };
      titleCell.fill = {
         type: "pattern",
         pattern: "solid",
         fgColor: { argb: isDarkDoc ? "FF1E293B" : "FFFFFFFF" },
      };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      sheet.getRow(currentRow).height = 26;
      currentRow++;

      // Subtitle / Date range / Contact info
      const subtitleParts: string[] = [];
      if (options.subtitle) subtitleParts.push(options.subtitle);
      if (options.includeContact !== false) {
         if (options.companyInfo?.phone) subtitleParts.push(`Phone: ${options.companyInfo.phone}`);
         if (options.companyInfo?.email) subtitleParts.push(`Email: ${options.companyInfo.email}`);
         if (options.companyInfo?.address) subtitleParts.push(`Address: ${options.companyInfo.address}`);
      }
      if (options.includeDate !== false && !options.subtitle) {
         subtitleParts.push(`Exported: ${new Date().toLocaleDateString()}`);
      }
      const subtitleText = subtitleParts.filter(Boolean).join(" | ");

      if (subtitleText) {
         sheet.mergeCells(currentRow, 1, currentRow, options.columns.length);
         const subCell = sheet.getCell(currentRow, 1);
         subCell.value = subtitleText;
         subCell.font = { name: "Arial", size: 9, italic: true, color: { argb: isDarkDoc ? "FF94A3B8" : "FF64748B" } };
         subCell.alignment = { horizontal: "center" };
         sheet.getRow(currentRow).height = 18;
         currentRow++;
      }

      sheet.addRow([]); // Blank row

      // Header color determination
      const headerColors = resolveHeaderStyleColors(options.headerStyle);
      const headerArgb = headerColors.argb;
      const headerTextColor = headerColors.text === "#0F172A" ? "FF0F172A" : "FFFFFFFF";

      // Border style determination
      const isBorderless = options.borderStyle === "none" || options.borderStyle === "No Borders";
      const isAllBorders = options.borderStyle === "All Borders";
      const isOuterBorder = options.borderStyle === "Outer Border";
      const isMinimalBorders = options.borderStyle === "Minimal Borders";
      const borderTopStyle = isBorderless ? undefined : isAllBorders ? "thin" : "thin";
      const borderBottomStyle = isBorderless ? undefined : options.borderStyle === "medium" ? "medium" : "thin";

      // Column Header Row
      const headerRow = sheet.addRow(options.columns.map((c) => getColHeader(c)));
      headerRow.height = 22;
      headerRow.eachCell((cell, colIdx) => {
         cell.font = { bold: true, color: { argb: headerTextColor } };
         cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: headerArgb },
         };
         cell.alignment = { vertical: "middle", horizontal: "center" };
         if (!isBorderless) {
            if (isAllBorders) {
               cell.border = {
                  top: { style: "thin", color: { argb: "FFCBD5E1" } },
                  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
                  left: { style: "thin", color: { argb: "FFCBD5E1" } },
                  right: { style: "thin", color: { argb: "FFCBD5E1" } },
               };
            } else if (isOuterBorder) {
               cell.border = {
                  top: { style: "medium", color: { argb: "FF94A3B8" } },
                  bottom: { style: "thin", color: { argb: "FF94A3B8" } },
                  left: colIdx === 1 ? { style: "medium", color: { argb: "FF94A3B8" } } : undefined,
                  right: colIdx === options.columns.length ? { style: "medium", color: { argb: "FF94A3B8" } } : undefined,
               };
            } else {
               cell.border = {
                  top: { style: borderTopStyle as any, color: { argb: "FFCBD5E1" } },
                  bottom: { style: borderBottomStyle as any, color: { argb: "FFCBD5E1" } },
               };
            }
         }
      });

      // Data Rows
      const totalDataRows = options.data.length;
      options.data.forEach((item, rIdx) => {
         const rowData = options.columns.map((col) => {
            const rawVal = item[getColField(col)];
            if (col.format) {
               return sanitizeCellValue(col.format(rawVal, item));
            }
            if (col.type === "currency" || col.type === "number") {
               const n = Number(rawVal);
               return isNaN(n) ? 0 : n;
            }
            if (col.type === "date" && rawVal) {
               return new Date(rawVal).toLocaleDateString();
            }
            return sanitizeCellValue(rawVal ?? "-");
         });

         const row = sheet.addRow(rowData);
         options.columns.forEach((col, cIdx) => {
            const cell = row.getCell(cIdx + 1);
            if (col.type === "currency") {
               cell.numFmt = "৳ #,##0.00";
               cell.alignment = { horizontal: "right" };
            } else if (col.type === "number") {
               cell.numFmt = "#,##0";
               cell.alignment = { horizontal: "right" };
            } else if (col.type === "date") {
               cell.alignment = { horizontal: "center" };
            }

            if (!isBorderless) {
               const darkBorderColor = "FF334155";
               const lightBorderColor = "FFCBD5E1";
               const lightHorizBorder = options.borderStyle === "Minimal Borders" ? "FFF1F5F9" : "FFE2E8F0";
               const borderColor = options.documentTheme === "dark" ? darkBorderColor : lightBorderColor;
               const horizColor = options.documentTheme === "dark" ? darkBorderColor : lightHorizBorder;

               if (isAllBorders) {
                  cell.border = {
                     top: { style: "thin", color: { argb: borderColor } },
                     bottom: { style: "thin", color: { argb: borderColor } },
                     left: { style: "thin", color: { argb: borderColor } },
                     right: { style: "thin", color: { argb: borderColor } },
                  };
               } else if (isOuterBorder) {
                  const isLastRow = rIdx === totalDataRows - 1;
                  cell.border = {
                     left: cIdx === 0 ? { style: "medium", color: { argb: options.documentTheme === "dark" ? "FF475569" : "FF94A3B8" } } : undefined,
                     right: cIdx === options.columns.length - 1 ? { style: "medium", color: { argb: options.documentTheme === "dark" ? "FF475569" : "FF94A3B8" } } : undefined,
                     bottom: isLastRow ? { style: "medium", color: { argb: options.documentTheme === "dark" ? "FF475569" : "FF94A3B8" } } : undefined,
                  };
               } else if (isMinimalBorders) {
                  cell.border = {
                     bottom: { style: "thin", color: { argb: horizColor } },
                  };
               } else {
                  // Horizontal Lines / default
                  cell.border = {
                     bottom: { style: "thin", color: { argb: horizColor } },
                  };
               }
            }

            if (options.documentTheme === "dark") {
               cell.font = { ...cell.font, color: { argb: "FFF8FAFC" } };
               cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: rIdx % 2 === 1 ? "FF0F172A" : "FF1E293B" },
               };
            } else {
               cell.font = { ...cell.font, color: { argb: "FF0F172A" } };
               if (rIdx % 2 === 1) {
                  cell.fill = {
                     type: "pattern",
                     pattern: "solid",
                     fgColor: { argb: "FFF8FAFC" },
                  };
               }
            }
         });
      });

      // Optional Summary Rows (Total count, total sum, etc.)
      if (options.summaryRows && options.summaryRows.length > 0) {
         sheet.addRow([]); // Blank row
         options.summaryRows.forEach((s) => {
            const summaryData = new Array(options.columns.length).fill("");
            summaryData[options.columns.length - 2] = s.label;
            summaryData[options.columns.length - 1] = s.value;
            const row = sheet.addRow(summaryData);
            const labelCell = row.getCell(options.columns.length - 1);
            const valCell = row.getCell(options.columns.length);
            labelCell.font = { bold: true, color: { argb: isDarkDoc ? "FFF8FAFC" : "FF0F172A" } };
            valCell.font = { bold: true, color: s.isTotal ? { argb: isDarkDoc ? "FF38BDF8" : "FF0284C7" } : { argb: isDarkDoc ? "FFF8FAFC" : "FF0F172A" } };
            if (s.isTotal) {
               labelCell.border = { top: { style: "thin" }, bottom: { style: "double" } };
               valCell.border = { top: { style: "thin" }, bottom: { style: "double" } };
            }
         });
      }

      // Column Widths Calculation
      sheet.columns = options.columns.map((col) => {
         const h = getColHeader(col);
         const f = getColField(col);
         const maxLen = Math.max(
            h.length,
            ...options.data.slice(0, 100).map((d) => String(d[f] ?? "").length)
         );
         return {
            width: col.width ? col.width : Math.min(Math.max(maxLen + 4, 12), 40),
         };
      });
   }

   const buffer = await workbook.xlsx.writeBuffer();
   const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
   });
   downloadBlob(blob, options.filename.endsWith(".xlsx") ? options.filename : `${options.filename}.xlsx`);
}

// ============================================================================
// 2. WORD EXPORT (.docx)
// ============================================================================

export async function exportToWord(options: {
   filename: string;
   title: string;
   subtitle?: string;
   metadata?: { label: string; value: string }[];
   companyInfo?: { name?: string; phone?: string; email?: string; address?: string; logoUrl?: string };
   columns: ExportColumn[];
   data: any[];
   summaryRows?: SummaryRowItem[];
   isInvoice?: boolean;
   invoiceData?: InvoiceExportData;
   headerStyle?: HeaderStyleOption;
   borderStyle?: BorderStyleOption;
   documentTheme?: DocumentThemeOption;
   includeCompany?: boolean;
   includeContact?: boolean;
   includeDate?: boolean;
   includeLogo?: boolean;
}): Promise<void> {
   let docChildren: any[] = [];

   if (options.isInvoice && options.invoiceData) {
      const inv = options.invoiceData;

      // Invoice Document Header
      docChildren.push(
         new Paragraph({
            text: inv.storeName || "DevX POS",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
         }),
         new Paragraph({
            text: `${inv.storeAddress || ""} | Phone: ${inv.storePhone || ""} | Email: ${inv.storeEmail || ""}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
         }),
         new Paragraph({
            children: [
               new TextRun({
                  text: "SALES INVOICE & CASH MEMO",
                  bold: true,
                  size: 26,
                  color: "0F766E",
               }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
         })
      );

      // Metadata Table (Invoice Details on left, Customer on right)
      const metaTable = new Table({
         width: { size: 100, type: WidthType.PERCENTAGE },
         borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
         },
         rows: [
            new TableRow({
               children: [
                  new TableCell({
                     width: { size: 50, type: WidthType.PERCENTAGE },
                     children: [
                        new Paragraph({ children: [new TextRun({ text: "Invoice No: ", bold: true }), new TextRun(inv.invoiceNo)] }),
                        new Paragraph({ children: [new TextRun({ text: "Order ID: ", bold: true }), new TextRun(inv.orderId || inv.invoiceNo)] }),
                        new Paragraph({ children: [new TextRun({ text: "Date: ", bold: true }), new TextRun(inv.date)] }),
                        new Paragraph({ children: [new TextRun({ text: "Payment Method: ", bold: true }), new TextRun(inv.paymentMethod || "Cash")] }),
                     ],
                  }),
                  new TableCell({
                     width: { size: 50, type: WidthType.PERCENTAGE },
                     children: [
                        new Paragraph({ children: [new TextRun({ text: "Bill To: ", bold: true }), new TextRun(inv.customerName || "Walk-in Customer")] }),
                        new Paragraph({ children: [new TextRun({ text: "Phone: ", bold: true }), new TextRun(inv.customerPhone || "N/A")] }),
                        new Paragraph({ children: [new TextRun({ text: "Address: ", bold: true }), new TextRun(inv.customerAddress || "N/A")] }),
                        new Paragraph({ children: [new TextRun({ text: "Status: ", bold: true }), new TextRun(inv.status || "COMPLETED")] }),
                     ],
                  }),
               ],
            }),
         ],
      });

      docChildren.push(metaTable);
      docChildren.push(new Paragraph({ text: "", spacing: { after: 200 } }));

      // Itemized Products Table
      const itemRows: TableRow[] = [
         new TableRow({
            tableHeader: true,
            children: [
               new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: "0F766E" },
                  children: [new Paragraph({ children: [new TextRun({ text: "#", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })],
                  width: { size: 8, type: WidthType.PERCENTAGE },
               }),
               new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: "0F766E" },
                  children: [new Paragraph({ children: [new TextRun({ text: "Product Name", bold: true, color: "FFFFFF" })] })],
                  width: { size: 42, type: WidthType.PERCENTAGE },
               }),
               new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: "0F766E" },
                  children: [new Paragraph({ children: [new TextRun({ text: "SKU", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })],
                  width: { size: 16, type: WidthType.PERCENTAGE },
               }),
               new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: "0F766E" },
                  children: [new Paragraph({ children: [new TextRun({ text: "Qty", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })],
                  width: { size: 10, type: WidthType.PERCENTAGE },
               }),
               new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: "0F766E" },
                  children: [new Paragraph({ children: [new TextRun({ text: "Price", bold: true, color: "FFFFFF" })], alignment: AlignmentType.RIGHT })],
                  width: { size: 12, type: WidthType.PERCENTAGE },
               }),
               new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: "0F766E" },
                  children: [new Paragraph({ children: [new TextRun({ text: "Total", bold: true, color: "FFFFFF" })], alignment: AlignmentType.RIGHT })],
                  width: { size: 12, type: WidthType.PERCENTAGE },
               }),
            ],
         }),
      ];

      inv.items.forEach((item, idx) => {
         itemRows.push(
            new TableRow({
               children: [
                  new TableCell({ children: [new Paragraph({ text: String(idx + 1), alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph(item.name)] }),
                  new TableCell({ children: [new Paragraph({ text: item.sku || "-", alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: String(item.quantity), alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: `৳ ${Number(item.price).toFixed(2)}`, alignment: AlignmentType.RIGHT })] }),
                  new TableCell({ children: [new Paragraph({ text: `৳ ${Number(item.subtotal).toFixed(2)}`, alignment: AlignmentType.RIGHT })] }),
               ],
            })
         );
      });

      const itemsTable = new Table({
         width: { size: 100, type: WidthType.PERCENTAGE },
         rows: itemRows,
      });

      docChildren.push(itemsTable);
      docChildren.push(new Paragraph({ text: "", spacing: { after: 200 } }));

      // Financial Totals Table (right-aligned block)
      const totalsRows: TableRow[] = [
         new TableRow({
            children: [
               new TableCell({ width: { size: 65, type: WidthType.PERCENTAGE }, children: [new Paragraph("")] }),
               new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Subtotal:", bold: true })] })] }),
               new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: `৳ ${Number(inv.subtotal).toFixed(2)}`, alignment: AlignmentType.RIGHT })] }),
            ],
         }),
      ];

      if (inv.deliveryCharge) {
         totalsRows.push(
            new TableRow({
               children: [
                  new TableCell({ children: [new Paragraph("")] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Delivery Charge:", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: `৳ ${Number(inv.deliveryCharge).toFixed(2)}`, alignment: AlignmentType.RIGHT })] }),
               ],
            })
         );
      }

      if (inv.discount) {
         totalsRows.push(
            new TableRow({
               children: [
                  new TableCell({ children: [new Paragraph("")] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Discount:", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: `- ৳ ${Number(inv.discount).toFixed(2)}`, alignment: AlignmentType.RIGHT })] }),
               ],
            })
         );
      }

      totalsRows.push(
         new TableRow({
            children: [
               new TableCell({ children: [new Paragraph("")] }),
               new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Grand Total:", bold: true, size: 24, color: "0F766E" })] })] }),
               new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `৳ ${Number(inv.total).toFixed(2)}`, bold: true, size: 24, color: "0F766E" })], alignment: AlignmentType.RIGHT })] }),
            ],
         })
      );

      if (inv.paid != null) {
         totalsRows.push(
            new TableRow({
               children: [
                  new TableCell({ children: [new Paragraph("")] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Paid Amount:", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: `৳ ${Number(inv.paid).toFixed(2)}`, alignment: AlignmentType.RIGHT })] }),
               ],
            })
         );
      }

      if (inv.due != null) {
         totalsRows.push(
            new TableRow({
               children: [
                  new TableCell({ children: [new Paragraph("")] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Due Balance:", bold: true, color: "DC2626" })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `৳ ${Number(inv.due).toFixed(2)}`, bold: true, color: "DC2626" })], alignment: AlignmentType.RIGHT })] }),
               ],
            })
         );
      }

      const totalsTable = new Table({
         width: { size: 100, type: WidthType.PERCENTAGE },
         borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
         },
         rows: totalsRows,
      });

      docChildren.push(totalsTable);

      // Footer Notes, Terms & Signature Lines
      docChildren.push(
         new Paragraph({ text: "", spacing: { after: 300 } }),
         new Paragraph({
            children: [
               new TextRun({ text: "Terms & Conditions: ", bold: true }),
               new TextRun(inv.terms || "Goods once sold cannot be returned after 7 days. Please preserve this invoice for warranty and support claims."),
            ],
            spacing: { after: 150 },
         }),
         new Paragraph({
            text: inv.notes ? `Special Note: ${inv.notes}` : "Thank you for your business!",
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
         }),
         new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
               top: { style: BorderStyle.NONE },
               bottom: { style: BorderStyle.NONE },
               left: { style: BorderStyle.NONE },
               right: { style: BorderStyle.NONE },
               insideHorizontal: { style: BorderStyle.NONE },
               insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
               new TableRow({
                  children: [
                     new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                           new Paragraph({ text: "_______________________", alignment: AlignmentType.LEFT }),
                           new Paragraph({ children: [new TextRun({ text: "Prepared By / Cashier", bold: true })], alignment: AlignmentType.LEFT }),
                        ],
                     }),
                     new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                           new Paragraph({ text: "_______________________", alignment: AlignmentType.RIGHT }),
                           new Paragraph({ children: [new TextRun({ text: "Authorized Signature", bold: true })], alignment: AlignmentType.RIGHT }),
                        ],
                     }),
                  ],
               }),
            ],
         })
      );
   } else {
      // Tabular Reports / Entity Lists Export
      if (options.companyInfo?.name && options.includeCompany !== false) {
         docChildren.push(
            new Paragraph({
               text: options.companyInfo.name,
               heading: HeadingLevel.TITLE,
               alignment: AlignmentType.CENTER,
            })
         );
      }

      const wordContactParts: string[] = [];
      if (options.includeContact !== false) {
         if (options.companyInfo?.phone) wordContactParts.push(`Phone: ${options.companyInfo.phone}`);
         if (options.companyInfo?.email) wordContactParts.push(`Email: ${options.companyInfo.email}`);
         if (options.companyInfo?.address) wordContactParts.push(`Address: ${options.companyInfo.address}`);
      }
      if (wordContactParts.length > 0) {
         docChildren.push(
            new Paragraph({
               text: wordContactParts.join(" | "),
               alignment: AlignmentType.CENTER,
            })
         );
      }

      const isDarkWordDoc = options.documentTheme === "dark";
      const wordTitleTextColor = isDarkWordDoc ? "F8FAFC" : "0F172A";
      const wordMutedTextColor = isDarkWordDoc ? "94A3B8" : "64748B";

      docChildren.push(
         new Paragraph({
            children: [
               new TextRun({
                  text: options.title,
                  bold: true,
                  size: 28,
                  color: wordTitleTextColor,
               }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
         }),
         new Paragraph({
            children: [
               new TextRun({
                  text: options.subtitle || (options.includeDate !== false ? `Generated on ${new Date().toLocaleDateString()} by DevX POS` : ""),
                  color: wordMutedTextColor,
                  italics: true,
               }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
         })
      );

      // Header color determination for Word
      const wordColors = resolveHeaderStyleColors(options.headerStyle);
      const wordHeaderFill = wordColors.wordFill;
      const wordHeaderTextColor = wordColors.wordText;

      // Table Header Row
      const tableRows: TableRow[] = [
         new TableRow({
            tableHeader: true,
            children: options.columns.map((col) => {
               return new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: wordHeaderFill },
                  children: [
                     new Paragraph({
                        children: [new TextRun({ text: getColHeader(col), bold: true, color: wordHeaderTextColor })],
                        alignment: col.type === "currency" || col.type === "number" ? AlignmentType.RIGHT : AlignmentType.LEFT,
                     }),
                  ],
               });
            }),
         }),
      ];

      // Table Data Rows
      const wordDataTextColor = isDarkWordDoc ? "F8FAFC" : "0F172A";

      options.data.forEach((rowItem, rIdx) => {
         const cells = options.columns.map((col) => {
            let val = rowItem[getColField(col)];
            if (col.format) {
               val = col.format(val, rowItem);
            } else if (col.type === "currency") {
               val = `৳ ${Number(val || 0).toFixed(2)}`;
            } else if (col.type === "date" && val) {
               val = new Date(val).toLocaleDateString();
            } else if (val == null) {
               val = "-";
            } else {
               val = String(val);
            }

            const cellShading = isDarkWordDoc
               ? { type: ShadingType.CLEAR, fill: rIdx % 2 === 1 ? "0F172A" : "1E293B" }
               : rIdx % 2 === 1
                 ? { type: ShadingType.CLEAR, fill: "F8FAFC" }
                 : undefined;

            return new TableCell({
               shading: cellShading,
               children: [
                  new Paragraph({
                     children: [new TextRun({ text: val, color: wordDataTextColor })],
                     alignment: col.type === "currency" || col.type === "number" ? AlignmentType.RIGHT : AlignmentType.LEFT,
                  }),
               ],
            });
         });

         tableRows.push(new TableRow({ children: cells }));
      });

      // Summary Totals
      if (options.summaryRows && options.summaryRows.length > 0) {
         options.summaryRows.forEach((s) => {
            const summaryCells = options.columns.map((col, idx) => {
               if (idx === options.columns.length - 2) {
                  return new TableCell({
                     children: [new Paragraph({ children: [new TextRun({ text: s.label, bold: true, color: wordDataTextColor })], alignment: AlignmentType.RIGHT })],
                  });
               }
               if (idx === options.columns.length - 1) {
                  return new TableCell({
                     children: [new Paragraph({ children: [new TextRun({ text: String(s.value), bold: true, color: isDarkWordDoc ? "38BDF8" : "0284C7" })], alignment: AlignmentType.RIGHT })],
                  });
               }
               return new TableCell({ children: [new Paragraph("")] });
            });
            tableRows.push(new TableRow({ children: summaryCells }));
         });
      }

      const wordBorderColor = isDarkWordDoc ? "334155" : "E2E8F0";
      const wordStrongBorderColor = isDarkWordDoc ? "475569" : "CBD5E1";

      let wordTableBorders;
      if (options.borderStyle === "none" || options.borderStyle === "No Borders") {
         wordTableBorders = {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
         };
      } else if (options.borderStyle === "All Borders") {
         wordTableBorders = {
            top: { style: BorderStyle.SINGLE, size: 4, color: wordStrongBorderColor },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: wordStrongBorderColor },
            left: { style: BorderStyle.SINGLE, size: 4, color: wordStrongBorderColor },
            right: { style: BorderStyle.SINGLE, size: 4, color: wordStrongBorderColor },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: wordStrongBorderColor },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: wordStrongBorderColor },
         };
      } else if (options.borderStyle === "Outer Border") {
         wordTableBorders = {
            top: { style: BorderStyle.SINGLE, size: 6, color: wordStrongBorderColor },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: wordStrongBorderColor },
            left: { style: BorderStyle.SINGLE, size: 6, color: wordStrongBorderColor },
            right: { style: BorderStyle.SINGLE, size: 6, color: wordStrongBorderColor },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
         };
      } else if (options.borderStyle === "Minimal Borders") {
         wordTableBorders = {
            top: { style: BorderStyle.SINGLE, size: 4, color: wordBorderColor },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: wordBorderColor },
            insideHorizontal: { style: BorderStyle.DOTTED, size: 2, color: wordBorderColor },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
         };
      } else {
         // Horizontal Lines / default
         wordTableBorders = {
            top: { style: BorderStyle.SINGLE, size: 4, color: wordBorderColor },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: wordBorderColor },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: wordBorderColor },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
         };
      }

      docChildren.push(
         new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
            borders: wordTableBorders,
         })
      );
   }

   const doc = new Document({
      sections: [
         {
            properties: {
               page: {
                  margin: {
                     top: 720, // 0.5 inch
                     bottom: 720,
                     left: 720,
                     right: 720,
                  },
               },
            },
            children: docChildren,
         },
      ],
   });

   const blob = await Packer.toBlob(doc);
   downloadBlob(blob, options.filename.endsWith(".docx") ? options.filename : `${options.filename}.docx`);
}

// ============================================================================
// 3. CSV EXPORT (.csv)
// ============================================================================

export function exportToCsv(options: {
   filename: string;
   columns: ExportColumn[];
   data: any[];
}): void {
   const headers = options.columns.map((c) => `"${getColHeader(c).replace(/"/g, '""')}"`).join(",");
   const rows = options.data.map((item) => {
      return options.columns
         .map((col) => {
            let val = item[getColField(col)];
            if (col.format) {
               val = col.format(val, item);
            } else if (col.type === "currency") {
               val = Number(val || 0).toFixed(2);
            } else if (col.type === "date" && val) {
               val = new Date(val).toLocaleDateString();
            } else if (val == null) {
               val = "";
            } else {
               val = String(val);
            }

            // Prevent formula injection in CSV
            const sanitized = sanitizeCellValue(val);
            return `"${String(sanitized).replace(/"/g, '""')}"`;
         })
         .join(",");
   });

   // UTF-8 with BOM (\uFEFF) ensures Excel opens Bengali characters properly
   const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n");
   const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
   downloadBlob(blob, options.filename.endsWith(".csv") ? options.filename : `${options.filename}.csv`);
}
