import { useState, useMemo, useCallback } from "react";
import {
   ExportFormat,
   NormalizedOrderRow,
   OrderFieldKey,
} from "../types/export.types";
import {
   ALL_FIELD_KEYS,
   DEFAULT_SELECTED_FIELDS,
   ORDER_FIELD_GROUPS,
} from "../utils/exportConstants";
import {
   buildOrderExportColumns,
   buildOrderSummaryRows,
   normalizeOrderData,
} from "../utils/exportHelpers";
import { getValidatedFileName } from "../utils/exportFormatters";
import {
   exportToCsv,
   exportToExcel,
   exportToWord,
} from "@src/lib/exportEngine";
import { useSettings } from "@src/lib/settingsContext";

export function useOrderExport(selectedOrders: any[], onClose?: () => void) {
   const { settings } = useSettings();

   const [format, setFormat] = useState<ExportFormat>("excel");
   const defaultDateStr = new Date().toISOString().split("T")[0];
   const [fileName, setFileName] = useState<string>(
      `Orders_Export_${defaultDateStr}`,
   );
   const [documentTitle, setDocumentTitle] = useState<string>(
      "DevX POS - Orders Export",
   );
   const [selectedFields, setSelectedFields] = useState<Set<OrderFieldKey>>(
      new Set(DEFAULT_SELECTED_FIELDS),
   );
   const [isExporting, setIsExporting] = useState<boolean>(false);
   const [errorMessage, setErrorMessage] = useState<string | null>(null);

   const normalizedData: NormalizedOrderRow[] = useMemo(() => {
      return normalizeOrderData(selectedOrders);
   }, [selectedOrders]);

   const exportColumns = useMemo(() => {
      return buildOrderExportColumns(selectedFields);
   }, [selectedFields]);

   const summaryRows = useMemo(() => {
      return buildOrderSummaryRows(selectedFields, normalizedData);
   }, [selectedFields, normalizedData]);

   const storeInfo = useMemo(
      () => ({
         name: settings?.storeName || "DevX POS",
         address: settings?.address || "",
         phone: settings?.phone || "",
         email: settings?.email || "",
         logoUrl: settings?.logoUrl || "",
      }),
      [settings],
   );

   // Selection manipulation
   const toggleField = useCallback((key: OrderFieldKey) => {
      setSelectedFields((prev) => {
         const next = new Set(prev);
         if (next.has(key)) {
            // Prevent removing all fields
            if (next.size > 1) {
               next.delete(key);
            }
         } else {
            next.add(key);
         }
         return next;
      });
   }, []);

   const selectAllFields = useCallback(() => {
      setSelectedFields(new Set(ALL_FIELD_KEYS));
   }, []);

   const deselectAllFields = useCallback(() => {
      // Keep at least orderId selected
      setSelectedFields(new Set(["orderId" as OrderFieldKey]));
   }, []);

   const toggleGroup = useCallback((groupId: string, select: boolean) => {
      const group = ORDER_FIELD_GROUPS.find((g) => g.id === groupId);
      if (!group) return;

      setSelectedFields((prev) => {
         const next = new Set(prev);
         if (select) {
            group.fields.forEach((f) => next.add(f.key));
         } else {
            group.fields.forEach((f) => {
               if (next.size > 1) {
                  next.delete(f.key);
               }
            });
         }
         return next;
      });
   }, []);

   const isGroupAllSelected = useCallback(
      (groupId: string): boolean => {
         const group = ORDER_FIELD_GROUPS.find((g) => g.id === groupId);
         if (!group) return false;
         return group.fields.every((f) => selectedFields.has(f.key));
      },
      [selectedFields],
   );

   const isGroupIndeterminate = useCallback(
      (groupId: string): boolean => {
         const group = ORDER_FIELD_GROUPS.find((g) => g.id === groupId);
         if (!group) return false;
         const count = group.fields.filter((f) => selectedFields.has(f.key)).length;
         return count > 0 && count < group.fields.length;
      },
      [selectedFields],
   );

   const executeExport = useCallback(async () => {
      if (exportColumns.length === 0 || normalizedData.length === 0) {
         setErrorMessage("Please select at least one field and one order to export.");
         return;
      }

      setIsExporting(true);
      setErrorMessage(null);

      try {
         const validatedName = getValidatedFileName(
            fileName,
            `Orders_Export_${defaultDateStr}`,
         );

         // Map data rows containing only selected fields
         const exportData = normalizedData.map((row) => {
            const out: Record<string, any> = {};
            exportColumns.forEach((col) => {
               if (col.field) {
                  out[col.field] = (row as any)[col.field];
               }
            });
            return out;
         });

         const companyInfo = storeInfo;

         if (format === "excel") {
            await exportToExcel({
               filename: validatedName,
               title: documentTitle || "DevX POS - Orders Export",
               columns: exportColumns,
               data: exportData,
               summaryRows,
               companyInfo,
            });
         } else if (format === "csv") {
            exportToCsv({
               filename: validatedName,
               columns: exportColumns,
               data: exportData,
            });
         } else if (format === "word") {
            await exportToWord({
               filename: validatedName,
               title: documentTitle || "DevX POS - Orders Export",
               columns: exportColumns,
               data: exportData,
               summaryRows,
               companyInfo,
            });
         }

         onClose?.();
      } catch (err: any) {
         console.error("Export generation error:", err);
         setErrorMessage(err?.message || "Failed to generate export file");
      } finally {
         setIsExporting(false);
      }
   }, [
      exportColumns,
      normalizedData,
      fileName,
      documentTitle,
      format,
      summaryRows,
      settings,
      defaultDateStr,
      onClose,
   ]);

   return {
      format,
      setFormat,
      fileName,
      setFileName,
      documentTitle,
      setDocumentTitle,
      selectedFields,
      toggleField,
      selectAllFields,
      deselectAllFields,
      toggleGroup,
      isGroupAllSelected,
      isGroupIndeterminate,
      normalizedData,
      exportColumns,
      summaryRows,
      storeInfo,
      isExporting,
      errorMessage,
      executeExport,
   };
}
