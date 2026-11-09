import { useEffect, useState, useCallback, useRef } from "react";
import { ProductSchemaType } from "../types";

const DRAFT_STORAGE_KEY = "devx_product_create_draft_v1";

export function useProductDraft(
   isEdit: boolean,
   formData: Partial<ProductSchemaType>,
   isDirty: boolean,
   onRestore: (draft: Partial<ProductSchemaType>) => void,
) {
   const [hasSavedDraft, setHasSavedDraft] = useState(false);
   const [savedDraftTime, setSavedDraftTime] = useState<string | null>(null);
   const [draftRestored, setDraftRestored] = useState(false);
   const timeoutRef = useRef<NodeJS.Timeout | null>(null);

   // Check for draft on mount (only for new product creation, not editing)
   useEffect(() => {
      if (isEdit || typeof window === "undefined") return;

      try {
         const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
         if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.data && parsed.data.productName) {
               setHasSavedDraft(true);
               setSavedDraftTime(parsed.timestamp ? new Date(parsed.timestamp).toLocaleTimeString() : null);
            }
         }
      } catch {
         // silent
      }
   }, [isEdit]);

   // Debounced auto-save when form is dirty
   useEffect(() => {
      if (isEdit || !isDirty || typeof window === "undefined") return;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
         try {
            // Only save if productName has at least 1 character
            if (formData.productName?.trim()) {
               localStorage.setItem(
                  DRAFT_STORAGE_KEY,
                  JSON.stringify({
                     timestamp: new Date().toISOString(),
                     data: formData,
                  }),
               );
            }
         } catch {
            // localStorage quota or private mode
         }
      }, 1500);

      return () => {
         if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
   }, [formData, isDirty, isEdit]);

   const restoreDraft = useCallback(() => {
      if (typeof window === "undefined") return;
      try {
         const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
         if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.data) {
               onRestore(parsed.data);
               setDraftRestored(true);
               setHasSavedDraft(false);
            }
         }
      } catch {
         // silent
      }
   }, [onRestore]);

   const discardDraft = useCallback(() => {
      if (typeof window === "undefined") return;
      try {
         localStorage.removeItem(DRAFT_STORAGE_KEY);
         setHasSavedDraft(false);
      } catch {
         // silent
      }
   }, []);

   const clearDraftOnSubmit = useCallback(() => {
      if (typeof window === "undefined") return;
      try {
         localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
         // silent
      }
   }, []);

   return {
      hasSavedDraft,
      savedDraftTime,
      draftRestored,
      restoreDraft,
      discardDraft,
      clearDraftOnSubmit,
   };
}
