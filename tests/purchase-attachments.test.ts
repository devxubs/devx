import { describe, it, expect } from "vitest";
import {
   normalizePurchaseAttachments,
   reconcilePurchaseAttachments,
} from "@src/lib/purchaseAttachments";

// B2-2 (audit C-8 / P1-6): purchase attachments are validated
// against the PurchaseAttachment model's fields and reconciled as
// a replace-set on PUT (identity = stored file URL).
describe("normalizePurchaseAttachments", () => {
   it("keeps well-formed descriptors and coerces size to a whole number", () => {
      expect(
         normalizePurchaseAttachments([
            { name: "invoice.pdf", url: "/uploads/a.pdf", type: "application/pdf", size: 1024.7 },
            { name: "photo.png", url: "/uploads/b.png" },
         ]),
      ).toEqual([
         { name: "invoice.pdf", url: "/uploads/a.pdf", type: "application/pdf", size: 1024 },
         { name: "photo.png", url: "/uploads/b.png", type: null, size: null },
      ]);
   });

   it("drops entries without a name or URL, non-objects, and duplicate URLs", () => {
      expect(
         normalizePurchaseAttachments([
            { name: "", url: "/uploads/a.pdf" },
            { name: "x.pdf", url: "  " },
            { url: "/uploads/a.pdf" },
            "not-an-object",
            null,
            { name: "a.pdf", url: "/uploads/a.pdf" },
            { name: "a-again.pdf", url: "/uploads/a.pdf" },
         ]),
      ).toEqual([{ name: "a.pdf", url: "/uploads/a.pdf", type: null, size: null }]);
   });

   it("treats a missing or non-array payload as an empty set", () => {
      expect(normalizePurchaseAttachments(undefined)).toEqual([]);
      expect(normalizePurchaseAttachments(null)).toEqual([]);
      expect(normalizePurchaseAttachments({ name: "x", url: "/u" })).toEqual([]);
   });

   it("rejects a negative size but keeps the attachment", () => {
      expect(
         normalizePurchaseAttachments([
            { name: "a.pdf", url: "/uploads/a.pdf", size: -3 },
         ]),
      ).toEqual([{ name: "a.pdf", url: "/uploads/a.pdf", type: null, size: null }]);
   });
});

describe("reconcilePurchaseAttachments", () => {
   const stored = [
      { id: "att1", name: "old.pdf", url: "/uploads/old.pdf" },
      { id: "att2", name: "keep.png", url: "/uploads/keep.png" },
   ];
   const norm = (list: any[]) => normalizePurchaseAttachments(list);

   it("empty payload against empty storage creates and deletes nothing", () => {
      expect(reconcilePurchaseAttachments([], [])).toEqual({
         toCreate: [],
         toDeleteIds: [],
         keptIds: [],
      });
   });

   it("new payload entries are created; stored rows missing from the payload are deleted", () => {
      const result = reconcilePurchaseAttachments(
         stored,
         norm([
            { name: "keep.png", url: "/uploads/keep.png" },
            { name: "new.pdf", url: "/uploads/new.pdf", type: "application/pdf", size: 10 },
         ]),
      );
      expect(result.toCreate).toEqual([
         { name: "new.pdf", url: "/uploads/new.pdf", type: "application/pdf", size: 10 },
      ]);
      expect(result.toDeleteIds).toEqual(["att1"]);
      expect(result.keptIds).toEqual(["att2"]);
   });

   it("resending the identical set is a no-op (note-only edit keeps attachments)", () => {
      const result = reconcilePurchaseAttachments(
         stored,
         norm([
            { name: "old.pdf", url: "/uploads/old.pdf" },
            { name: "keep.png", url: "/uploads/keep.png" },
         ]),
      );
      expect(result.toCreate).toEqual([]);
      expect(result.toDeleteIds).toEqual([]);
      expect(result.keptIds).toEqual(["att1", "att2"]);
   });

   it("an explicitly empty payload clears the set", () => {
      const result = reconcilePurchaseAttachments(stored, []);
      expect(result.toCreate).toEqual([]);
      expect(result.toDeleteIds).toEqual(["att1", "att2"]);
      expect(result.keptIds).toEqual([]);
   });
});
