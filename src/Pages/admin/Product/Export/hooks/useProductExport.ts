"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSettings } from "@src/lib/settingsContext";
import {
   exportToExcel,
   exportToWord,
   exportToCsv,
   HeaderStyleOption,
   BorderStyleOption,
} from "@src/lib/exportEngine";
import {
   ExportFormat,
   DocumentTheme,
   NormalizedProduct,
   ProductExportConfig,
   StoreInfo,
} from "../types/export.types";
import { PRODUCT_EXPORT_COLUMNS } from "../utils/exportConstants";
import { getValidatedFileName, sanitizeFileNameInput } from "../utils/exportFormatters";
import { normalizeProductData } from "../utils/exportHelpers";

export interface UseProductExportParams {
   open: boolean;
   onClose: () => void;
   selectedProducts: any[];
}

export function useProductExport({
   open,
   onClose,
   selectedProducts = [],
}: UseProductExportParams) {
   const { settings } = useSettings();
   const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

   // 1. Export Target & Format State
   const [format, setFormat] = useState<ExportFormat>("xlsx");
   const [fileName, setFileName] = useState<string>(`devx-products-${todayStr}`);

   // 2. ISOLATED Document Theme State (Light / Dark)
   // NOTE: Strictly isolated to document preview & file generation. Does NOT touch app theme.
   const [documentTheme, setDocumentTheme] = useState<DocumentTheme>("light");

   // 3. Document Content & Styling Options
   const [documentTitle, setDocumentTitle] = useState<string>(
      "DevX POS - Product & Stock Inventory",
   );
   const [headerStyle, setHeaderStyle] = useState<HeaderStyleOption>("Default");
   const [borderStyle, setBorderStyle] =
      useState<BorderStyleOption>("Horizontal Lines");

   // 4. Branding & Metadata Options
   const [includeLogo, setIncludeLogo] = useState<boolean>(true);
   const [includeCompanyName, setIncludeCompanyName] = useState<boolean>(true);
   const [includeContact, setIncludeContact] = useState<boolean>(true);
   const [includeDate, setIncludeDate] = useState<boolean>(true);

   // 5. CSV Preview sub-tab ('raw' | 'grid')
   const [csvPreviewTab, setCsvPreviewTab] = useState<"raw" | "grid">("raw");

   // 6. Action & Feedback Status
   const [isExporting, setIsExporting] = useState<boolean>(false);
   const [errorMsg, setErrorMsg] = useState<string | null>(null);
   const [successMsg, setSuccessMsg] = useState<string | null>(null);

   // Resolved store info from settings context
   const storeInfo: StoreInfo = useMemo(
      () => ({
         name: settings?.storeName || "DevX POS",
         phone: settings?.phone || "",
         email: settings?.email || "",
         address: settings?.address || "",
         logoUrl: settings?.logoUrl || "",
      }),
      [settings],
   );

   // Reset feedback & filename upon open
   useEffect(() => {
      if (open) {
         setErrorMsg(null);
         setSuccessMsg(null);
         setFileName(`devx-products-${new Date().toISOString().split("T")[0]}`);
      }
   }, [open, selectedProducts.length]);

   // Single source of truth: Normalized products
   const normalizedProducts: NormalizedProduct[] = useMemo(() => {
      return normalizeProductData(selectedProducts, todayStr);
   }, [selectedProducts, todayStr]);

   const totalUnitsInSelection = useMemo(() => {
      return normalizedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
   }, [normalizedProducts]);

   const previewSubset = useMemo(() => {
      return normalizedProducts.slice(0, 6);
   }, [normalizedProducts]);

   const remainingCount = Math.max(0, normalizedProducts.length - 6);

   const finalFileName = useMemo(() => {
      return getValidatedFileName(fileName, format);
   }, [fileName, format]);

   // Consolidated Shared Export Configuration
   const config: ProductExportConfig = useMemo(
      () => ({
         format,
         fileName: finalFileName,
         documentTheme,
         documentTitle,
         headerStyle,
         borderStyle,
         includeLogo,
         includeCompanyName,
         includeContact,
         includeDate,
         columns: PRODUCT_EXPORT_COLUMNS,
         storeInfo,
      }),
      [
         format,
         finalFileName,
         documentTheme,
         documentTitle,
         headerStyle,
         borderStyle,
         includeLogo,
         includeCompanyName,
         includeContact,
         includeDate,
         storeInfo,
      ],
   );

   const handleFileNameChange = useCallback((val: string) => {
      setFileName(sanitizeFileNameInput(val));
   }, []);

   const toggleDocumentTheme = useCallback(() => {
      setDocumentTheme((prev) => (prev === "light" ? "dark" : "light"));
   }, []);

   // Execute File Generation
   const handleExport = async () => {
      setErrorMsg(null);
      setSuccessMsg(null);

      if (!normalizedProducts || normalizedProducts.length === 0) {
         setErrorMsg(
            "No products currently selected. Please select at least one product to export.",
         );
         return;
      }

      setIsExporting(true);
      try {
         const exportDateStr = new Date().toLocaleString();
         const subtitle = includeDate
            ? `Exported on ${exportDateStr} | Scope: Selected Products (${normalizedProducts.length} items)`
            : `Scope: Selected Products (${normalizedProducts.length} items)`;

         const companyInfo = {
            name: includeCompanyName ? storeInfo.name : undefined,
            phone: includeContact ? storeInfo.phone : undefined,
            email: includeContact ? storeInfo.email : undefined,
            address: includeContact ? storeInfo.address : undefined,
            logoUrl: includeLogo ? storeInfo.logoUrl : undefined,
         };

         if (format === "xlsx") {
            await exportToExcel({
               filename: finalFileName,
               title: documentTitle || "Product Inventory",
               subtitle,
               columns: PRODUCT_EXPORT_COLUMNS,
               data: normalizedProducts,
               companyInfo,
               headerStyle,
               borderStyle,
               documentTheme,
               includeCompany: includeCompanyName,
               includeContact,
               includeDate,
               includeLogo,
               summaryRows: [
                  {
                     label: "Selected Products Count:",
                     value: String(normalizedProducts.length),
                  },
                  {
                     label: "Total Units in Selection:",
                     value: String(totalUnitsInSelection),
                     isTotal: true,
                  },
               ],
            });
         } else if (format === "docx") {
            await exportToWord({
               filename: finalFileName,
               title: documentTitle || "Product Inventory",
               subtitle,
               columns: PRODUCT_EXPORT_COLUMNS,
               data: normalizedProducts,
               companyInfo,
               headerStyle,
               borderStyle,
               documentTheme,
               includeCompany: includeCompanyName,
               includeContact,
               includeDate,
               includeLogo,
               summaryRows: [
                  {
                     label: "Selected Products Count:",
                     value: String(normalizedProducts.length),
                  },
                  {
                     label: "Total Units in Selection:",
                     value: String(totalUnitsInSelection),
                     isTotal: true,
                  },
               ],
            });
         } else if (format === "csv") {
            exportToCsv({
               filename: finalFileName,
               columns: PRODUCT_EXPORT_COLUMNS,
               data: normalizedProducts,
            });
         }

         setSuccessMsg(
            `Successfully exported ${normalizedProducts.length} product${
               normalizedProducts.length > 1 ? "s" : ""
            } to "${finalFileName}"!`,
         );
      } catch (err: any) {
         setErrorMsg(err.message || "Failed to generate export file.");
      } finally {
         setIsExporting(false);
      }
   };

   return {
      // Configuration & State
      format,
      setFormat,
      fileName,
      handleFileNameChange,
      finalFileName,
      documentTheme,
      setDocumentTheme,
      toggleDocumentTheme,
      documentTitle,
      setDocumentTitle,
      headerStyle,
      setHeaderStyle,
      borderStyle,
      setBorderStyle,
      includeLogo,
      setIncludeLogo,
      includeCompanyName,
      setIncludeCompanyName,
      includeContact,
      setIncludeContact,
      includeDate,
      setIncludeDate,
      csvPreviewTab,
      setCsvPreviewTab,

      // Data
      storeInfo,
      normalizedProducts,
      totalUnitsInSelection,
      previewSubset,
      remainingCount,
      config,

      // Status & Actions
      isExporting,
      errorMsg,
      successMsg,
      handleExport,
      onClose,
   };
}
