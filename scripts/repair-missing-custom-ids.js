// ─────────────────────────────────────────────────────────────────────────────
// DevX POS — Repair script: assign missing display IDs (customId)
// ─────────────────────────────────────────────────────────────────────────────
// Purpose
//   Records created by the OLD base seeder (prisma/seed.js before the
//   ID-02 fix) — and any other pre-generator records — can have a NULL
//   customId, so the UI shows a dash instead of EP_/CUS_/CAT_/UNIT_/
//   AST_ ids. This script assigns the next EntitySequence values to
//   exactly those records, per entity, in creation order.
//
//   It NEVER renumbers a record that already has an id, never touches
//   primary keys (`id`) or any foreign key, and never deletes anything.
//   customId is a display-only unique field on these five models —
//   every relation in the schema points at `id`, so filling customId
//   cannot break a relationship (verified against prisma/schema.prisma).
//
// Safety
//   • Database-name guard, checked in BOTH modes before anything else:
//     the DATABASE_URL database name must match /(test|demo|dev)/i.
//     There is NO override flag — the script cannot be pointed at a
//     production-named database.
//   • Dry-run is the DEFAULT: it prints the exact records it would
//     change (entity, name, current value, proposed id) and writes
//     nothing. Pass --apply to write.
//   • Abort conditions (validated for ALL entities before ANY write;
//     on abort the script exits non-zero having written nothing):
//       - duplicate existing customIds within an entity
//       - EntitySequence counter BEHIND the highest existing id
//         (counter state inconsistent with the data)
//       - a proposed id colliding with an existing kept id
//   • Writes happen in ONE transaction (all-or-nothing), and the
//     EntitySequence counter is advanced to the last assigned value
//     so the app's own generator continues seamlessly afterwards.
//
// Usage (owner, LOCAL TEST DATABASE ONLY)
//   node scripts/repair-missing-custom-ids.js            # dry-run
//   node scripts/repair-missing-custom-ids.js --apply    # write
// ─────────────────────────────────────────────────────────────────────────────

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

// Entity order is dependency-safe: customId has no cross-references,
// so this is simply the owner's reporting order.
const ENTITIES = [
   { type: "USER", txKey: "user", prefixField: "prefixEmployee", fallback: "EP_", label: (r) => `${r.name || "(no name)"} <${r.email || "no email"}>` },
   { type: "CUSTOMER", txKey: "customer", prefixField: "prefixCustomer", fallback: "CUS_", label: (r) => r.name || "(no name)" },
   { type: "CATEGORY", txKey: "category", prefixField: "prefixCategory", fallback: "CAT_", label: (r) => r.name || "(no name)" },
   { type: "UNIT", txKey: "unit", prefixField: "prefixUnit", fallback: "UNIT_", label: (r) => r.name || "(no name)" },
   { type: "ASSET", txKey: "asset", prefixField: "prefixAsset", fallback: "AST_", label: (r) => r.name || "(no name)" },
];

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

