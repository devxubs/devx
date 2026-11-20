// ─────────────────────────────────────────────────────────────────────────────
// DevX POS — Read-only scan: duplicate barcodes across the unified
// Product + ProductVariant namespace (P2-17 / D6 preparation)
// ─────────────────────────────────────────────────────────────────────────────
// Purpose
//   Barcode uniqueness is currently enforced only at the application
//   level (src/lib/barcodeUniqueness.ts) and the scan lookup answers
//   409 on ambiguity — but the owner's existing data has never been
//   scanned, so nobody knows whether duplicates already exist, which
//   is the blocker for any DB-level enforcement decision (@unique is
//   impossible across two tables; the D6 proposal needs this data).
//
//   This script produces that evidence: every barcode value carried
//   by MORE THAN ONE record across Product.barcode and
//   ProductVariant.barcode, INCLUDING soft-deleted rows (a binned
//   product's barcode is reusable at the app level, but the owner
//   needs to see those collisions before deciding on enforcement).
//   For each duplicate it prints the count and the affected records
//   (kind, customId, id, name, deleted state), plus summary counts
//   split into live-only duplicates vs duplicates involving at
//   least one soft-deleted row.
//
// Safety
//   • READ-ONLY: the script issues findMany SELECTs only. It never
//     creates, updates or deletes anything, in any mode.
//   • Database-name guard (same convention as
//     scripts/repair-missing-custom-ids.js): the DATABASE_URL
//     database name must match /(test|demo|dev)/i. Unlike the repair
//     script this scan DOES accept an explicit override —
//     --allow-non-test-db — because the owner may legitimately need
//     the report against the production database before deciding on
//     enforcement; the override is safe here precisely because the
//     script cannot write. The guard still refuses by default.
//   • Blank/NULL barcodes are ignored (no barcode is not a
//     duplicate), matching normalizeBarcode semantics in the app.
//
// Usage (owner)
//   node scripts/scan-barcode-duplicates.js                     # test/demo/dev DB
//   node scripts/scan-barcode-duplicates.js --allow-non-test-db # any DB, read-only
// ─────────────────────────────────────────────────────────────────────────────

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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

function normalize(code) {
   if (code === null || code === undefined) return null;
   const trimmed = String(code).trim();
   return trimmed ? trimmed : null;
}

async function main() {
   const { name, host } = databaseName();
   console.log(`Database: ${name || "(unknown)"} @ ${host || "(unknown)"}`);

   if (!/(test|demo|dev)/i.test(name) && !ALLOW_NON_TEST_DB) {
      console.error(
         "REFUSED: database name does not match /(test|demo|dev)/i. " +
            "This scan is read-only; if you intentionally want to scan " +
            "this database, re-run with --allow-non-test-db.",
      );
      process.exitCode = 1;
      return;
   }
   if (!/(test|demo|dev)/i.test(name)) {
      console.log(
         "NOTE: --allow-non-test-db override in effect. The scan remains read-only.",
      );
   }

   // Every barcode-bearing row, soft-deleted included.
   const [products, variants] = await Promise.all([
      prisma.product.findMany({
         where: { barcode: { not: null } },
         select: {
            id: true,
            customId: true,
            productName: true,
            barcode: true,
            isDeleted: true,
         },
      }),
      prisma.productVariant.findMany({
         where: { barcode: { not: null } },
         select: {
            id: true,
            variantName: true,
            barcode: true,
            isDeleted: true,
            product: {
               select: { customId: true, productName: true, isDeleted: true },
            },
         },
      }),
   ]);

   /** barcode -> array of record descriptors */
   const byBarcode = new Map();
   const add = (code, record) => {
      const key = normalize(code);
      if (!key) return;
      if (!byBarcode.has(key)) byBarcode.set(key, []);
      byBarcode.get(key).push(record);
   };

   for (const p of products) {
      add(p.barcode, {
         kind: "product",
         customId: p.customId || "(none)",
         id: p.id,
         label: p.productName,
         isDeleted: p.isDeleted,
      });
   }
   for (const v of variants) {
      add(v.barcode, {
         kind: "variant",
         customId: v.product?.customId || "(none)",
         id: v.id,
         label: `${v.product?.productName || "(unknown product)"} — ${v.variantName}`,
         // A variant is effectively dead if it OR its product is binned.
         isDeleted: v.isDeleted || Boolean(v.product?.isDeleted),
      });
   }

   const duplicates = [...byBarcode.entries()]
      .filter(([, records]) => records.length > 1)
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

   const liveOnly = duplicates.filter(([, records]) =>
      records.every((r) => !r.isDeleted),
   );
   const involvingDeleted = duplicates.length - liveOnly.length;

   console.log("");
   console.log(`Scanned ${products.length} product barcodes and ${variants.length} variant barcodes.`);
   console.log(`Distinct barcode values: ${byBarcode.size}`);
   console.log(`Duplicate barcode values: ${duplicates.length}`);
   console.log(`  - duplicates among LIVE records only: ${liveOnly.length}`);
   console.log(`  - duplicates involving soft-deleted rows: ${involvingDeleted}`);
   console.log("");

   if (duplicates.length === 0) {
      console.log("No duplicate barcodes found. The namespace is clean.");
      return;
   }

   for (const [code, records] of duplicates) {
      console.log(`Barcode "${code}" — ${records.length} records:`);
      for (const r of records) {
         console.log(
            `  - ${r.kind} customId=${r.customId} id=${r.id} "${r.label}"${r.isDeleted ? " [soft-deleted]" : ""}`,
         );
      }
   }
   console.log("");
   console.log(
      "No changes were made. Resolve live duplicates in the catalog UI, " +
         "then re-run this scan before any DB-level enforcement decision (D6).",
   );
}

main()
   .catch((err) => {
      console.error("Scan failed:", err);
      process.exitCode = 1;
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
