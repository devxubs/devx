/**
 * Warehouse payload normalization (P2-1) — pure helpers for the
 * warehouses API, extracted so the validation rules are hermetically
 * testable. The Warehouse model fields are: name (required, unique),
 * code (unique, nullable), address, phone, isDefault.
 */

export interface WarehouseUpdateData {
   name?: string;
   code?: string | null;
   address?: string | null;
   phone?: string | null;
   isDefault?: boolean;
}

export type NormalizeWarehouseUpdateResult =
   | { ok: true; data: WarehouseUpdateData }
   | { ok: false; error: string };

/**
 * Normalize a PUT body into update data. Only keys PRESENT in the
 * body are touched (partial update). A present-but-blank name is a
 * 400; blank code/address/phone clear the field to null (the POST
 * create path's code→customId fallback applies to creation only).
 */
export function normalizeWarehouseUpdate(
   body: Record<string, unknown>,
): NormalizeWarehouseUpdateResult {
   const data: WarehouseUpdateData = {};

   if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
         return { ok: false, error: "Warehouse name cannot be empty" };
      }
      data.name = body.name.trim();
   }
   if (body.code !== undefined) {
      data.code =
         typeof body.code === "string" && body.code.trim()
            ? body.code.trim()
            : null;
   }
   if (body.address !== undefined) {
      data.address =
         typeof body.address === "string" && body.address.trim()
            ? body.address.trim()
            : null;
   }
   if (body.phone !== undefined) {
      data.phone =
         typeof body.phone === "string" && body.phone.trim()
            ? body.phone.trim()
            : null;
   }
   if (body.isDefault !== undefined) {
      data.isDefault = Boolean(body.isDefault);
   }

   return { ok: true, data };
}
