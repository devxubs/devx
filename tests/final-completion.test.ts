import { describe, it, expect, vi, afterEach } from "vitest";
import {
   auditActorFromSession,
   logAudit,
   requestAuditContext,
} from "@src/lib/audit";
import {
   checkRateLimit,
   getClientIp,
   hitRateLimit,
   resetRateLimit,
} from "@src/lib/rateLimit";
import {
   getStandingReturnCredit,
   lockPurchaseRow,
} from "@src/lib/purchaseReturns";
import { fetchAllPages } from "@src/lib/fetchAllPages";
import { fetchAllReportRows } from "@src/Pages/admin/Reports/reportExport";

// Final Phase 4/5 completion coverage for pure helpers that sit
// behind route-level behaviour: audit-row shaping, login throttling,
// purchase locking/credit aggregation, and chunked export loading.

describe("audit writer + request context", () => {
   it("writes the exact audit row and omits a null changes payload", async () => {
      const create = vi.fn(async (_args: any) => ({}));
      await logAudit(
         { auditLog: { create } },
         {
            actor: { id: "user-1", label: "Owner" },
            action: "RESTORE",
            entityType: "PRODUCT",
            entityId: "prod-1",
            entityCustomId: "PROD_1",
            summary: "Product restored from bin",
            changes: null,
            ipAddress: "203.0.113.9",
            userAgent: "Vitest",
         },
      );
      expect(create).toHaveBeenCalledWith({
         data: {
            actorId: "user-1",
            actorLabel: "Owner",
            action: "RESTORE",
            entityType: "PRODUCT",
            entityId: "prod-1",
            entityCustomId: "PROD_1",
            summary: "Product restored from bin",
            ipAddress: "203.0.113.9",
            userAgent: "Vitest",
         },
      });
      expect(create.mock.calls[0]?.[0].data).not.toHaveProperty("changes");
   });

   it("derives actor snapshots and request context without secrets", () => {
      expect(
         auditActorFromSession({
            id: "u1",
            email: "owner@example.com",
            name: "Owner",
         } as any),
      ).toEqual({ id: "u1", label: "Owner" });
      expect(auditActorFromSession(null)).toEqual({ id: null, label: null });

      const request = {
         headers: {
            get: (name: string) =>
               ({
                  "x-forwarded-for": "198.51.100.4, 10.0.0.1",
                  "x-real-ip": "192.0.2.1",
                  "user-agent": "Browser",
               })[name] || null,
         },
      };
      expect(requestAuditContext(request as any)).toEqual({
         ipAddress: "198.51.100.4",
         userAgent: "Browser",
      });
   });
});

