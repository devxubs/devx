/**
 * Uploaded-file lifecycle (Phase 4, D8) — server-side only.
 *
 * POST /api/uploads stores NEW images on disk and hands back a
 * "/uploads/<file>" URL; records keep just the URL. Until now
 * nothing ever removed the file again: replacing a product image
 * or permanently deleting a product left the bytes on disk
 * forever (orphans). This module is the delete half of that
 * lifecycle, used by the product edit flow (image replaced /
 * removed) and the Recycle Bin permanent product delete.
 *
 * Safety rules:
 *  - Only URLs this app minted are touched: strings starting with
 *    "/uploads/" whose remainder is a single plain filename.
 *    Data-URLs, external URLs, and anything containing a path
 *    separator or ".." are ignored — legacy images keep working.
 *  - The resolved path is verified to stay inside UPLOAD_DIR
 *    (defence in depth on top of the filename check).
 *  - Deletion is best-effort: a missing file or an fs error is
 *    logged and swallowed — a cleanup failure must never fail the
 *    product save that triggered it.
 */
import { promises as fs } from "fs";
import path from "path";

/** The directory uploaded files live in (mirrors POST /api/uploads). */
export function uploadDirPath(): string {
   return (
      process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads")
   );
}

/**
 * Extract the on-disk filename from a stored image URL, or null
 * when the value is not one of this app's uploaded files (data-URL,
 * external URL, empty, or anything path-like). Pure.
 */
export function uploadedFileNameFromUrl(url: unknown): string | null {
   if (typeof url !== "string") return null;
   const prefix = "/uploads/";
   if (!url.startsWith(prefix)) return null;
   const name = url.slice(prefix.length);
   if (!name) return null;
   if (name.includes("/") || name.includes("\\") || name.includes("..")) {
      return null;
   }
   return name;
}

/**
 * Delete one uploaded file by its stored URL. Returns true when a
 * file was removed. Never throws.
 */
export async function deleteUploadedFile(url: unknown): Promise<boolean> {
   const name = uploadedFileNameFromUrl(url);
   if (!name) return false;
   const dir = uploadDirPath();
   const target = path.join(dir, name);
   if (!target.startsWith(dir + path.sep)) return false;
   try {
      await fs.unlink(target);
      return true;
   } catch (error: any) {
      if (error?.code !== "ENOENT") {
         console.error(`Failed to delete uploaded file ${name}:`, error);
      }
      return false;
   }
}

/** Delete several uploaded files (best-effort, sequential). */
export async function deleteUploadedFiles(
   urls: Iterable<unknown>,
): Promise<void> {
   for (const url of urls) {
      await deleteUploadedFile(url);
   }
}