function escapeRegExp(s) {
   return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function configuredPrefix(entity, setting) {
   if (setting && setting[entity.prefixField]) return setting[entity.prefixField];
   return entity.fallback;
}

async function planEntity(entity, setting) {
   const prefix = await configuredPrefix(entity, setting);
   const model = prisma[entity.txKey];
   // Only User's label uses an email; Category/Unit/Asset have no
   // email column, so it is selected for USER only.
   const select = { id: true, customId: true, createdAt: true, name: true };
   if (entity.type === "USER") select.email = true;
   const records = await model.findMany({
      select,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
   });

   const kept = records.filter((r) => r.customId != null && String(r.customId).trim() !== "");
   const missing = records.filter((r) => r.customId == null || String(r.customId).trim() === "");

   const problems = [];

   // Abort check 1: duplicate existing customIds within the entity.
   const seen = new Map();
   for (const r of kept) {
      if (seen.has(r.customId)) {
         problems.push(
            `duplicate customId "${r.customId}" on records ${seen.get(r.customId)} and ${r.id} — refusing to guess which one owns it`,
         );
      } else {
         seen.set(r.customId, r.id);
      }
   }

   // Sequence state.
   const seqRow = await prisma.entitySequence.findUnique({
      where: { entityType: entity.type },
   });
   const counter = seqRow ? seqRow.currentSeq : 0;
   const seqPattern = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`);
   let maxSeq = 0;
   for (const r of kept) {
      const m = seqPattern.exec(String(r.customId));
      if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
   }

   // Abort check 2: counter behind the data — inconsistent state.
   if (counter < maxSeq) {
      problems.push(
         `EntitySequence counter for ${entity.type} is ${counter} but existing ids already reach ${prefix}${maxSeq} — counter state is inconsistent with the data`,
      );
   }

   // Proposals continue strictly above both the counter and the data.
   let next = Math.max(counter, maxSeq) + 1;
   const proposals = missing.map((r) => ({
      recordId: r.id,
      label: entity.label(r),
      current: r.customId == null ? null : String(r.customId),
      proposed: `${prefix}${next++}`,
   }));

   // Abort check 3: a proposal must never collide with a kept id.
   for (const p of proposals) {
      if (seen.has(p.proposed)) {
         problems.push(
            `proposed id "${p.proposed}" for record ${p.recordId} collides with an existing kept id`,
         );
      }
   }

   return {
      entity,
      prefix,
      counter,
      maxSeq,
      totalRecords: records.length,
      keptCount: kept.length,
      proposals,
      problems,
      lastSeq: proposals.length ? next - 1 : null,
   };
}

async function main() {
   const { name: dbName, host } = databaseName();

   console.log("──────────────────────────────────────────────────────────────");
   console.log(" DevX POS — Repair missing display IDs (customId)");
   console.log(` Mode            : ${APPLY ? "APPLY (writes!)" : "DRY-RUN (no writes)"}`);
   console.log(` Target database : ${dbName || "(unknown)"}  @ ${host}`);
   console.log("──────────────────────────────────────────────────────────────");

   // Guard — re-verified here for BOTH modes, before any read or write.
   if (!/(test|demo|dev)/i.test(dbName)) {
      console.error(
         `✋ Refused: database "${dbName}" does not look like a test/demo/dev database.`,
      );
      console.error("   This repair only runs on a local test/demo database. There is no override.");
      process.exit(1);
   }

   const setting = await prisma.storeSetting
      .findUnique({ where: { id: "default" } })
      .catch(() => null);

   // ── Planning pass: validate EVERYTHING before writing ANYTHING. ──
   const plans = [];
   const allProblems = [];
   for (const entity of ENTITIES) {
      const plan = await planEntity(entity, setting);
      plans.push(plan);
      for (const p of plan.problems) allProblems.push(`[${entity.type}] ${p}`);
   }

   // ── Report the exact affected records. ──
   let totalAffected = 0;
   for (const plan of plans) {
      const { entity, prefix, counter, maxSeq, proposals } = plan;
      console.log(
         `\n${entity.type}  (prefix ${prefix}, sequence counter ${counter}, highest existing ${maxSeq || "—"}, records ${plan.totalRecords}, already numbered ${plan.keptCount})`,
      );
      if (proposals.length === 0) {
         console.log("   ✓ nothing to repair");
      } else {
         for (const p of proposals) {
            console.log(
               `   • ${p.label}\n       current: ${p.current === null ? "NULL" : JSON.stringify(p.current)}  →  proposed: ${p.proposed}`,
            );
         }
         console.log(`   → ${proposals.length} record(s) to repair in ${entity.type}`);
      }
      totalAffected += proposals.length;
   }
   console.log(`\nTOTAL: ${totalAffected} record(s) across ${ENTITIES.length} entities.`);

   if (allProblems.length > 0) {
      console.error("\n✋ ABORT — unsafe state detected, NOTHING was written:");
      for (const p of allProblems) console.error(`   • ${p}`);
      console.error("   Resolve the inconsistency manually, then re-run the dry-run.");
      process.exit(1);
   }

   if (!APPLY) {
      console.log("\nDRY-RUN complete — no changes were written.");
      console.log("If the plan above is exactly right, run:");
      console.log("   node scripts/repair-missing-custom-ids.js --apply");
      return;
   }

   if (totalAffected === 0) {
      console.log("\nNothing to do — every record already has an id.");
      return;
   }

   // ── Apply pass: one transaction, all-or-nothing. ──
   await prisma.$transaction(
      async (tx) => {
         for (const plan of plans) {
            if (plan.proposals.length === 0) continue;
            const model = tx[plan.entity.txKey];
            for (const p of plan.proposals) {
               await model.update({
                  where: { id: p.recordId },
                  data: { customId: p.proposed },
               });
            }
            await tx.entitySequence.upsert({
               where: { entityType: plan.entity.type },
               update: { currentSeq: plan.lastSeq },
               create: { entityType: plan.entity.type, currentSeq: plan.lastSeq },
            });
         }
      },
      { timeout: 30000, maxWait: 10000 },
   );

   console.log(`\n✓ APPLIED: ${totalAffected} record(s) numbered. EntitySequence counters advanced.`);
}

main()
   .catch((err) => {
      console.error("Repair script failed:", err);
      process.exit(1);
   })
   .finally(() => prisma.$disconnect());
