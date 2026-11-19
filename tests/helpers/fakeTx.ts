// In-memory Prisma-shaped fake for the stock engine tests.
//
// The engine functions in src/lib/stock.ts take the caller's
// transaction client and use a small surface: product /
// productVariant find+update with { increment | decrement },
// stockMovement.create, notification.create, and warehouse-stock
// reads. This fake implements exactly that surface over Maps, so
// tests can assert both the recorded calls and the final quantities
// — no database involved.

export interface FakeProduct {
   id: string;
   productName: string;
   quantity: number;
   allowNegativeStock?: boolean;
   trackInventory?: boolean;
   lowStockAlert?: number | null;
   productType?: string;
}

export interface FakeVariant {
   id: string;
   productId: string;
   variantName: string;
   quantity: number;
   lowStockAlert?: number | null;
}

export function makeFakeTx(init: {
   products?: FakeProduct[];
   variants?: FakeVariant[];
}) {
   const products = new Map<string, any>(
      (init.products || []).map((p) => [
         p.id,
         {
            allowNegativeStock: false,
            trackInventory: true,
            lowStockAlert: 10,
            ...p,
         },
      ]),
   );
   const variants = new Map<string, any>(
      (init.variants || []).map((v) => [
         v.id,
         { lowStockAlert: 5, ...v },
      ]),
   );
   const movements: any[] = [];
   const notifications: any[] = [];

   const applyDelta = (record: any, data: any) => {
      if (data?.quantity?.increment !== undefined) {
         record.quantity += data.quantity.increment;
      } else if (data?.quantity?.decrement !== undefined) {
         record.quantity -= data.quantity.decrement;
      } else if (typeof data?.quantity === "number") {
         record.quantity = data.quantity;
      }
      return record;
   };

   const tx: any = {
      product: {
         findMany: async ({ where }: any) => {
            const ids: string[] = where?.id?.in || [];
            return ids
               .filter((id) => products.has(id))
               .map((id) => ({ ...products.get(id) }));
         },
         findUnique: async ({ where }: any) =>
            products.has(where.id) ? { ...products.get(where.id) } : null,
         update: async ({ where, data }: any) => {
            const record = products.get(where.id);
            if (!record) throw new Error(`product ${where.id} not found`);
            return { ...applyDelta(record, data) };
         },
      },
      productVariant: {
         findMany: async ({ where }: any) => {
            const ids: string[] = where?.id?.in || [];
            return ids
               .filter((id) => variants.has(id))
               .map((id) => ({ ...variants.get(id) }));
         },
         findUnique: async ({ where }: any) =>
            variants.has(where.id) ? { ...variants.get(where.id) } : null,
         update: async ({ where, data }: any) => {
            const record = variants.get(where.id);
            if (!record) throw new Error(`variant ${where.id} not found`);
            return { ...applyDelta(record, data) };
         },
      },
      stockMovement: {
         create: async ({ data }: any) => {
            movements.push(data);
            return data;
         },
      },
      notification: {
         create: async ({ data }: any) => {
            notifications.push(data);
            return data;
         },
      },
      productWarehouseStock: {
         findMany: async () => [],
         update: async () => ({}),
         create: async () => ({}),
      },
      warehouse: {
         findFirst: async () => null,
      },
      storeSetting: {
         findUnique: async () => null,
      },
   };

   return {
      tx,
      movements,
      notifications,
      productQty: (id: string) => products.get(id)?.quantity,
      variantQty: (id: string) => variants.get(id)?.quantity,
   };
}
