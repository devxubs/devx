// ─────────────────────────────────────────────────────────────────────────────
// DevX POS — Orphan upload sweep (P4-14)
// ─────────────────────────────────────────────────────────────────────────────
// Purpose
//   Files uploaded through POST /api/uploads land on disk under the
//   uploads directory (UPLOAD_DIR env, default <project>/public/
//   uploads) and are referenced by URL ("/uploads/<filename>") from
//   database fields. When an upload is abandoned (the form is never
//   saved) or a reference is replaced outside the product-PUT orphan
//   cleanup, the file stays on disk forever, referenced by nothing.
//
//   This script finds those orphans: files in the uploads directory
//   whose filename is not referenced by ANY of the fields it can
//   check:
//     • Product.images            (JSON array of URL strings)
//     • ProductVariant.image      (single URL string)
//     • PurchaseAttachment.url
//     • ChatMessage.attachments   (JSON: strings or { url } objects)
//     • ChatMessage.senderAvatar, User.image (single URL strings)
//
// Safety
//   • DRY-RUN BY DEFAULT: without --apply the script only reports.
//     It never deletes anything in dry-run mode.
//   • --apply deletes ONLY the listed orphan files from the uploads
//     directory (plain files directly inside it — no recursion, no
//     directories, nothing outside it).
//   • Database-name guard (same convention as
//     scripts/scan-barcode-duplicates.js): the DATABASE_URL database
//     name must match /(test|demo|dev)/i, unless --allow-non-test-db
//     is passed deliberately. The database itself is only ever READ
//     (findMany SELECTs) in both modes.
//   • Only app-minted "/uploads/<single filename>" references count,
//     using the same extraction rules as src/lib/storage.ts
//     (data-URLs, external URLs, nested paths and traversal attempts
//     are ignored — they never named a file in this directory).
//
// Usage (owner)
//   node scripts/sweep-orphan-uploads.js                      # dry-run report
//   node scripts/sweep-orphan-uploads.js --apply              # delete orphans
//   node scripts/sweep-orphan-uploads.js --allow-non-test-db  # non-test DB (report)
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");
const ALLOW_NON_TEST_DB = process.argv.includes("--allow-non-test-db");

function databaseName() {
   const url = process.env.DATABASE_URL || "";
   try {
      const u = new URL(url);
      return {
         name: u.pathname.replace(/^\//, ""),
         host: u.hostname + (u.port ? `:${u.port}` : ""),
      };
   } catch {
      return { name: "", host: "(unparseable DATABASE_URL)" };
   }
}

function uploadsDir() {
   return path.resolve(
      process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads"),
   );
}

/** Same extraction rule as storedFileNameFromUrl in src/lib/storage.ts. */
function storedFileNameFromUrl(url) {
   if (typeof url !== "string") return null;
   const prefix = "/uploads/";
   if (!url.startsWith(prefix)) return null;
   const name = url.slice(prefix.length);
   if (!name) return null;
   if (name.includes("/") || name.includes("\\") || name.includes("..")) {
      return null;
   }
   return name;
}

function collectFromValue(value, into) {
   if (typeof value === "string") {
      const name = storedFileNameFromUrl(value);
      if (name) into.add(name);
      return;
   }
   if (Array.isArray(value)) {
      for (const entry of value) collectFromValue(entry, into);
      return;
   }
   if (value && typeof value === "object") {
      // Chat attachment objects carry their URL under `url`.
      if (typeof value.url === "string") collectFromValue(value.url, into);
   }
}

async function collectReferencedNames() {
   const referenced = new Set();

   const products = await prisma.product.findMany({
      select: { images: true },
   });
   for (const p of products) collectFromValue(p.images, referenced);

   const variants = await prisma.productVariant.findMany({
      select: { image: true },
   });
   for (const v of variants) collectFromValue(v.image, referenced);

   const attachments = await prisma.purchaseAttachment.findMany({
      select: { url: true },
   });
   for (const a of attachments) collectFromValue(a.url, referenced);

   const messages = await prisma.chatMessage.findMany({
      select: { attachments: true, senderAvatar: true },
   });
   for (const m of messages) {
      collectFromValue(m.attachments, referenced);
      collectFromValue(m.senderAvatar, referenced);
   }

   const users = await prisma.user.findMany({ select: { image: true } });
   for (const u of users) collectFromValue(u.image, referenced);

   return referenced;
}

async function main() {
   const { name, host } = databaseName();
   console.log(`Database: ${name || "(unknown)"} @ ${host || "(unknown)"}`);
   console.log(`Mode: ${APPLY ? "APPLY (orphan files will be DELETED)" : "dry-run (report only)"}`);

   if (!/(test|demo|dev)/i.test(name) && !ALLOW_NON_TEST_DB) {
      console.error(
         "REFUSED: database name does not match /(test|demo|dev)/i. " +
            "If you intentionally want to sweep against this database, " +
            "re-run with --allow-non-test-db.",
      );
      process.exitCode = 1;
      return;
   }

   const dir = uploadsDir();
   console.log(`Uploads directory: ${dir}`);

   let entries = [];
   try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
   } catch {
      console.log("Uploads directory does not exist — nothing to sweep.");
      return;
   }
   const filesOnDisk = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .sort();

   const referenced = await collectReferencedNames();
   const orphans = filesOnDisk.filter((f) => !referenced.has(f));

   console.log(
      `Files on disk: ${filesOnDisk.length} · referenced: ${filesOnDisk.length - orphans.length} · orphaned: ${orphans.length}`,
   );
   for (const orphan of orphans) {
      const size = fs.statSync(path.join(dir, orphan)).size;
      console.log(`  ORPHAN  ${orphan} (${size} bytes)`);
   }

   if (!APPLY) {
      console.log(
         orphans.length > 0
            ? "Dry-run only — re-run with --apply to delete the orphan files listed above."
            : "No orphan files found.",
      );
      return;
   }

   let deleted = 0;
   for (const orphan of orphans) {
      fs.unlinkSync(path.join(dir, orphan));
      deleted += 1;
      console.log(`  DELETED ${orphan}`);
   }
   console.log(`Deleted ${deleted} orphan file(s).`);
}

main()
   .catch((error) => {
      console.error("Sweep failed:", error);
      process.exitCode = 1;
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
