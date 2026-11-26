import { prisma } from "./prisma";

export const DEFAULT_PREFIXES: Record<string, string> = {
   USER: "EP_",
   CUSTOMER: "CUS_",
   SUPPLIER: "SUP_",
   ORDER: "ORD_",
   PURCHASE: "PUR_",
   PRODUCT: "PROD_",
   CATEGORY: "CAT_",
   UNIT: "UNIT_",
   EXPENSE: "EXP_",
   ASSET: "AST_",
   ROLE: "ROLE_",
   BILLING: "BILL_",
   WAREHOUSE: "WH_",
   // Phase 3B (3.7): supplier payment ledger IDs (SPAY_1, SPAY_2, …).
   // No StoreSetting prefix column exists for this entity — the
   // schema plan deliberately keeps it on the default prefix.
   SUPPLIER_PAYMENT: "SPAY_",
   // Phase 4 (D2): purchase return IDs (PRET_1, PRET_2, …) — same
   // SPAY_ precedent: default prefix, no StoreSetting column.
   PURCHASE_RETURN: "PRET_",
};

export type EntityType =
   | "USER"
   | "CUSTOMER"
   | "SUPPLIER"
   | "ORDER"
   | "PURCHASE"
   | "PRODUCT"
   | "CATEGORY"
   | "UNIT"
   | "EXPENSE"
   | "ASSET"
   | "ROLE"
   | "BILLING"
   | "WAREHOUSE"
   | "SUPPLIER_PAYMENT"
   | "PURCHASE_RETURN";

/**
 * Retrieve the configured prefix for an entity type from StoreSetting
 */
export async function getEntityPrefix(entityType: EntityType, client?: any): Promise<string> {
   const db = client || prisma;
   try {
      const setting = await db.storeSetting.findUnique({ where: { id: "default" } });
      if (!setting) return DEFAULT_PREFIXES[entityType] || `${entityType}_`;

      const map: Record<EntityType, string> = {
         USER: setting.prefixEmployee || DEFAULT_PREFIXES.USER,
         CUSTOMER: setting.prefixCustomer || DEFAULT_PREFIXES.CUSTOMER,
         SUPPLIER: setting.prefixSupplier || DEFAULT_PREFIXES.SUPPLIER,
         ORDER: setting.prefixOrder || DEFAULT_PREFIXES.ORDER,
         PURCHASE: setting.prefixPurchase || DEFAULT_PREFIXES.PURCHASE,
         PRODUCT: setting.prefixProduct || DEFAULT_PREFIXES.PRODUCT,
         CATEGORY: setting.prefixCategory || DEFAULT_PREFIXES.CATEGORY,
         UNIT: setting.prefixUnit || DEFAULT_PREFIXES.UNIT,
         EXPENSE: setting.prefixExpense || DEFAULT_PREFIXES.EXPENSE,
         ASSET: setting.prefixAsset || DEFAULT_PREFIXES.ASSET,
         ROLE: setting.prefixRole || DEFAULT_PREFIXES.ROLE,
         BILLING: setting.prefixBilling || DEFAULT_PREFIXES.BILLING,
         WAREHOUSE: setting.prefixWarehouse || DEFAULT_PREFIXES.WAREHOUSE,
         SUPPLIER_PAYMENT: DEFAULT_PREFIXES.SUPPLIER_PAYMENT,
         PURCHASE_RETURN: DEFAULT_PREFIXES.PURCHASE_RETURN,
      };

      return map[entityType] || DEFAULT_PREFIXES[entityType] || `${entityType}_`;
   } catch {
      return DEFAULT_PREFIXES[entityType] || `${entityType}_`;
   }
}

