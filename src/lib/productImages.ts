/**
 * Product `images[]` payload validation (P4-14, audit S-6).
 *
 * Product POST/PUT used to store the images array verbatim, so the
 * field bypassed the whole upload regime (magic bytes, 5 MB cap,
 * MIME allowlist) that POST /api/uploads enforces. The legacy
 * decision about EXISTING data (seeded/legacy rows carry base64
 * data-URLs and external URLs) is deliberately NOT made here, so
 * this validator only rejects what cannot be legitimate in any
 * existing data:
 *
 *  - non-string entries;
 *  - data-URLs that are not `data:image/(png|jpeg|webp|gif|avif)`
 *    with a base64 payload decoding to at most 5 MB (the uploads
 *    cap) — e.g. `data:text/html` payloads;
 *  - anything that is neither a data-URL, an app upload path
 *    (`/uploads/...`), nor an http(s) URL — e.g. `javascript:` URLs.
 *
 * `/uploads/...` paths and http(s) URLs pass unchanged, and valid
 * image data-URLs (the legacy storage form) keep working.
 *
 * Returns an error message for the first invalid entry, or null
 * when the array is acceptable. Pure — unit-tested.
 */

export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

const DATA_IMAGE_PATTERN =
   /^data:image\/(png|jpeg|webp|gif|avif);base64,([A-Za-z0-9+/=\s]+)$/;

export function validateProductImages(images: unknown): string | null {
   if (!Array.isArray(images)) {
      return "images must be an array of image URLs or data-URLs.";
   }
   for (let i = 0; i < images.length; i += 1) {
      const entry = images[i];
      if (typeof entry !== "string" || entry.length === 0) {
         return `images[${i}] must be a non-empty string.`;
      }
      if (entry.startsWith("data:")) {
         const match = DATA_IMAGE_PATTERN.exec(entry);
         if (!match) {
            return `images[${i}] is not an allowed image data-URL (allowed: png, jpeg, webp, gif, avif).`;
         }
         const base64 = match[2].replace(/\s/g, "");
         // Decoded size without decoding first: 3 bytes per 4 base64
         // chars, minus padding. Reject on the estimate so an
         // oversized payload is never materialised.
         const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
         const decodedBytes = Math.floor((base64.length * 3) / 4) - padding;
         if (decodedBytes > MAX_PRODUCT_IMAGE_BYTES) {
            return `images[${i}] exceeds the 5 MB image limit.`;
         }
         continue;
      }
      if (entry.startsWith("/uploads/")) continue;
      if (entry.startsWith("https://") || entry.startsWith("http://")) continue;
      return `images[${i}] must be an uploaded image path (/uploads/...), an http(s) URL, or an image data-URL.`;
   }
   return null;
}
