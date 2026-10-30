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
   | "BILLING";

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
      };

      return map[entityType] || DEFAULT_PREFIXES[entityType] || `${entityType}_`;
   } catch {
      return DEFAULT_PREFIXES[entityType] || `${entityType}_`;
   }
}

/**
 * Atomically generate the next sequential ID starting from 1 for an entity type,
 * with automatic collision prevention against existing records.
 */
export async function generateNextEntityId(
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
      BILLING: db.billingHistory,
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
      let exists = await model.findFirst({
         where: {
            OR: [
               { customId: candidateId },
               ...(entityType === "ORDER" ? [{ orderId: candidateId }] : []),
            ],
         },
      });

      while (exists) {
         candidateSeq++;
         candidateId = `${prefix}${candidateSeq}`;
         exists = await model.findFirst({
            where: {
               OR: [
                  { customId: candidateId },
                  ...(entityType === "ORDER" ? [{ orderId: candidateId }] : []),
               ],
            },
         });
      }

      if (candidateSeq !== sequence.currentSeq) {
         await db.entitySequence.update({
            where: { entityType },
            data: { currentSeq: candidateSeq },
         });
      }
   }

   return {
      customId: candidateId,
      seq: candidateSeq,
      prefix,
   };
}