describe("login rate limiter", () => {
   it("allows up to the limit, reports retry time, and resets per key", () => {
      const key = `final-test-${Date.now()}`;
      expect(hitRateLimit(key, 2, 60_000)).toMatchObject({
         allowed: true,
         remaining: 1,
      });
      expect(hitRateLimit(key, 2, 60_000)).toMatchObject({
         allowed: true,
         remaining: 0,
      });
      expect(checkRateLimit(key, 2, 60_000)).toMatchObject({
         allowed: false,
         remaining: 0,
      });
      expect(checkRateLimit(key, 2, 60_000).retryAfterSeconds).toBeGreaterThan(0);
      resetRateLimit(key);
      expect(checkRateLimit(key, 2, 60_000)).toMatchObject({
         allowed: true,
         remaining: 2,
      });
   });

   it("blocks the IP-only bucket across different email+IP pair keys", () => {
      // Follow-up round: the login route hits BOTH buckets per
      // failure. Two failures spread over two different accounts
      // from one address exhaust the IP bucket while each pair
      // bucket still has room — the route 429s on either bucket.
      const stamp = Date.now();
      const ipKey = `login-ip:test-${stamp}`;
      const pairA = `login:a-${stamp}@example.test:203.0.113.9`;
      const pairB = `login:b-${stamp}@example.test:203.0.113.9`;
      hitRateLimit(ipKey, 2, 60_000);
      hitRateLimit(pairA, 2, 60_000);
      hitRateLimit(ipKey, 2, 60_000);
      hitRateLimit(pairB, 2, 60_000);
      expect(checkRateLimit(ipKey, 2, 60_000).allowed).toBe(false);
      expect(checkRateLimit(pairB, 2, 60_000).allowed).toBe(true);
      // Resetting a pair bucket (successful login) must not clear
      // the IP bucket — the route only resets the pair key.
      resetRateLimit(pairB);
      expect(checkRateLimit(ipKey, 2, 60_000).allowed).toBe(false);
   });

   it("starts a fresh window once a bucket's window has expired", () => {
      // Expired buckets are swept lazily on access (memory bound);
      // behaviourally the key must behave as never seen once its
      // window has passed.
      const key = `evict-test-${Date.now()}`;
      const t0 = Date.now();
      const spy = vi.spyOn(Date, "now").mockReturnValue(t0);
      try {
         hitRateLimit(key, 1, 1_000);
         expect(checkRateLimit(key, 1, 1_000).allowed).toBe(false);
         spy.mockReturnValue(t0 + 1_500);
         expect(hitRateLimit(key, 1, 1_000)).toMatchObject({
            allowed: true,
            remaining: 0,
         });
         expect(checkRateLimit(key, 1, 1_000).allowed).toBe(false);
      } finally {
         spy.mockRestore();
      }
   });

   it("derives the client IP from proxy-asserted headers only", () => {
      const req = (headers: Record<string, string>) => ({
         headers: {
            get: (name: string) => headers[name.toLowerCase()] ?? null,
         },
      });
      // x-real-ip wins over any forwarded chain.
      expect(
         getClientIp(
            req({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1" }),
         ),
      ).toBe("203.0.113.7");
      // Without x-real-ip, the LAST forwarded hop is used — never
      // the first, which any client can spoof.
      expect(
         getClientIp(
            req({ "x-forwarded-for": "1.1.1.1, 198.51.100.2, 203.0.113.9" }),
         ),
      ).toBe("203.0.113.9");
      expect(getClientIp(req({}))).toBe("unknown");
   });
});

describe("purchase-return locking + standing credit helpers", () => {
   it("reports whether the Purchase row lock found a row", async () => {
      const foundTx = { $queryRaw: vi.fn(async () => [{ id: "p1" }]) };
      const missingTx = { $queryRaw: vi.fn(async () => []) };
      await expect(lockPurchaseRow(foundTx, "p1")).resolves.toBe(true);
      await expect(lockPurchaseRow(missingTx, "missing")).resolves.toBe(false);
      expect(foundTx.$queryRaw).toHaveBeenCalledTimes(1);
   });

   it("aggregates standing credit from stored return columns", async () => {
      const aggregate = vi.fn(async () => ({
         _sum: { totalAmount: 125.5, creditConsumed: 25.25 },
      }));
      await expect(
         getStandingReturnCredit({ purchaseReturn: { aggregate } }, "sup-1"),
      ).resolves.toBe(100.25);
      expect(aggregate).toHaveBeenCalledWith({
         where: { supplierId: "sup-1", isDeleted: false },
         _sum: { totalAmount: true, creditConsumed: true },
      });
      await expect(
         getStandingReturnCredit({ purchaseReturn: { aggregate } }, ""),
      ).resolves.toBe(0);
   });
});

describe("fetchAllPages export loader", () => {
   afterEach(() => vi.unstubAllGlobals());

   it("walks bounded pages until the endpoint total is reached", async () => {
      const fetchImpl = vi.fn(async (url: string) => {
         const page = Number(new URL(url, "https://local.test").searchParams.get("page"));
         const rows =
            page === 1 ? [1, 2] : page === 2 ? [3, 4] : [5];
         return {
            ok: true,
            json: async () => ({ rows, total: 5 }),
         };
      });
      vi.stubGlobal("fetch", fetchImpl);

      const rows = await fetchAllPages(
         (page, limit) => `https://local.test/items?page=${page}&limit=${limit}`,
         (data) => data.rows,
         (data) => data.total,
         { pageSize: 2, maxPages: 5 },
      );
      expect(rows).toEqual([1, 2, 3, 4, 5]);
      expect(fetchImpl).toHaveBeenCalledTimes(3);
   });

   it("throws on a failed page instead of returning partial data as complete", async () => {
      const fetchImpl = vi.fn(async () => ({ ok: false, status: 500, json: async () => [] }));
      vi.stubGlobal("fetch", fetchImpl);
      await expect(
         fetchAllPages(
            (page, limit) => `https://local.test/items?page=${page}&limit=${limit}`,
            (data) => data,
            undefined,
            { pageSize: 100, maxPages: 3 },
         ),
      ).rejects.toThrow(/HTTP 500/);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
   });

   it("throws mid-walk when a later page fails — accumulated rows are discarded", async () => {
      const fetchImpl = vi.fn(async (url: string) => {
         const page = Number(new URL(url, "https://local.test").searchParams.get("page"));
         if (page === 1) {
            return { ok: true, status: 200, json: async () => ({ rows: [1, 2], total: 4 }) };
         }
         return { ok: false, status: 503, json: async () => ({}) };
      });
      vi.stubGlobal("fetch", fetchImpl);
      await expect(
         fetchAllPages(
            (page, limit) => `https://local.test/items?page=${page}&limit=${limit}`,
            (data) => data.rows,
            (data) => data.total,
            { pageSize: 2, maxPages: 5 },
         ),
      ).rejects.toThrow(/HTTP 503/);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
   });

   it("fetchAllReportRows throws on a failed page too", async () => {
      const fetchImpl = vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) }));
      vi.stubGlobal("fetch", fetchImpl);
      await expect(
         fetchAllReportRows(new URLSearchParams({ tab: "sales" }), (d) => d.rows || []),
      ).rejects.toThrow(/HTTP 502/);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
   });
});
