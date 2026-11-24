import { describe, it, expect } from "vitest";
import { generateNextEntityId, peekNextEntityId } from "@src/lib/idGenerator";
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

// OBS-B1 (Full Live QA Audit 2026-11-25): the create-form ID preview
// must come from the same sequence the server consumes. peekNextEntityId
// mirrors generateNextEntityId's prefix + collision rules read-only.
describe("peekNextEntityId (OBS-B1)", () => {
   function makePeekDb(currentSeq: number | null, existingIds: string[] = []) {
      const existing = new Set(existingIds);
      const model = {
         findFirst: async ({ where }: any) => {
            const wanted: string[] = (where.OR || []).map(
               (c: any) => c.customId || c.orderId || c.orderCode,
            );
            return wanted.some((id) => existing.has(id))
               ? { customId: wanted[0] }
               : null;
         },
      };
      const db: any = {
         storeSetting: { findUnique: async () => null },
         entitySequence: {
            findUnique: async () =>
               currentSeq === null
                  ? null
                  : { entityType: "ORDER", currentSeq },
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
         purchaseReturn: model,
      };
      return db;
   }

   it("previews current sequence + 1", async () => {
      const db = makePeekDb(3);
      const peek = await peekNextEntityId("ORDER", db);
      expect(peek.customId).toBe("ORD_4");
      expect(peek.seq).toBe(4);
   });

   it("starts at 1 when no sequence row exists yet", async () => {
      const db = makePeekDb(null);
      const peek = await peekNextEntityId("ORDER", db);
      expect(peek.customId).toBe("ORD_1");
   });

   it("skips IDs that already exist (seeded / out-of-band rows)", async () => {
      const db = makePeekDb(null, ["ORD_1", "ORD_2"]);
      const peek = await peekNextEntityId("ORDER", db);
      expect(peek.customId).toBe("ORD_3");
   });

   it("never consumes the sequence — repeated peeks agree", async () => {
      const db = makePeekDb(7);
      const a = await peekNextEntityId("SUPPLIER", db);
      const b = await peekNextEntityId("SUPPLIER", db);
      expect(a.customId).toBe("SUP_8");
      expect(b.customId).toBe("SUP_8");
   });
});
