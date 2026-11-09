import { useState, useCallback } from "react";
import { OrderNoteItem } from "../types";
import { extractOrderNotes } from "../helpers/extractOrderNotes";

export interface UseQuickEditNotesReturn {
   notes: OrderNoteItem[];
   setNotes: React.Dispatch<React.SetStateAction<OrderNoteItem[]>>;
   initNotes: (orderData: any) => void;
   handleAddNote: (newNoteData: {
      type: OrderNoteItem["type"];
      title: string;
      content: string;
      author?: string;
   }) => void;
   getLatestNoteByType: (type: OrderNoteItem["type"]) => string | undefined;
}

export const useQuickEditNotes = (
   initialOrder?: any,
): UseQuickEditNotesReturn => {
   const [notes, setNotes] = useState<OrderNoteItem[]>(() =>
      initialOrder ? extractOrderNotes(initialOrder) : [],
   );

   const initNotes = useCallback((orderData: any) => {
      if (!orderData) return;
      const extracted = extractOrderNotes(orderData);
      setNotes(extracted);
   }, []);

   const handleAddNote = useCallback(
      (newNoteData: {
         type: OrderNoteItem["type"];
         title: string;
         content: string;
         author?: string;
      }) => {
         const cleanContent = newNoteData.content.trim();
         if (!cleanContent) return;

         const newNote: OrderNoteItem = {
            id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type: newNoteData.type,
            title: newNoteData.title || "Order Note",
            content: cleanContent,
            author: newNoteData.author || "Staff",
            createdAt: new Date().toISOString(),
            isNew: true,
         };

         // Prepend to top of list so newest note is immediately prominent
         setNotes((prev) => [newNote, ...prev]);
      },
      [],
   );

   const getLatestNoteByType = useCallback(
      (type: OrderNoteItem["type"]): string | undefined => {
         const match = notes.find((n) => n.type === type);
         return match ? match.content : undefined;
      },
      [notes],
   );

   return {
      notes,
      setNotes,
      initNotes,
      handleAddNote,
      getLatestNoteByType,
   };
};
