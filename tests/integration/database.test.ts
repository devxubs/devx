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
});
