import { describe, it, expect } from "vitest";
import {
   generateNextEntityId,
   peekNextEntityId,
   getInvoicePrefix,
   resolveInvoicePrefix,
   formatInvoiceNo,
   validatePrefixSettingValue,
} from "@src/lib/idGenerator";

// Phase 4: Order ID + Invoice Number prefixes. The EntitySequence
// counter is keyed by entity type ONLY, so a prefix change must
// continue the count (ORD_125 → DEVX_126), never restart it, and
// previously issued IDs are never rewritten (generation only ever
// returns new strings). The fake below mirrors the real atomic
// upsert semantics: create at 1, increment afterwards.

function makeFakeDb(settings: any, existingIds: string[] = []) {
   const seqByEntity = new Map<string, number>();
   const existing = new Set(existingIds);
   const findFirst = async ({ where }: any) => {
      const wanted: string[] = (where.OR || []).map(
         (c: any) => c.customId || c.orderId || c.orderCode,
      );
      return wanted.some((id) => existing.has(id)) ? { customId: wanted[0] } : null;
   };
   const model = { findFirst };
   return {
      storeSetting: { findUnique: async () => settings },
      entitySequence: {
         upsert: async ({ where }: any) => {
            const key = where.entityType;
            const next = (seqByEntity.get(key) ?? 0) + 1;
            seqByEntity.set(key, next);
            return { entityType: key, currentSeq: next };
         },
         findUnique: async ({ where }: any) => {
            const v = seqByEntity.get(where.entityType);
            return v === undefined
               ? null
               : { entityType: where.entityType, currentSeq: v };
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
      purchaseReturn: model,
   } as any;
}

describe("order ID prefix — sequence continuity across a prefix change", () => {
   it("changing ORD_ to DEVX_ continues the counter instead of restarting it", async () => {
      const settings: any = { prefixOrder: "ORD_" };
      const db = makeFakeDb(settings);

      const first = await generateNextEntityId("ORDER", db);
      const second = await generateNextEntityId("ORDER", db);
      expect(first.customId).toBe("ORD_1");
      expect(second.customId).toBe("ORD_2");

      // The admin edits the prefix. The EntitySequence row is
      // keyed by entity type, so the counter is untouched.
      settings.prefixOrder = "DEVX_";
      const third = await generateNextEntityId("ORDER", db);
      expect(third.customId).toBe("DEVX_3");
      expect(third.seq).toBe(3);

      // Historical IDs are whatever was issued — generation never
      // rewrites them.
      expect(first.customId).toBe("ORD_1");
      expect(second.customId).toBe("ORD_2");
   });

   it("the default prefix applies when no prefix is stored", async () => {
      const db = makeFakeDb({});
      const gen = await generateNextEntityId("ORDER", db);
      expect(gen.customId).toBe("ORD_1");
   });

   it("collision walk still skips IDs that already exist under the new prefix", async () => {
      const settings: any = { prefixOrder: "DEVX_" };
      const db = makeFakeDb(settings, ["DEVX_1"]);
      const gen = await generateNextEntityId("ORDER", db);
      expect(gen.customId).toBe("DEVX_2");
   });

   it("peek previews the configured prefix without consuming the sequence", async () => {
      const settings: any = { prefixOrder: "DEVX_" };
      const db = makeFakeDb(settings);
      await generateNextEntityId("ORDER", db);
      const peek = await peekNextEntityId("ORDER", db);
      expect(peek.customId).toBe("DEVX_2");
      const gen = await generateNextEntityId("ORDER", db);
      expect(gen.customId).toBe("DEVX_2");
   });
});

describe("invoice prefix resolution + formatting", () => {
   it("defaults to INV for missing/empty values", () => {
      expect(resolveInvoicePrefix(undefined)).toBe("INV");
      expect(resolveInvoicePrefix(null)).toBe("INV");
      expect(resolveInvoicePrefix("")).toBe("INV");
      expect(resolveInvoicePrefix("   ")).toBe("INV");
      expect(resolveInvoicePrefix(42)).toBe("INV");
   });

   it("keeps custom tokens, trims, and strips trailing separators", () => {
      expect(resolveInvoicePrefix("ABN")).toBe("ABN");
      expect(resolveInvoicePrefix("  ABN  ")).toBe("ABN");
      expect(resolveInvoicePrefix("DEVX-INV")).toBe("DEVX-INV");
      expect(resolveInvoicePrefix("INV_")).toBe("INV");
      expect(resolveInvoicePrefix("ABN-")).toBe("ABN");
   });

   it("formats with the system separator and the shared order sequence", () => {
      expect(formatInvoiceNo("INV", 126)).toBe("INV_126");
      expect(formatInvoiceNo("ABN", 126)).toBe("ABN_126");
      expect(formatInvoiceNo("DEVX-INV", 126)).toBe("DEVX-INV_126");
      // Today's default output is byte-identical to the old hardcoded value.
      expect(formatInvoiceNo("INV", 6012)).toBe("INV_6012");
   });

   it("getInvoicePrefix reads the setting server-side, with safe fallbacks", async () => {
      await expect(
         getInvoicePrefix(makeFakeDb({ invoicePrefix: "ABN" })),
      ).resolves.toBe("ABN");
      await expect(getInvoicePrefix(makeFakeDb(null))).resolves.toBe("INV");
      await expect(
         getInvoicePrefix(makeFakeDb({ invoicePrefix: "" })),
      ).resolves.toBe("INV");
   });
});

describe("prefix settings validation", () => {
   it("accepts unset, empty, and conventional prefixes", () => {
      expect(validatePrefixSettingValue(undefined, "X").ok).toBe(true);
      expect(validatePrefixSettingValue("", "X").ok).toBe(true);
      expect(validatePrefixSettingValue("ORD_", "X").ok).toBe(true);
      expect(validatePrefixSettingValue("DEVX-", "X").ok).toBe(true);
      expect(validatePrefixSettingValue("DEVX-INV", "X").ok).toBe(true);
   });

   it("rejects invalid characters, over-length values, and non-strings", () => {
      expect(validatePrefixSettingValue("ORD !", "X").ok).toBe(false);
      expect(validatePrefixSettingValue("INV NO", "X").ok).toBe(false);
      expect(validatePrefixSettingValue("A".repeat(21), "X").ok).toBe(false);
      expect(validatePrefixSettingValue(42, "X").ok).toBe(false);
   });

   it("L-3: errors are field-specific (the label reaches the message)", () => {
      // The settings PUT runs this validator for all 14 prefix
      // fields with each field's own label, so the 400 response
      // names the offending field.
      const space = validatePrefixSettingValue("EM P", "Employee ID Prefix");
      expect(space.ok).toBe(false);
      if (!space.ok) expect(space.message).toContain("Employee ID Prefix");
      const symbol = validatePrefixSettingValue("WH#", "Warehouse ID Prefix");
      expect(symbol.ok).toBe(false);
      if (!symbol.ok) expect(symbol.message).toContain("Warehouse ID Prefix");
      const long = validatePrefixSettingValue(
         "P".repeat(21),
         "Purchase ID Prefix",
      );
      expect(long.ok).toBe(false);
      if (!long.ok) {
         expect(long.message).toContain("Purchase ID Prefix");
         expect(long.message).toContain("20");
      }
   });

   it("L-3: whitespace-only and boundary-length values stay valid", () => {
      // Whitespace-only trims to empty, which the read paths treat
      // as unset (default prefix) — valid by design.
      expect(validatePrefixSettingValue("   ", "X").ok).toBe(true);
      // Exactly at the 20-character maximum is valid.
      expect(validatePrefixSettingValue("A".repeat(20), "X").ok).toBe(true);
   });
});
