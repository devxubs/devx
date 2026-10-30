import {
   HeaderStyleOption,
   BorderStyleOption,
   resolveHeaderStyleColors,
} from "@src/lib/exportEngine";
import { DocumentTheme, NormalizedProduct } from "../types/export.types";

/**
 * Normalizes raw product items into consistent fields used by export generators and previews.
 */
export function normalizeProductData(
   rawProducts: any[] = [],
   fallbackDate?: string,
): NormalizedProduct[] {
   const todayStr = fallbackDate || new Date().toISOString().split("T")[0];

   return rawProducts.map((p) => {
      const cat = typeof p.category === "object" ? p.category?.name : p.category;
      const qty = Number(p.quantity ?? p.stock ?? 0);
      const prc = Number(p.salePrice || p.regularPrice || p.price || 0);
      const stVal =
         p.stockValue ||
         (qty === 0 ? "Out of Stock" : qty <= 10 ? "Low Stock" : "In Stock");

      return {
         ...p,
         customId: p.customId || p.productCode || p.id || "-",
         productName: p.productName || p.product || "-",
         category: cat || "General",
         productSku: p.productSku || "-",
         quantity: qty,
         stockValue: stVal,
         price: prc,
         date: p.createdAt || p.date || todayStr,
      };
   });
}

/**
 * Re-exports or wraps the header style colors from exportEngine.
 */
export function resolveHeaderColors(style?: HeaderStyleOption) {
   return resolveHeaderStyleColors(style);
}

/**
 * Resolves border styles specifically scoped to the isolated document theme.
 */
export function resolveBorderStyles(
   style: BorderStyleOption,
   docTheme: DocumentTheme,
) {
   const isDark = docTheme === "dark";
   const strongBorder = isDark ? "#475569" : "#CBD5E1";
   const lightBorder = isDark ? "#334155" : "#E2E8F0";
   const faintBorder = isDark ? "#1E293B" : "#F1F5F9";

   switch (style) {
      case "No Borders":
         return {
            tableBorder: "none",
            headerBorder: "none",
            cellBorder: "none",
         };
      case "All Borders":
         return {
            tableBorder: `1px solid ${strongBorder}`,
            headerBorder: `1px solid ${strongBorder}`,
            cellBorder: `1px solid ${strongBorder}`,
         };
      case "Outer Border":
         return {
            tableBorder: `2px solid ${isDark ? "#64748B" : "#94A3B8"}`,
            headerBorder: "none",
            cellBorder: "none",
         };
      case "Minimal Borders":
         return {
            tableBorder: "none",
            headerBorder: `1px solid ${lightBorder}`,
            cellBorder: `1px solid ${faintBorder}`,
         };
      case "Horizontal Lines":
      default:
         return {
            tableBorder: "none",
            headerBorder: `2px solid ${strongBorder}`,
            cellBorder: `1px solid ${lightBorder}`,
         };
   }
}

/**
 * Color and styling tokens strictly isolated for document previews (Excel & Word).
 * These must never touch the main application theme.
 */
export function getDocumentThemeStyles(docTheme: DocumentTheme) {
   const isDark = docTheme === "dark";

   return {
      isDark,
      // Excel specific
      excel: {
         outerBg: isDark ? "#111827" : "#F8FAFC",
         outerBorder: isDark ? "#1F2937" : "#E2E8F0",
         tableBg: isDark ? "#1F2937" : "#FFFFFF",
         textColor: isDark ? "#F8FAFC" : "#0F172A",
         coordinateBg: isDark ? "#111827" : "#F1F5F9",
         coordinateBorder: isDark ? "#374151" : "#CBD5E1",
         // Company banner row (Row 1)
         companyBg: isDark ? "#0F172A" : "#F1F5F9",
         companyColor: isDark ? "#FFFFFF" : "#0F172A",
         companyBorder: isDark ? "#1E293B" : "#E2E8F0",
         // Document title row (Row 2)
         titleBg: isDark ? "#1E293B" : "#FFFFFF",
         titleColor: isDark ? "#FFFFFF" : "#0F172A",
         titleBorder: isDark ? "#334155" : "#E2E8F0",
         // Subtitle row (Row 3)
         subtitleBg: isDark ? "#0F172A" : "#F8FAFC",
         subtitleColor: isDark ? "#94A3B8" : "#64748B",
         subtitleBorder: isDark ? "#374151" : "#E2E8F0",
         // Data rows
         zebraBg: isDark ? "#111827" : "#F8FAFC",
         summaryBorder: isDark ? "#374151" : "#CBD5E1",
         totalColor: isDark ? "#38BDF8" : "#0284C7",
         // Tab bar
         tabBarBg: isDark ? "#111827" : "#F1F5F9",
         tabBarBorder: isDark ? "#374151" : "#E2E8F0",
         tabPillBg: isDark ? "#1F2937" : "#FFFFFF",
         tabPillBorder: isDark ? "#374151" : "#CBD5E1",
      },
      // Word specific
      word: {
         outerBg: isDark ? "#0F172A" : "#F1F5F9",
         outerBorder: isDark ? "#1E293B" : "#E2E8F0",
         paperBg: isDark ? "#1E293B" : "#FFFFFF",
         textColor: isDark ? "#F8FAFC" : "#0F172A",
         secondaryTextColor: isDark ? "#94A3B8" : "#64748B",
         zebraBg: isDark ? "rgba(255, 255, 255, 0.03)" : "#F8FAFC",
         summaryBorder: isDark ? "#475569" : "#CBD5E1",
         totalColor: isDark ? "#38BDF8" : "#0284C7",
      },
   };
}
