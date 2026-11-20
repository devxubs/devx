/**
 * Role-editor permission mapping (audit C-3 / P0-3).
 *
 * The editor's checkbox state is a catalogue of categories, each
 * holding named permissions. Saving serializes every ticked box to
 * one flat key — `"<category>_<permission>"`, lower-cased, spaces
 * → "_" — which is the UI-saved shape `src/lib/auth.ts` enforces.
 *
 * Stored roles, however, arrive in three shapes (see the RBAC note
 * in `src/lib/auth.ts`):
 *   - seed flat map:  { all: true, orders: true, products: true }
 *   - UI-saved map:   { user_view_user: true, user_create: true }
 *   - array form:     [{ name: "orders", allow: true }, "reports"]
 *
 * `storedToEditorState` hydrates the checkboxes from ANY of those
 * shapes. Keys that name a catalogue checkbox tick it; every other
 * granted key (seed broad grants like `all` / `orders`, legacy or
 * hand-written keys like the seeded Cashier's `orders_read`) has no
 * checkbox and is carried through as `extraPermissions`, so
 * `editorStateToStored` re-emits it verbatim. Open → edit → save
 * with no changes therefore persists byte-identical EFFECTIVE
 * permissions (the same set of granted keys `normalizePermissions`
 * computes server-side) instead of wiping everything the editor
 * did not re-tick — the original C-3 data loss.
 */

export interface EditorPermission {
   id: number;
   name: string;
   allow: boolean;
}

export interface EditorCategory {
   id: number;
   name: string;
   permissions: EditorPermission[];
}

/** The flat storage key one catalogue checkbox serializes to. */
export function permissionKey(
   categoryName: string,
   permissionName: string,
): string {
   return `${categoryName}_${permissionName}`
      .toLowerCase()
      .replace(/\s+/g, "_");
}

function normalizeKey(key: string): string {
   return key.trim().toLowerCase().replace(/\s+/g, "_");
}

/**
 * Normalize any stored permission payload to a flat key → boolean
 * map. Mirrors `normalizePermissions` in `src/lib/auth.ts` rule for
 * rule (the server enforcer) — duplicated here because the editor
 * is a client component and cannot import the server auth module.
 * Keep the two in step.
 */
export function normalizeStoredPermissions(
   raw: unknown,
): Record<string, boolean> {
   const out: Record<string, boolean> = {};
   if (!raw) return out;

   if (Array.isArray(raw)) {
      for (const entry of raw as any[]) {
         if (entry && typeof entry === "object") {
            const key = normalizeKey(
               String(entry.key || entry.name || ""),
            );
            if (key) {
               out[key] = entry.allow !== false && entry.value !== false;
            }
         } else if (typeof entry === "string") {
            out[normalizeKey(entry)] = true;
         }
      }
      return out;
   }

   if (typeof raw === "object") {
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
         out[normalizeKey(k)] = v === true || v === "true";
      }
   }
   return out;
}

export interface EditorState {
   categories: EditorCategory[];
   /** Granted keys with no catalogue checkbox, preserved verbatim. */
   extraPermissions: Record<string, boolean>;
}

/**
 * Hydrate checkbox state from a stored role payload. The catalogue
 * is deep-copied (never mutated) with `allow` set from the stored
 * payload; granted keys the catalogue cannot represent are
 * returned as `extraPermissions`.
 */
export function storedToEditorState(
   raw: unknown,
   catalogue: EditorCategory[],
): EditorState {
   const stored = normalizeStoredPermissions(raw);
   const represented = new Set<string>();

   const categories = catalogue.map((category) => ({
      ...category,
      permissions: category.permissions.map((permission) => {
         const key = permissionKey(category.name, permission.name);
         represented.add(key);
         return { ...permission, allow: stored[key] === true };
      }),
   }));

   const extraPermissions: Record<string, boolean> = {};
   for (const [key, granted] of Object.entries(stored)) {
      if (granted && !represented.has(key)) {
         extraPermissions[key] = true;
      }
   }

   return { categories, extraPermissions };
}

/**
 * Serialize checkbox state back to the stored flat map: every
 * ticked box under its catalogue key, plus the preserved
 * `extraPermissions` the editor cannot display. Only granted keys
 * are written — the same shape the editor has always saved.
 */
export function editorStateToStored(
   categories: EditorCategory[],
   extraPermissions: Record<string, boolean> = {},
): Record<string, boolean> {
   const out: Record<string, boolean> = {};
   for (const [key, granted] of Object.entries(extraPermissions)) {
      if (granted) out[normalizeKey(key)] = true;
   }
   for (const category of categories) {
      for (const permission of category.permissions) {
         if (permission.allow) {
            out[permissionKey(category.name, permission.name)] = true;
         }
      }
   }
   return out;
}
