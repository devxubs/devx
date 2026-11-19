import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { requirePermission } from "@src/lib/auth";

// Phase 5, §5.3 (IMG-01): real file storage for NEW uploads.
//
// Until now product images lived inside the database — the product
// form stored `blob:` object URLs (dead after the browser session)
// and seeded/legacy data carries base64 data-URLs. New uploads now
// go through this route: the file is validated and written to disk,
// and only its URL ("/uploads/<file>") is stored on the record.
// Existing data-URL images are untouched and keep rendering.
//
// Storage: UPLOAD_DIR env var, default <project>/public/uploads —
// files under public/ are served by Next.js at /uploads/<file>.
// If UPLOAD_DIR points elsewhere, that directory must be exposed at
// /uploads/ by the web server / reverse proxy.
//
// HONEST LIMITATION: local disk is NOT persistent on serverless or
// ephemeral hosts (e.g. Vercel) — uploads would vanish between
// deployments/instances. A production multi-instance deployment
// needs object storage (S3 / Cloudinary / R2); that step needs
// provider credentials and is intentionally NOT implemented here.
//
// Validation: raster image types only (SVG is excluded on purpose —
// an uploaded SVG can carry script and would be served same-origin),
// extension derived from the validated MIME type (never from the
// client-supplied filename), 5 MB cap matching the product form's
// stated limit, random filename (no user input in the path).

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
   "image/png": ".png",
   "image/jpeg": ".jpg",
   "image/webp": ".webp",
   "image/gif": ".gif",
   "image/avif": ".avif",
};

export async function POST(request: NextRequest) {
   const gate = await requirePermission(request, [
      "products",
      "product",
      "product_create",
   ]);
   if (gate instanceof NextResponse) return gate;

   let formData: FormData;
   try {
      formData = await request.formData();
   } catch {
      return NextResponse.json(
         { error: "Expected a multipart/form-data upload." },
         { status: 400 },
      );
   }

   const file = formData.get("file");
   if (!file || typeof file === "string") {
      return NextResponse.json(
         { error: "No file was provided (form field: \"file\")." },
         { status: 400 },
      );
   }

   const ext = EXT_BY_MIME[file.type];
   if (!ext) {
      return NextResponse.json(
         {
            error: `Unsupported image type "${file.type || "unknown"}". Allowed: PNG, JPG, WebP, GIF, AVIF.`,
         },
         { status: 400 },
      );
   }
   if (file.size === 0) {
      return NextResponse.json(
         { error: "The uploaded file is empty." },
         { status: 400 },
      );
   }
   if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
         { error: "Image is too large — the limit is 5 MB." },
         { status: 400 },
      );
   }

   const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
   const uploadDir =
      process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

   try {
      await fs.mkdir(uploadDir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(uploadDir, filename), buffer);
   } catch (error) {
      console.error("Upload failed:", error);
      return NextResponse.json(
         { error: "Could not save the uploaded file on the server." },
         { status: 500 },
      );
   }

   return NextResponse.json(
      {
         url: `/uploads/${filename}`,
         filename,
         size: file.size,
         type: file.type,
      },
      { status: 201 },
   );
}
