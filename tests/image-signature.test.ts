import { describe, expect, it } from "vitest";

import { sniffImageType } from "@src/lib/imageSignature";

// Follow-up round: magic-byte verification for the uploads route.
// Each case builds just the leading bytes a real encoder emits —
// the sniffer must classify by content, never by name or MIME.

function bytes(...values: number[]): Uint8Array {
   return new Uint8Array(values);
}

function ascii(text: string): number[] {
   return Array.from(text, (c) => c.charCodeAt(0));
}

describe("sniffImageType", () => {
   it("recognises JPEG (FF D8 FF)", () => {
      expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10))).toBe(
         "image/jpeg",
      );
   });

   it("recognises PNG (8-byte signature)", () => {
      expect(
         sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00)),
      ).toBe("image/png");
   });

   it("recognises GIF87a and GIF89a", () => {
      expect(sniffImageType(bytes(...ascii("GIF87a")))).toBe("image/gif");
      expect(sniffImageType(bytes(...ascii("GIF89a")))).toBe("image/gif");
   });

   it("recognises WebP (RIFF + WEBP form type)", () => {
      expect(
         sniffImageType(
            bytes(...ascii("RIFF"), 0x24, 0x00, 0x00, 0x00, ...ascii("WEBP")),
         ),
      ).toBe("image/webp");
   });

   it("rejects a RIFF container that is not WebP (e.g. WAV)", () => {
      expect(
         sniffImageType(
            bytes(...ascii("RIFF"), 0x24, 0x00, 0x00, 0x00, ...ascii("WAVE")),
         ),
      ).toBeNull();
   });

   it("recognises AVIF (ftyp box with avif/avis brand)", () => {
      expect(
         sniffImageType(
            bytes(0x00, 0x00, 0x00, 0x18, ...ascii("ftyp"), ...ascii("avif")),
         ),
      ).toBe("image/avif");
      expect(
         sniffImageType(
            bytes(0x00, 0x00, 0x00, 0x18, ...ascii("ftyp"), ...ascii("avis")),
         ),
      ).toBe("image/avif");
   });

   it("rejects an ftyp box with a non-AVIF brand (e.g. mp4)", () => {
      expect(
         sniffImageType(
            bytes(0x00, 0x00, 0x00, 0x18, ...ascii("ftyp"), ...ascii("isom")),
         ),
      ).toBeNull();
   });

   it("returns null for non-image bytes and truncated inputs", () => {
      expect(sniffImageType(bytes(...ascii("MZ"), 0x90, 0x00))).toBeNull(); // EXE
      expect(sniffImageType(bytes(...ascii("hello world")))).toBeNull();
      expect(sniffImageType(bytes(0xff, 0xd8))).toBeNull(); // truncated JPEG
      expect(sniffImageType(bytes(0x89, 0x50, 0x4e))).toBeNull(); // truncated PNG
      expect(sniffImageType(new Uint8Array(0))).toBeNull();
   });
});