// ── Phase 4: Invoice Number Prefix ───────────────────────────────────
//
// The invoice number shares the ORDER EntitySequence (existing
// design: ORD_126 ↔ INV_126 advance together, and Order.invoiceNo
// is @unique), so its uniqueness and continuity come from the
// same atomic counter. What Phase 4 adds is the PREFIX: until now
// generation hardcoded "INV_" and ignored the long-standing
// StoreSetting.invoicePrefix column. The stored convention for
// that column is the bare token ("INV", no separator — schema
// default, settings UI placeholder); the separator stays "_",
// exactly like every other identifier in the system, so today's
// output is unchanged: formatInvoiceNo(resolveInvoicePrefix(x), n).

export const DEFAULT_INVOICE_PREFIX = "INV";

/** Normalise a stored invoice prefix: trim, drop trailing separators, empty → "INV". */
export function resolveInvoicePrefix(raw: unknown): string {
   if (typeof raw !== "string") return DEFAULT_INVOICE_PREFIX;
   const cleaned = raw.trim().replace(/[\s_-]+$/, "");
   return cleaned === "" ? DEFAULT_INVOICE_PREFIX : cleaned;
}

/** The invoice number for an order sequence value, e.g. ("DEVX-INV", 126) → "DEVX-INV_126". */
export function formatInvoiceNo(prefix: string, seq: number): string {
   return `${resolveInvoicePrefix(prefix)}_${seq}`;
}

/** Read the configured invoice prefix server-side (pass the caller's transaction client so the read is consistent with the order write). */
export async function getInvoicePrefix(client?: any): Promise<string> {
   const db = client || prisma;
   try {
      const setting = await db.storeSetting.findUnique({ where: { id: "default" } });
      return resolveInvoicePrefix(setting?.invoicePrefix);
   } catch {
      return DEFAULT_INVOICE_PREFIX;
   }
}

/**
 * Phase 4 validation for the two prefix settings this phase owns
 * (prefixOrder, invoicePrefix), applied by the settings PUT
 * before anything is saved. Conventions follow the existing IDs:
 * letters, digits, hyphens and underscores only; max 20 chars
 * after trimming. An empty value is valid — the read paths fall
 * back to the defaults ("ORD_" / "INV"), so an empty prefix can
 * never produce a bare-number identifier.
 */
export const MAX_PREFIX_LENGTH = 20;
const PREFIX_PATTERN = /^[A-Za-z0-9_-]+$/;

export function validatePrefixSettingValue(
   value: unknown,
   fieldLabel: string,
): { ok: true } | { ok: false; message: string } {
   if (value === undefined || value === null) return { ok: true };
   if (typeof value !== "string") {
      return { ok: false, message: `${fieldLabel} must be a string.` };
   }
   const trimmed = value.trim();
   if (trimmed === "") return { ok: true };
   if (trimmed.length > MAX_PREFIX_LENGTH) {
      return {
         ok: false,
         message: `${fieldLabel} must be at most ${MAX_PREFIX_LENGTH} characters.`,
      };
   }
   if (!PREFIX_PATTERN.test(trimmed)) {
      return {
         ok: false,
         message: `${fieldLabel} may contain only letters, digits, hyphens and underscores.`,
      };
   }
   return { ok: true };
}

/**
 * Atomically generate the next sequential ID starting from 1 for an entity type,
 * with automatic collision prevention against existing records.
 */
