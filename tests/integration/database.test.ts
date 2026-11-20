/**
 * OPTIONAL database integration tests — DISABLED BY DEFAULT.
 *
 * These tests are for transaction-sensitive behaviour that unit
 * tests with Prisma-shaped fakes cannot prove. They are skipped
 * unless TEST_DATABASE_URL is explicitly set, so the normal
 * `npm test` run stays hermetic and green without any database.
 *
 * OWNER-RUN ONLY, against a disposable database whose NAME
 * contains test, demo, or dev (for example devx_pos_local_test):
 *
 *   TEST_DATABASE_URL="mysql://user:pass@localhost:3306/devx_pos_local_test" \
 *     npx vitest run tests/integration/database.test.ts
 *
 * Never point TEST_DATABASE_URL at production or at the normal
 * DATABASE_URL. The suite itself refuses a database name that does
 * not contain test/demo/dev. Its one write test performs both
 * writes inside a transaction and deliberately rolls them back.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
   computeReturnSettlement,
   computePurchaseTotals,
   sumRecordedDueAbsorbed,
} from "@src/lib/purchaseReturns";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

function databaseName(url: string | undefined): string {
   if (!url) return "";
   try {
      return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
   } catch {
      return "";
   }
}

const enabled =
   Boolean(testDatabaseUrl) &&
   /(test|demo|dev)/i.test(databaseName(testDatabaseUrl));

const prisma = enabled
   ? new PrismaClient({
        datasources: { db: { url: testDatabaseUrl as string } },
     })
   : null;

describe.skipIf(!enabled)("database integration (explicit test DB only)", () => {
   beforeAll(async () => {
      await prisma!.$connect();
   });

   afterAll(async () => {
      await prisma!.$disconnect();
   });

   it("connects and can read the Phase 4 tables", async () => {
      const [auditLogs, purchaseReturns, orders] = await Promise.all([
         prisma!.auditLog.count(),
         prisma!.purchaseReturn.count(),
         prisma!.order.count(),
      ]);
      expect(auditLogs).toBeGreaterThanOrEqual(0);
      expect(purchaseReturns).toBeGreaterThanOrEqual(0);
      expect(orders).toBeGreaterThanOrEqual(0);
   });

   it("rolls back a business write and its audit row together", async () => {
      const marker = `integration-${Date.now()}-${Math.random()
         .toString(36)
         .slice(2, 8)}`;

      await expect(
         prisma!.$transaction(async (tx) => {
            const category = await tx.category.create({
               data: { name: marker },
            });
            await tx.auditLog.create({
               data: {
                  actorId: null,
                  actorLabel: "Integration test",
                  action: "CREATE",
                  entityType: "PRODUCT",
                  entityId: category.id,
                  entityCustomId: marker,
                  summary: "Integration rollback probe",
               },
            });
            throw new Error("intentional rollback");
         }),
      ).rejects.toThrow("intentional rollback");

      await expect(
         prisma!.category.findUnique({ where: { name: marker } }),
      ).resolves.toBeNull();
      await expect(
         prisma!.auditLog.count({ where: { entityCustomId: marker } }),
      ).resolves.toBe(0);
   });

   it("purchase PUT recompute stays return-aware end-to-end (P0-1)", async () => {
      // Mirrors the route-level scenario of audit C-1 at the data
      // layer: create a ৳100 purchase (paid ৳80, due ৳20), record
      // a ৳50 SUPPLIER_CREDIT return exactly as the create route
      // does (return row + CREATE audit row carrying dueAbsorbed +
      // totals reduced by dueAbsorbed only), then run the PUT
      // route's recompute (live returns → CREATE audit rows →
      // Σ recorded dueAbsorbed → computePurchaseTotals) for a
      // note-only edit: totals must stay total 80 / due 0. After
      // the return is deleted (totals restored from the recorded
      // dueAbsorbed, as the delete route does), the same recompute
      // must yield the gross totals again — exactly once.
      // Everything runs in one transaction that is rolled back.
      const marker = `integration-p01-${Date.now()}-${Math.random()
         .toString(36)
         .slice(2, 8)}`;

      await expect(
         prisma!.$transaction(async (tx) => {
            const supplier = await tx.supplier.create({
               data: { name: marker },
            });
            const purchase = await tx.purchase.create({
               data: {
                  invoice: marker,
                  supplierId: supplier.id,
                  productAmount: 100,
                  othersCost: 0,
                  discount: 0,
                  total: 100,
                  paid: 80,
                  due: 20,
               },
            });

            // Return creation (mirrors POST /purchases/[id]/returns).
            const settlement = computeReturnSettlement(
               50,
               Number(purchase.due),
               "SUPPLIER_CREDIT",
            );
            expect(settlement.dueAbsorbed).toBe(20);
            expect(settlement.remainder).toBe(30);
            const created = await tx.purchaseReturn.create({
               data: {
                  customId: `${marker}-pret`,
                  purchaseId: purchase.id,
                  supplierId: supplier.id,
                  totalAmount: settlement.totalAmount,
                  settlement: settlement.settlement,
                  creditConsumed: settlement.creditConsumed,
               },
            });
            await tx.auditLog.create({
               data: {
                  actorId: null,
                  actorLabel: "Integration test",
                  action: "CREATE",
                  entityType: "PURCHASE_RETURN",
                  entityId: created.id,
                  entityCustomId: created.customId,
                  summary: "Integration P0-1 probe",
                  changes: {
                     totalAmount: { from: null, to: settlement.totalAmount },
                     settlement: { from: null, to: settlement.settlement },
                     dueAbsorbed: { from: null, to: settlement.dueAbsorbed },
                     remainder: { from: null, to: settlement.remainder },
                     creditConsumed: {
                        from: null,
                        to: settlement.creditConsumed,
                     },
                  },
               },
            });
            await tx.purchase.update({
               where: { id: purchase.id },
               data: { total: 80, due: 0 },
            });

            // The PUT route's recompute, step for step.
            const recompute = async (paid: number) => {
               const liveReturns = await tx.purchaseReturn.findMany({
                  where: { purchaseId: purchase.id, isDeleted: false },
                  select: {
                     id: true,
                     settlement: true,
                     totalAmount: true,
                     creditConsumed: true,
                  },
               });
               const audits = await tx.auditLog.findMany({
                  where: {
                     entityType: "PURCHASE_RETURN",
                     action: "CREATE",
                     entityId: { in: liveReturns.map((r) => r.id) },
                  },
                  orderBy: { createdAt: "asc" },
                  select: { entityId: true, changes: true },
               });
               const auditById = new Map<string, any>();
               for (const row of audits) {
                  if (!auditById.has(row.entityId)) {
                     auditById.set(row.entityId, row.changes);
                  }
               }
               const totalDueAbsorbed = sumRecordedDueAbsorbed(
                  liveReturns.map((r) => {
                     const changes: any = auditById.get(r.id) || null;
                     return {
                        settlement: r.settlement,
                        totalAmount: Number(r.totalAmount),
                        creditConsumed: Number(r.creditConsumed),
                        auditDueAbsorbed:
                           typeof changes?.dueAbsorbed?.to === "number"
                              ? changes.dueAbsorbed.to
                              : null,
                        auditCreditConsumed:
                           typeof changes?.creditConsumed?.to === "number"
                              ? changes.creditConsumed.to
                              : null,
                     };
                  }),
               );
               return computePurchaseTotals({
                  productAmount: 100,
                  othersCost: 0,
                  discount: 0,
                  paid,
                  totalDueAbsorbed,
               });
            };

            // Note-only PUT after the return: totals unchanged.
            expect(await recompute(80)).toEqual({ total: 80, due: 0 });

            // Return deletion restores by the recorded dueAbsorbed
            // (mirrors DELETE /purchase-returns/[id]); a later PUT
            // must agree with the restored gross totals.
            await tx.purchaseReturn.update({
               where: { id: created.id },
               data: { isDeleted: true, deletedAt: new Date() },
            });
            await tx.purchase.update({
               where: { id: purchase.id },
               data: { total: 100, due: 20 },
            });
            expect(await recompute(80)).toEqual({ total: 100, due: 20 });

            throw new Error("intentional rollback");
         }),
      ).rejects.toThrow("intentional rollback");
   });
});
