/**
 * Uploaded-file lifecycle compatibility layer (Phase 4, D8).
 *
 * The implementation now lives in the provider-neutral storage
 * module (Phase 5, §5.5). These names remain for the product-edit
 * and Bin callers that adopted them in D8; their behaviour is
 * unchanged: only app-minted "/uploads/<plain filename>" URLs are
 * deleted, foreign/data/external URLs are ignored, and deletion is
 * best-effort.
 */
import {
   deleteFile,
   deleteFiles,
   storageDirPath,
   storedFileNameFromUrl,
} from "./storage";

/** The directory uploaded files live in (mirrors POST /api/uploads). */
export function uploadDirPath(): string {
   return storageDirPath();
}

/** Extract the on-disk filename from a stored image URL, or null. */
export function uploadedFileNameFromUrl(url: unknown): string | null {
   return storedFileNameFromUrl(url);
}

/** Delete one uploaded file by its stored URL. Never throws. */
export async function deleteUploadedFile(url: unknown): Promise<boolean> {
   return deleteFile(url);
}

/** Delete several uploaded files (best-effort, sequential). */
export async function deleteUploadedFiles(
   urls: Iterable<unknown>,
): Promise<void> {
   return deleteFiles(urls);
}