export async function generateNextEntityId(
   entityType: EntityType,
   client?: any,
): Promise<{ customId: string; orderCode: string; seq: number; prefix: string }> {
   const db = client || prisma;

   const prefix = await getEntityPrefix(entityType, db);

   const modelMap: Record<EntityType, any> = {
      USER: db.user,
      CUSTOMER: db.customer,
      SUPPLIER: db.supplier,
      ORDER: db.order,
      PURCHASE: db.purchase,
      PRODUCT: db.product,
      CATEGORY: db.category,
      UNIT: db.unit,
      EXPENSE: db.expense,
      ASSET: db.asset,
      ROLE: db.role,
      // ID-01 fix: the Prisma model is BillingTransaction — the previous
      // `db.billingHistory` accessor did not exist, silently disabling
      // the collision check for billing IDs.
      BILLING: db.billingTransaction,
      WAREHOUSE: db.warehouse,
      SUPPLIER_PAYMENT: db.supplierPayment,
      PURCHASE_RETURN: db.purchaseReturn,
   };

   const sequence = await db.entitySequence.upsert({
      where: { entityType },
      update: { currentSeq: { increment: 1 } },
      create: { entityType, currentSeq: 1 },
   });

   let candidateSeq = sequence.currentSeq;
   let candidateId = `${prefix}${candidateSeq}`;
   const model = modelMap[entityType];

   if (model && typeof model.findFirst === "function") {
      const findCollision = () =>
         model.findFirst({
            where: {
               OR: [
                  { customId: candidateId },
                  ...(entityType === "ORDER"
                     ? [{ orderId: candidateId }, { orderCode: candidateId }]
                     : []),
               ],
            },
         });

      let exists = await findCollision();

      while (exists) {
         // ID-01 race fix: bump the shared counter with the same atomic
         // upsert-increment instead of a local increment + non-atomic
         // write-back, so two concurrent generators can never observe
         // and claim the same candidate sequence.
         const bumped = await db.entitySequence.upsert({
            where: { entityType },
            update: { currentSeq: { increment: 1 } },
            create: { entityType, currentSeq: candidateSeq + 1 },
         });
         candidateSeq = bumped.currentSeq;
         candidateId = `${prefix}${candidateSeq}`;
         exists = await findCollision();
      }
   }

   return {
      customId: candidateId,
      orderCode: candidateId,
      seq: candidateSeq,
      prefix,
   };
}

/**
 * OBS-B1 (Full Live QA Audit 2026-11-25): read-only preview of the ID
 * the NEXT created record of this type will receive.
 *
 * The order-create form previously guessed the next ID from the
 * latest existing row (max customId + 1), which disagrees with this
 * sequence whenever rows were seeded, deleted, or the counter was
 * ever out of sync — staff quoted the previewed number to customers
 * and the saved order carried a different one. This peek mirrors
 * generateNextEntityId exactly (same prefix source, same collision
 * rule) WITHOUT consuming the sequence: it reads the current counter
 * and walks forward past IDs that already exist. It is a preview,
 * not a reservation — a concurrent create can still claim the
 * number first, which is why the UI keeps its "assigned on save"
 * framing.
 */
export async function peekNextEntityId(
   entityType: EntityType,
   client?: any,
): Promise<{ customId: string; seq: number; prefix: string }> {
   const db = client || prisma;
   const prefix = await getEntityPrefix(entityType, db);

   const modelMap: Record<EntityType, any> = {
      USER: db.user,
      CUSTOMER: db.customer,
      SUPPLIER: db.supplier,
      ORDER: db.order,
      PURCHASE: db.purchase,
      PRODUCT: db.product,
      CATEGORY: db.category,
      UNIT: db.unit,
      EXPENSE: db.expense,
      ASSET: db.asset,
      ROLE: db.role,
      BILLING: db.billingTransaction,
      WAREHOUSE: db.warehouse,
      SUPPLIER_PAYMENT: db.supplierPayment,
      PURCHASE_RETURN: db.purchaseReturn,
   };

   const seqRow = await db.entitySequence.findUnique({
      where: { entityType },
   });
   let candidateSeq = (seqRow?.currentSeq ?? 0) + 1;
   let candidateId = `${prefix}${candidateSeq}`;

   const model = modelMap[entityType];
   if (model && typeof model.findFirst === "function") {
      const findCollision = () =>
         model.findFirst({
            where: {
               OR: [
                  { customId: candidateId },
                  ...(entityType === "ORDER"
                     ? [{ orderId: candidateId }, { orderCode: candidateId }]
                     : []),
               ],
            },
         });
      let exists = await findCollision();
      while (exists) {
         candidateSeq += 1;
         candidateId = `${prefix}${candidateSeq}`;
         exists = await findCollision();
      }
   }

   return { customId: candidateId, seq: candidateSeq, prefix };
}
