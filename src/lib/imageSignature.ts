// Follow-up round: server-side image signature (magic-byte)
// verification for uploads. The multipart MIME type is supplied by
// the client and cannot be trusted on its own; this module sniffs
// the leading bytes of the actual buffer and reports the format
// they belong to, so the uploads route can reject a payload whose
// bytes do not match its declared type. Hand-rolled, no dependency.

export type SniffedImageType =
   | "image/jpeg"
   | "image/png"
   | "image/gif"
   | "image/webp"
   | "image/avif";

function startsWithBytes(
   bytes: Uint8Array,
   signature: number[],
   offset = 0,
): boolean {
   if (bytes.length < offset + signature.length) return false;
   return signature.every((b, i) => bytes[offset + i] === b);
}

function asciiAt(bytes: Uint8Array, text: string, offset: number): boolean {
   if (bytes.length < offset + text.length) return false;
   for (let i = 0; i < text.length; i += 1) {
      if (bytes[offset + i] !== text.charCodeAt(i)) return false;
   }
   return true;
}

export function sniffImageType(bytes: Uint8Array): SniffedImageType | null {
   // JPEG: FF D8 FF
   if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
   // PNG: 89 50 4E 47 0D 0A 1A 0A
   if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
      return "image/png";
   }
   // GIF: "GIF8" (the 87a and 89a variants share this prefix)
   if (asciiAt(bytes, "GIF8", 0)) return "image/gif";
   // WebP: RIFF container with the WEBP form type at bytes 8–11
   if (asciiAt(bytes, "RIFF", 0) && asciiAt(bytes, "WEBP", 8)) {
      return "image/webp";
   }
   // AVIF: ISO-BMFF "ftyp" box at bytes 4–7 with an avif/avis brand
   if (
      asciiAt(bytes, "ftyp", 4) &&
      (asciiAt(bytes, "avif", 8) || asciiAt(bytes, "avis", 8))
   ) {
      return "image/avif";
   }
   return null;
}
