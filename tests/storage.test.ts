import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
   deleteFile,
   fileUrl,
   resolveStoredFilePath,
   saveFile,
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
