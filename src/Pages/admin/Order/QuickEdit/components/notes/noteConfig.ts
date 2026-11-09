import { OrderNoteItem } from "../../types";

export type NoteTypeKey =
   | "customer"
   | "courier"
   | "packing"
   | "employee"
   | "instruction"
   | "general";

export interface NoteTypeConfig {
   type: NoteTypeKey;
   label: string;
   icon: string;
   color: "info" | "warning" | "secondary" | "primary" | "default";
   internal: boolean;
   badge: string;
   description: string;
   placeholder: string;
}

export const NOTE_TYPE_CONFIGS: Record<NoteTypeKey, NoteTypeConfig> = {
   customer: {
      type: "customer",
      label: "Customer Note",
      icon: "solar:user-bold",
      color: "info",
      internal: false,
      badge: "Customer",
      description: "Preferences or instructions provided by or visible to the customer",
      placeholder: "e.g. Call before delivery, customer requested evening delivery window...",
   },
   courier: {
      type: "courier",
      label: "Courier Note",
      icon: "solar:delivery-bold",
      color: "warning",
      internal: false,
      badge: "Courier",
      description: "Dispatch and delivery instructions for the courier partner",
      placeholder: "e.g. Fragile contents - handle with care, verify doorstep OTP...",
   },
   packing: {
      type: "packing",
      label: "Packing Note",
      icon: "solar:box-bold",
      color: "secondary",
      internal: false,
      badge: "Packing",
      description: "Warehouse packaging checklist and fulfillment instructions",
      placeholder: "e.g. Double bubble wrap, pack invoice in pouch, include stickers...",
   },
   employee: {
      type: "employee",
      label: "Employee Note",
      icon: "solar:shield-user-bold",
      color: "primary",
      internal: true,
      badge: "Internal Only",
      description: "Confidential internal staff notes (never shown on customer invoices)",
      placeholder: "e.g. Customer requested price adjustment, approved by store manager...",
   },
   instruction: {
      type: "instruction",
      label: "General Instruction",
      icon: "solar:document-text-bold",
      color: "default",
      internal: false,
      badge: "Instruction",
      description: "General operational notes or processing instructions",
      placeholder: "e.g. Awaiting bank transfer confirmation before shipping...",
   },
   general: {
      type: "general",
      label: "General Note",
      icon: "solar:notes-bold",
      color: "default",
      internal: false,
      badge: "General",
      description: "Standard order notes",
      placeholder: "e.g. General note about this order...",
   },
};

export const NOTE_TYPE_OPTIONS: NoteTypeConfig[] = [
   NOTE_TYPE_CONFIGS.customer,
   NOTE_TYPE_CONFIGS.courier,
   NOTE_TYPE_CONFIGS.packing,
   NOTE_TYPE_CONFIGS.employee,
   NOTE_TYPE_CONFIGS.instruction,
];

export const getNoteTypeConfig = (type?: string): NoteTypeConfig => {
   if (!type) return NOTE_TYPE_CONFIGS.general;
   const key = String(type).toLowerCase() as NoteTypeKey;
   return NOTE_TYPE_CONFIGS[key] || NOTE_TYPE_CONFIGS.general;
};

export interface NoteTimestamp {
   relative: string;
   full: string;
}

export const formatNoteTimestamp = (isoStr?: string): NoteTimestamp => {
   if (!isoStr) {
      return { relative: "Just now", full: "Recently created" };
   }

   try {
      const date = new Date(isoStr);
      if (isNaN(date.getTime())) {
         return { relative: isoStr, full: isoStr };
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let relative = "";
      if (diffSecs < 45) {
         relative = "Just now";
      } else if (diffMins < 60) {
         relative = `${diffMins}m ago`;
      } else if (diffHours < 24) {
         relative = `${diffHours}h ago`;
      } else if (diffDays === 1) {
         relative = "Yesterday";
      } else if (diffDays < 7) {
         relative = `${diffDays}d ago`;
      } else {
         relative = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
         });
      }

      const full = date.toLocaleString("en-US", {
         month: "short",
         day: "numeric",
         year: "numeric",
         hour: "numeric",
         minute: "2-digit",
         hour12: true,
      });

      return { relative, full };
   } catch {
      return { relative: isoStr, full: isoStr };
   }
};
