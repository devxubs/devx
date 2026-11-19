import { describe, it, expect } from "vitest";
import { generateNextEntityId } from "@src/lib/idGenerator";
import {
   normalizePermissions,
   permissionMatches,
   signToken,
   verifyToken,
   hashPassword,
   verifyPassword,
} from "@src/lib/auth";

// Fake EntitySequence + model surface for generateNextEntityId.
// The upsert mirrors the real atomic semantics: create at 1, then
// increment on every subsequent call.
function makeFakeIdDb(opts: {
   existingIds?: string[];
   settings?: Record<string, any> | null;
}) {
   // EntitySequence rows are keyed per entity type — one counter each.
   const seqByEntity = new Map<string, number>();
   const existing = new Set(opts.existingIds || []);
   const findFirst = async ({ where }: any) => {
      const wanted: string[] = (where.OR || []).map(
         (clause: any) => clause.customId || clause.orderId || clause.orderCode,
      );
      return wanted.some((id) => existing.has(id)) ? { customId: wanted[0] } : null;
   };
   const model = { findFirst };
   const db: any = {
      storeSetting: {
         findUnique: async () =>
            opts.settings === undefined ? null : opts.settings,
      },
      entitySequence: {
         upsert: async ({ where }: any) => {
            const next = (seqByEntity.get(where.entityType) || 0) + 1;
            seqByEntity.set(where.entityType, next);
            return { entityType: where.entityType, currentSeq: next };
         },
      },
      user: model,
      customer: model,
      supplier: model,
      order: model,
      purchase: model,
      product: model,
      category: model,
      unit: model,
      expense: model,
      asset: model,
      role: model,
      billingTransaction: model,
      warehouse: model,
      supplierPayment: model,
   };
   return { db, existing };
}

describe("generateNextEntityId sequencing", () => {
   it("issues sequential IDs from 1 with the default prefix", async () => {
      const { db } = makeFakeIdDb({});
      const first = await generateNextEntityId("CUSTOMER", db);
      const second = await generateNextEntityId("CUSTOMER", db);
      expect(first.customId).toBe("CUS_1");
      expect(first.seq).toBe(1);
      expect(second.customId).toBe("CUS_2");
      expect(second.seq).toBe(2);
   });

   it("uses each entity's own default prefix", async () => {
      const { db } = makeFakeIdDb({});
      expect((await generateNextEntityId("USER", db)).customId).toBe("EP_1");
      expect((await generateNextEntityId("ASSET", db)).customId).toBe("AST_1");
      expect((await generateNextEntityId("SUPPLIER_PAYMENT", db)).customId).toBe("SPAY_1");
   });

   it("skips a colliding ID by bumping the shared counter (never duplicates)", async () => {
      const { db } = makeFakeIdDb({ existingIds: ["CUS_1", "CUS_2"] });
      const next = await generateNextEntityId("CUSTOMER", db);
      expect(next.customId).toBe("CUS_3");
      expect(next.seq).toBe(3);
   });

   it("honours a configured prefix from the store settings", async () => {
      const { db } = makeFakeIdDb({
         settings: { prefixCustomer: "CST-" },
      });
      const next = await generateNextEntityId("CUSTOMER", db);
      expect(next.customId).toBe("CST-1");
      expect(next.prefix).toBe("CST-");
   });
});

describe("RBAC permission normalization + matching", () => {
   it("normalizes the seeded flat-map shape", () => {
      const map = normalizePermissions({ Orders: true, users: "true", reports: false });
      expect(map).toEqual({ orders: true, users: true, reports: false });
   });

   it("normalizes the UI-saved array shape ({ name, allow })", () => {
      const map = normalizePermissions([
         { name: "Order View", allow: true },
         { name: "User Delete", allow: false },
         "Products",
      ]);
      expect(map["order_view"]).toBe(true);
      expect(map["user_delete"]).toBe(false);
      expect(map["products"]).toBe(true);
   });

   it("returns an empty map for missing/garbage input", () => {
      expect(normalizePermissions(null)).toEqual({});
      expect(normalizePermissions(undefined)).toEqual({});
      expect(normalizePermissions(42)).toEqual({});
   });

   it("matches candidates case-insensitively and honours the `all` grant", () => {
      expect(permissionMatches({ orders: true }, ["orders"])).toBe(true);
      expect(permissionMatches({ orders: true }, ["Orders"])).toBe(true);
      expect(permissionMatches({ orders: true }, ["users", "reports"])).toBe(false);
      expect(permissionMatches({ all: true }, ["anything_at_all"])).toBe(true);
      expect(permissionMatches({ orders: false }, ["orders"])).toBe(false);
      expect(permissionMatches(null, ["orders"])).toBe(false);
      expect(permissionMatches(undefined, ["orders"])).toBe(false);
   });
});

describe("token + password handling", () => {
   it("signs and verifies a session token round-trip", () => {
      const token = signToken({ id: "u1", email: "a@b.com", name: "A", role: "Admin" });
      const session = verifyToken(token);
      expect(session?.id).toBe("u1");
      expect(session?.email).toBe("a@b.com");
   });

   it("rejects tampered and garbage tokens", () => {
      const token = signToken({ id: "u1", email: "a@b.com" });
      expect(verifyToken(`${token}x`)).toBeNull();
      expect(verifyToken("not-a-token")).toBeNull();
      expect(verifyToken("")).toBeNull();
   });

   it("hashes passwords so they verify (and wrong passwords do not)", async () => {
      const hash = await hashPassword("correct horse");
      expect(hash).not.toContain("correct horse");
      expect(await verifyPassword("correct horse", hash)).toBe(true);
      expect(await verifyPassword("wrong", hash)).toBe(false);
   });
});
