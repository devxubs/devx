import { describe, it, expect } from "vitest";
import {
   validateProductImages,
   MAX_PRODUCT_IMAGE_BYTES,
} from "@src/lib/productImages";
import { hideDeletedCategory } from "@src/lib/categoryVisibility";

// P4-14 (audit S-6): product images[] validation — legacy-safe rules
// only. Existing data forms (image data-URLs, /uploads/ paths,
// external http(s) URLs) must keep passing; only entries that
// cannot be legitimate anywhere are rejected.

describe("validateProductImages (P4-14)", () => {
   it("accepts an empty array and the legacy data forms", () => {
      expect(validateProductImages([])).toBeNull();
      expect(validateProductImages(["/uploads/abc-123.png"])).toBeNull();
      expect(validateProductImages(["https://example.com/img.jpg"])).toBeNull();
      expect(validateProductImages(["http://example.com/img.jpg"])).toBeNull();
      // A tiny valid PNG data-URL (1x1) — the legacy storage form.
      expect(
         validateProductImages([
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
         ]),
      ).toBeNull();
      expect(
         validateProductImages([
            "/uploads/a.webp",
            "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
            "https://cdn.example.com/b.gif",
         ]),
      ).toBeNull();
   });

   it("rejects non-array payloads and non-string / empty entries", () => {
      expect(validateProductImages("not-an-array")).not.toBeNull();
      expect(validateProductImages([42])).not.toBeNull();
      expect(validateProductImages([null])).not.toBeNull();
      expect(validateProductImages([""])).not.toBeNull();
      expect(validateProductImages([{ url: "/uploads/a.png" }])).not.toBeNull();
   });

   it("rejects non-image data-URLs and script-bearing schemes", () => {
      expect(
         validateProductImages(["data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="]),
      ).not.toBeNull();
      expect(validateProductImages(["data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="])).not.toBeNull();
      expect(validateProductImages(["javascript:alert(1)"])).not.toBeNull();
      expect(validateProductImages(["blob:https://example.com/123"])).not.toBeNull();
      expect(validateProductImages(["relative/path.png"])).not.toBeNull();
   });

   it("rejects image data-URLs decoding to more than 5 MB", () => {
      // Base64 length that decodes to just over the cap — rejected
      // from the length estimate, without materialising the payload.
      const oversizedChars = Math.ceil(((MAX_PRODUCT_IMAGE_BYTES + 3) * 4) / 3);
      const oversized = `data:image/png;base64,${"A".repeat(oversizedChars)}`;
      expect(validateProductImages([oversized])).not.toBeNull();
   });
});

describe("hideDeletedCategory (P4-12)", () => {
   it("presents a soft-deleted category as null and keeps live ones", () => {
      const live = { id: "p1", category: { id: "c1", name: "Food", isDeleted: false } };
      expect(hideDeletedCategory(live)).toBe(live);

      const binned = { id: "p2", category: { id: "c2", name: "Old", isDeleted: true } };
      const result = hideDeletedCategory(binned);
      expect(result.category).toBeNull();
      // The product row itself is untouched (no data change).
      expect(result.id).toBe("p2");
      expect(binned.category?.name).toBe("Old");

      const none = { id: "p3", category: null };
      expect(hideDeletedCategory(none)).toBe(none);
   });
});
