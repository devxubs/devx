import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
   deleteFile,
   fileUrl,
   readStoredFile,
   resolveStoredFilePath,
   saveFile,
   storedFileContentType,
   storedFileNameFromUrl,
} from "@src/lib/storage";

// Phase 5 (§5.5): the provider-neutral storage surface, exercised
// against its local-disk implementation in a disposable temp dir.

describe("storage local implementation", () => {
   let dir: string;
   const prev = process.env.UPLOAD_DIR;

   beforeEach(async () => {
      dir = await fs.mkdtemp(path.join(os.tmpdir(), "devx-storage-"));
      process.env.UPLOAD_DIR = dir;
   });

   afterEach(async () => {
      if (prev === undefined) delete process.env.UPLOAD_DIR;
      else process.env.UPLOAD_DIR = prev;
      await fs.rm(dir, { recursive: true, force: true });
   });

   it("saves bytes under a generated filename and returns the legacy URL", async () => {
      const stored = await saveFile(Buffer.from("image-bytes"), ".PNG");
      expect(stored.filename).toMatch(/^\d+-[a-f0-9]{12}\.png$/);
      expect(stored.url).toBe(fileUrl(stored.filename));
      expect(stored.url).toBe(`/uploads/${stored.filename}`);
      await expect(fs.readFile(stored.path, "utf8")).resolves.toBe(
         "image-bytes",
      );
   });

   it("rejects unsafe extensions instead of deriving a path from them", async () => {
      await expect(saveFile(Buffer.from("x"), "../png")).rejects.toThrow(
         /Invalid stored-file extension/,
      );
      await expect(saveFile(Buffer.from("x"), "png")).rejects.toThrow(
         /Invalid stored-file extension/,
      );
   });

   it("resolves only plain filenames inside the storage directory", () => {
      expect(resolveStoredFilePath("ok.png")).toBe(path.join(dir, "ok.png"));
      expect(resolveStoredFilePath("../secret")).toBeNull();
      expect(resolveStoredFilePath("sub/dir.png")).toBeNull();
      expect(resolveStoredFilePath("..\\secret")).toBeNull();
   });

   it("maps only the uploadable raster extensions to content types", () => {
      expect(storedFileContentType("a.png")).toBe("image/png");
      expect(storedFileContentType("a.JPG")).toBe("image/jpeg");
      expect(storedFileContentType("a.jpeg")).toBe("image/jpeg");
      expect(storedFileContentType("a.webp")).toBe("image/webp");
      expect(storedFileContentType("a.gif")).toBe("image/gif");
      expect(storedFileContentType("a.avif")).toBe("image/avif");
      // Never servable: scriptable / arbitrary / extensionless names.
      expect(storedFileContentType("a.svg")).toBeNull();
      expect(storedFileContentType("a.html")).toBeNull();
      expect(storedFileContentType("noext")).toBeNull();
      expect(storedFileContentType("")).toBeNull();
      expect(storedFileContentType(null)).toBeNull();
      expect(storedFileContentType(undefined)).toBeNull();
   });

   it("reads back a saved file with its content type (serving path)", async () => {
      // Regression coverage for the product-create upload bug: the
      // file POST /api/uploads writes must be readable through the
      // same storage surface the /uploads/[filename] route serves,
      // immediately — no server restart in between.
      const stored = await saveFile(Buffer.from("fresh-image"), ".jpg");
      const read = await readStoredFile(stored.filename);
      expect(read?.contentType).toBe("image/jpeg");
      expect(read?.buffer.toString()).toBe("fresh-image");
   });

   it("readStoredFile returns null for missing, foreign and traversal names", async () => {
      await expect(readStoredFile("missing.png")).resolves.toBeNull();
      await expect(readStoredFile("../secret.png")).resolves.toBeNull();
      await expect(readStoredFile("sub/dir.png")).resolves.toBeNull();
      await expect(readStoredFile("..\\secret.png")).resolves.toBeNull();
      await expect(readStoredFile("notes.txt")).resolves.toBeNull();
      await expect(readStoredFile("")).resolves.toBeNull();
      await expect(readStoredFile(null)).resolves.toBeNull();
   });

   it("deletes app-minted URLs and ignores foreign values", async () => {
      const stored = await saveFile(Buffer.from("bye"), ".webp");
      expect(storedFileNameFromUrl(stored.url)).toBe(stored.filename);
      await expect(deleteFile(stored.url)).resolves.toBe(true);
      await expect(fs.stat(stored.path)).rejects.toThrow();
      await expect(deleteFile("data:image/png;base64,AAAA")).resolves.toBe(
         false,
      );
      await expect(deleteFile("https://cdn.example.com/a.png")).resolves.toBe(
         false,
      );
      await expect(deleteFile("/uploads/../outside")).resolves.toBe(false);
   });
});
