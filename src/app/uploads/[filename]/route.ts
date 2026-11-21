import { NextRequest, NextResponse } from "next/server";
import { readStoredFile } from "@src/lib/storage";

// Serves files stored by POST /api/uploads (src/lib/storage.ts).
//
// This route exists because Next.js static `public/` serving only
// serves files that existed when the production server started:
// an image uploaded a second ago was written to public/uploads and
// its "/uploads/<file>" URL stored on the product, but the preview
// (and the product list/details) got a 404 until the next restart.
// Reading the file from the storage directory on each request makes
// new uploads display immediately, in dev and production alike,
// and also honours a custom UPLOAD_DIR that is not under public/.
//
// No auth gate: these URLs were always publicly reachable as static
// files, and filenames are unguessable (timestamp + random suffix).
// readStoredFile only serves the raster image types the uploads
// route can mint and rejects traversal/nested paths.

export const dynamic = "force-dynamic";

export async function GET(
   _request: NextRequest,
   { params }: { params: Promise<{ filename: string }> },
) {
   const { filename } = await params;
   const file = await readStoredFile(filename);
   if (!file) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
   }
   return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
         "Content-Type": file.contentType,
         "Content-Length": String(file.buffer.length),
         // Stored filenames are unique per upload and never
         // overwritten, so a long immutable cache is safe.
         "Cache-Control": "public, max-age=31536000, immutable",
      },
   });
}
