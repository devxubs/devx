import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
   uploadedFileNameFromUrl,
   deleteUploadedFile,
} from "@src/lib/uploadedFiles";

// Phase 4 (D8): orphan cleanup for uploaded images. Only URLs the
// app itself minted ("/uploads/<plain filename>") may ever map to
// a file deletion — data-URLs, external URLs and traversal
// attempts must be ignored.

describe("uploadedFileNameFromUrl", () => {
   it("accepts app-minted upload URLs", () => {
      expect(
         uploadedFileNameFromUrl("/uploads/1732100000000-abcdef012345.png"),
      ).toBe("1732100000000-abcdef012345.png");
   });

   it("rejects data-URLs and external URLs", () => {
      expect(
         uploadedFileNameFromUrl("data:image/png;base64,iVBORw0KGgo="),
      ).toBeNull();
      expect(
         uploadedFileNameFromUrl("https://cdn.example.com/img.png"),
      ).toBeNull();
      expect(uploadedFileNameFromUrl("/images/product-1.webp")).toBeNull();
   });

   it("rejects traversal and nested paths", () => {
      expect(uploadedFileNameFromUrl("/uploads/../.env")).toBeNull();
      expect(uploadedFileNameFromUrl("/uploads/sub/dir.png")).toBeNull();
      expect(uploadedFileNameFromUrl("/uploads/..\\secret")).toBeNull();
      expect(uploadedFileNameFromUrl("/uploads/")).toBeNull();
   });

   it("rejects non-strings", () => {
      expect(uploadedFileNameFromUrl(null)).toBeNull();
      expect(uploadedFileNameFromUrl(undefined)).toBeNull();
      expect(uploadedFileNameFromUrl(42)).toBeNull();
   });
});

describe("deleteUploadedFile (real fs, temp UPLOAD_DIR)", () => {
   let dir: string;
   const prev = process.env.UPLOAD_DIR;

   beforeEach(async () => {
      dir = await fs.mkdtemp(path.join(os.tmpdir(), "devx-uploads-"));
      process.env.UPLOAD_DIR = dir;
   });

   afterEach(async () => {
      if (prev === undefined) delete process.env.UPLOAD_DIR;
      else process.env.UPLOAD_DIR = prev;
      await fs.rm(dir, { recursive: true, force: true });
   });

   it("removes an existing uploaded file", async () => {
      const name = "1732100000000-abcdef012345.png";
      await fs.writeFile(path.join(dir, name), "fake-png");
      expect(await deleteUploadedFile(`/uploads/${name}`)).toBe(true);
      await expect(fs.stat(path.join(dir, name))).rejects.toThrow();
   });

   it("is a no-op for missing files and foreign URLs", async () => {
      expect(await deleteUploadedFile("/uploads/not-there.png")).toBe(false);
      expect(
         await deleteUploadedFile("data:image/png;base64,AAAA"),
      ).toBe(false);
      expect(await deleteUploadedFile("/uploads/../outside.txt")).toBe(false);
   });
});
