import { z } from "zod";

export const unitSchema = z.object({
   name: z
      .string()
      .trim()
      .min(1, "Unit name is required!")
      .max(50, "Unit name must be under 50 characters"),
   short: z
      .string()
      .trim()
      .min(1, "Unit short name is required!")
      .max(20, "Unit short name must be under 20 characters"),
});

export type UnitFormValues = z.infer<typeof unitSchema>;

export interface UnitType {
   id: string;
   customId?: string | null;
   name: string;
   short: string;
   productCount?: number;
   isDeleted?: boolean;
   createdAt?: string | Date;
   updatedAt?: string | Date | null;
}
