import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import {
   loadStockSettings,
   deductStockForItems,
   addStockForPurchaseItems,
   InsufficientStockError,
} from "@src/lib/stock";
import { lockOrderRow } from "@src/lib/orderLock";
import {
   loadDecreaseStockOn,
   orderReachesTrigger,
} from "@src/lib/productSettings";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
} from "@src/lib/audit";
import { deleteUploadedFiles } from "@src/lib/uploadedFiles";
import { selectCascadeDeletedVariantIds } from "@src/lib/binRestore";
import {
   lockPurchaseRow,
   computeNetPurchaseQuantities,
} from "@src/lib/purchaseReturns";

export async function GET(request: NextRequest) {
   // R-2 fix (Final Review): Recycle Bin contents are deleted business
   // records — reading them requires the same administrator
   // authorization as the bin mutations in POST below, not just any
   // login. Unauthenticated requests still receive 401 from the guard.
   const gate = await requireAdmin(request);
   if (gate instanceof NextResponse) return gate;

   // P4-2 DOCUMENTED EXCEPTION — this GET stays unbounded by design:
   // it merges TEN entity types into one list, and the Bin page
   // renders that complete merged set in a single view with per-type
   // tabs and counts derived from the full set. Server-paginating a
   // merged cross-entity union cannot preserve those tabs/counts
   // without an API redesign (per-type endpoints), and truncating
   // would silently hide deleted records from an admin recovery
   // screen — the worst failure mode for a recycle bin. The cost is
   // bounded in practice: the route is admin-only, every scan below
   // is select-narrowed to five display fields, and a single shop's
   // bin holds deleted rows only. Revisit if a deployment's bin
   // grows into the tens of thousands.

   try {
      const [
         products,
         orders,
         suppliers,
         purchases,
         expenses,
         assets,
         customers,
         categories,
         units,
         warehouses,
      ] = await Promise.all([
         prisma.product.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, productName: true, deletedAt: true, updatedAt: true },
         }),
         prisma.order.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, orderId: true, total: true, deletedAt: true, updatedAt: true },
         }),
         prisma.supplier.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, name: true, deletedAt: true, updatedAt: true },
         }),
         prisma.purchase.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, invoice: true, total: true, deletedAt: true, updatedAt: true },
         }),
         prisma.expense.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, type: true, amount: true, deletedAt: true, updatedAt: true },
         }),
         prisma.asset.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, name: true, value: true, deletedAt: true, updatedAt: true },
         }),
         prisma.customer.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, name: true, phone: true, deletedAt: true, updatedAt: true },
         }),
         prisma.category.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, name: true, deletedAt: true, updatedAt: true },
         }),
         prisma.unit.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, name: true, deletedAt: true, updatedAt: true },
         }),
         // Rider D-0a (completes P2-1): warehouse soft-delete landed
         // in Phase C1, but the Bin had no warehouse branch, so a
         // deleted warehouse had no restore path. It is listed here
         // exactly like the other soft-deleted entities.
         prisma.warehouse.findMany({
            where: { isDeleted: true },
            select: { id: true, customId: true, name: true, deletedAt: true, updatedAt: true },
         }),
      ]);

      const items = [
         ...products.map((p) => ({
            id: p.id,
            customId: p.customId,
            type: "product",
            name: p.productName,
            deletedAt: p.deletedAt,
            updatedAt: p.updatedAt,
         })),
         ...orders.map((o) => ({
            id: o.id,
            customId: o.customId || o.orderId,
            type: "order",
            name: `Order ${o.orderId || o.customId}`,
            deletedAt: o.deletedAt,
            updatedAt: o.updatedAt,
         })),
         ...suppliers.map((s) => ({
            id: s.id,
            customId: s.customId,
            type: "supplier",
            name: s.name,
            deletedAt: s.deletedAt,
            updatedAt: s.updatedAt,
         })),
         ...purchases.map((p) => ({
            id: p.id,
            customId: p.customId || p.invoice,
            type: "purchase",
            name: `Purchase ${p.invoice || p.customId}`,
            deletedAt: p.deletedAt,
            updatedAt: p.updatedAt,
         })),
         ...expenses.map((e) => ({
            id: e.id,
            customId: e.customId,
            type: "expense",
            name: `Expense: ${e.type} (৳${e.amount})`,
            deletedAt: e.deletedAt,
            updatedAt: e.updatedAt,
         })),
         ...assets.map((a) => ({
            id: a.id,
            customId: a.customId,
            type: "asset",
            name: `Asset: ${a.name}`,
            deletedAt: a.deletedAt,
            updatedAt: a.updatedAt,
         })),
         ...customers.map((c) => ({
            id: c.id,
            customId: c.customId,
            type: "customer",
            name: `Customer: ${c.name} (${c.phone || "No phone"})`,
            deletedAt: c.deletedAt,
            updatedAt: c.updatedAt,
         })),
         ...categories.map((cat) => ({
            id: cat.id,
            customId: cat.customId,
            type: "category",
            name: `Category: ${cat.name}`,
            deletedAt: cat.deletedAt,
            updatedAt: cat.updatedAt,
         })),
         ...units.map((u) => ({
            id: u.id,
            customId: u.customId,
            type: "unit",
            name: `Unit: ${u.name}`,
            deletedAt: u.deletedAt,
            updatedAt: u.updatedAt,
         })),
         ...warehouses.map((w) => ({
            id: w.id,
            customId: w.customId,
            type: "warehouse",
            name: `Warehouse: ${w.name}`,
            deletedAt: w.deletedAt,
            updatedAt: w.updatedAt,
         })),
         // BIN-01 fix: INACTIVE/SUSPENDED users are NOT deleted
         // records and no longer appear in the Recycle Bin. The User
         // model has no soft-delete flag; account status is managed
         // from User Management. Previously, "restoring" a suspended
         // employee from the bin silently reactivated them as ACTIVE.
      ];

      return NextResponse.json(items);
   } catch {
      return NextResponse.json({ error: "Failed to fetch bin items" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   // SEC-01 fix: restore and (especially) permanent deletion from the
   // recycle bin are administrator-only operations.
   const gate = await requireAdmin(request);
   if (gate instanceof NextResponse) return gate;

   try {
      const body = await request.json();
      const type = (body.type || body.entity || "").toLowerCase();
      const action = body.action === "permanent_delete" ? "delete" : body.action;
      const { id } = body;

      if (!type || !id || !action) {
         return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
      }

      // Phase 4 (D2): purchase returns are NEVER bin records — the
      // Bin GET above does not enumerate them, and restoring one
      // from here must not reapply its stock/settlement effects.
      // A deleted return stays reversed; manage returns from the
      // purchase detail instead.
      if (type === "purchase_return" || type === "purchasereturn") {
         return NextResponse.json(
            {
               error:
                  "Purchase returns cannot be restored or permanently deleted from the Recycle Bin. A deleted return is fully reversed and stays reversed.",
            },
            { status: 400 },
         );
      }

      // 1. USER HANDLING
      if (type === "user") {
         if (action === "restore") {
            // BIN-01 fix: users are never soft-deleted, so there is
            // nothing to "restore" — and blindly setting ACTIVE here
            // used to reactivate accounts that had been suspended on
            // purpose. Status changes belong to User Management.
            return NextResponse.json(
               {
                  error:
                     "Users are not deleted records. Manage account status (Active / Inactive / Suspended) from User Management.",
               },
               { status: 400 },
            );
         } else if (action === "delete") {
            await prisma.$transaction([
               prisma.order.updateMany({ where: { employeeId: id }, data: { employeeId: null } }),
               prisma.purchase.updateMany({ where: { createdById: id }, data: { createdById: null } }),
               prisma.expense.updateMany({ where: { createdById: id }, data: { createdById: null } }),
               prisma.user.delete({ where: { id } }),
            ]);
            return NextResponse.json({ message: "User permanently deleted" });
         }
      }

      // 2. ORDER HANDLING
      if (type === "order") {
         if (action === "restore") {
            // BIN-02/ORD-02 fix: soft-deleting the order released its
            // stock, so restoring must deduct it again (validated,
            // same transaction) — the exact mirror of the delete.
            // Phase 1B: the mirror is the recorded stockDeducted
            // flag plus the Decrease Stock On trigger — restore
            // re-deducts only when the order is not already marked
            // deducted AND its (unchanged) status has reached the
            // trigger; a terminal order, or one deleted before its
            // trigger, comes back holding nothing.
            await prisma.$transaction(async (tx) => {
               // Lock first, as in the other order stock writers.
               await lockOrderRow(tx, id);
               const order = await tx.order.findUnique({
                  where: { id },
                  include: { items: true },
               });
               if (!order) throw new Error("Order not found");
               let restoredDeducted = Boolean(order.stockDeducted);
               if (order.isDeleted && !order.stockDeducted) {
                  const decreaseStockOn = await loadDecreaseStockOn(tx);
                  if (orderReachesTrigger(order.status, decreaseStockOn)) {
                     const stockSettings = await loadStockSettings(tx);
                     await deductStockForItems(
                        tx,
                        order.items
                           .filter((it) => it.productId)
                           .map((it) => ({
                              productId: it.productId as string,
                              quantity: it.quantity,
                              variantId: it.variantId,
                           })),
                        {
                           settings: stockSettings,
                           orderId: order.id,
                           note: `Order ${order.orderId || order.customId} restored from bin — stock deducted`,
                        },
                     );
                     restoredDeducted = true;
                  }
               }
               await tx.order.update({
                  where: { id },
                  data: {
                     isDeleted: false,
                     deletedAt: null,
                     stockDeducted: restoredDeducted,
                  },
               });

               // Phase 4 (D1): audit in the same transaction.
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "RESTORE",
                  entityType: "ORDER",
                  entityId: order.id,
                  entityCustomId: order.orderId || order.customId,
                  summary: `Order ${order.orderId || order.customId} restored from bin`,
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Order restored successfully" });
         } else if (action === "delete") {
            // Interactive form (was an array transaction) so the
            // permanent deletion is audited in the same transaction.
            await prisma.$transaction(async (tx) => {
               const order = await tx.order.findUnique({
                  where: { id },
                  select: { id: true, orderId: true, customId: true },
               });
               await tx.orderItem.deleteMany({ where: { orderId: id } });
               await tx.order.delete({ where: { id } });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "DELETE",
                  entityType: "ORDER",
                  entityId: id,
                  entityCustomId: order?.orderId || order?.customId || null,
                  summary: `Order ${order?.orderId || order?.customId || id} permanently deleted from bin`,
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Order permanently deleted" });
         }
      }

      // 3. PURCHASE HANDLING
      if (type === "purchase") {
         if (action === "restore") {
            // PUR-03 mirror: soft-deleting reversed the purchase's
            // stock, so restoring re-adds it in the same transaction.
            // B2-1 (audit C-11 / P1-3): the re-add uses the NET
            // quantities (purchased − live returns), the exact
            // mirror of the net reversal the purchase DELETE now
            // performs — re-adding gross would resurrect units the
            // return flow already removed. The Purchase-row lock is
            // taken first, the same discipline as the delete.
            await prisma.$transaction(async (tx) => {
               await lockPurchaseRow(tx, id);
               const purchase = await tx.purchase.findUnique({
                  where: { id },
                  include: { items: true },
               });
               if (!purchase) throw new Error("Purchase not found");
               let returnedUnits = 0;
               if (purchase.isDeleted) {
                  const liveReturns = await tx.purchaseReturn.findMany({
                     where: { purchaseId: id, isDeleted: false },
                     select: { items: { select: { productId: true, variantId: true, quantity: true } } },
                  });
                  const returnedItems = liveReturns.flatMap((r) => r.items);
                  returnedUnits = returnedItems.reduce(
                     (sum, it) => sum + (Number(it.quantity) || 0),
                     0,
                  );
                  await addStockForPurchaseItems(
                     tx,
                     computeNetPurchaseQuantities(purchase.items, returnedItems),
                     {
                        purchaseId: purchase.id,
                        note: `Purchase ${purchase.customId} restored from bin — stock re-added`,
                     },
                  );
               }
               await tx.purchase.update({
                  where: { id },
                  data: { isDeleted: false, deletedAt: null },
               });

               // Phase 4 (D1): audit in the same transaction.
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "RESTORE",
                  entityType: "PURCHASE",
                  entityId: purchase.id,
                  entityCustomId: purchase.customId,
                  summary:
                     `Purchase ${purchase.customId} restored from bin — stock re-added` +
                     (returnedUnits > 0
                        ? ` (net of ${returnedUnits} returned unit(s))`
                        : ""),
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Purchase restored successfully" });
         } else if (action === "delete") {
            // B2-1 (audit C-11 / P1-3): FK finding — PurchaseReturn
            // .purchase is onDelete: Restrict and PurchaseReturnItem
            // .purchaseItem is Restrict too, and Restrict applies to
            // the ROW, not the soft-delete flag: ANY PurchaseReturn
            // referencing this purchase — live or already
            // soft-deleted — blocks the hard delete (previously a
            // raw 500). Count them first, inside the transaction,
            // and answer a clean 409 instead.
            const result = await prisma.$transaction(async (tx) => {
               const purchase = await tx.purchase.findUnique({
                  where: { id },
                  select: { id: true, customId: true },
               });
               const returnCount = await tx.purchaseReturn.count({
                  where: { purchaseId: id },
               });
               if (returnCount > 0) return { blocked: true, returnCount, purchase };
               await tx.purchaseAttachment.deleteMany({ where: { purchaseId: id } });
               await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
               await tx.purchase.delete({ where: { id } });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "DELETE",
                  entityType: "PURCHASE",
                  entityId: id,
                  entityCustomId: purchase?.customId || null,
                  summary: `Purchase ${purchase?.customId || id} permanently deleted from bin`,
                  ...requestAuditContext(request),
               });
               return { blocked: false, returnCount: 0, purchase };
            });
            if (result.blocked) {
               return NextResponse.json(
                  {
                     error:
                        `This purchase cannot be permanently deleted because it has ${result.returnCount} purchase return record(s) linked to it. The returns must be removed first — a purchase with return history is kept for the audit trail.`,
                  },
                  { status: 409 },
               );
            }
            return NextResponse.json({ message: "Purchase permanently deleted" });
         }
      }

      // 4. SUPPLIER HANDLING
      if (type === "supplier") {
         if (action === "restore") {
            // P2-4: audited in the same transaction, mirroring the
            // expense/product bin pattern.
            await prisma.$transaction(async (tx) => {
               const supplier = await tx.supplier.findUnique({
                  where: { id },
                  select: { id: true, customId: true, name: true },
               });
               if (!supplier) throw new Error("Supplier not found");
               await tx.supplier.update({
                  where: { id },
                  data: { isDeleted: false, deletedAt: null },
               });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "RESTORE",
                  entityType: "SUPPLIER",
                  entityId: supplier.id,
                  entityCustomId: supplier.customId,
                  summary: `Supplier ${supplier.customId || supplier.name} restored from bin`,
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Supplier restored successfully" });
         } else if (action === "delete") {
            await prisma.$transaction(async (tx) => {
               const supplier = await tx.supplier.findUnique({
                  where: { id },
                  select: { id: true, customId: true, name: true },
               });
               if (!supplier) throw new Error("Supplier not found");
               await tx.purchase.updateMany({ where: { supplierId: id }, data: { supplierId: null } });
               await tx.supplier.delete({ where: { id } });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "DELETE",
                  entityType: "SUPPLIER",
                  entityId: supplier.id,
                  entityCustomId: supplier.customId,
                  summary: `Supplier ${supplier.customId || supplier.name} permanently deleted from bin`,
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Supplier permanently deleted" });
         }
      }

      // 5. PRODUCT HANDLING
      if (type === "product") {
         if (action === "restore") {
            await prisma.$transaction(async (tx) => {
               const product = await tx.product.findUnique({
                  where: { id },
                  select: {
                     id: true,
                     customId: true,
                     productName: true,
                     deletedAt: true,
                  },
               });
               if (!product) throw new Error("Product not found");
               // P0-2 (audit C-2): product DELETE cascade-deleted
               // the then-live variants under the product's own
               // `deletedAt` stamp. Restore exactly those variants
               // with the product — variants deleted individually
               // at another time (different stamp) stay deleted.
               // The product's quantity was never changed by the
               // delete, so restoring the same variant set makes
               // Σ live variant quantities equal it again.
               const variants = await tx.productVariant.findMany({
                  where: { productId: id },
                  select: { id: true, isDeleted: true, deletedAt: true },
               });
               const cascadeVariantIds = selectCascadeDeletedVariantIds(
                  product.deletedAt,
                  variants,
               );
               if (cascadeVariantIds.length > 0) {
                  await tx.productVariant.updateMany({
                     where: { id: { in: cascadeVariantIds } },
                     data: { isDeleted: false, deletedAt: null },
                  });
               }
               await tx.product.update({
                  where: { id },
                  data: { isDeleted: false, deletedAt: null },
               });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "RESTORE",
                  entityType: "PRODUCT",
                  entityId: product.id,
                  entityCustomId: product.customId,
                  summary:
                     `Product ${product.customId || product.productName} restored from bin` +
                     (cascadeVariantIds.length > 0
                        ? ` — ${cascadeVariantIds.length} variant(s) restored`
                        : ""),
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Product restored successfully" });
         } else if (action === "delete") {
            // Fix instruction #31 / DB-01 / DB-04: permanent product
            // deletion must not destroy the StockMovement audit trail.
            // StockMovement.product is a required FK, so a product
            // with movement history cannot be removed without erasing
            // that history — reject safely instead. Bundle-component
            // links (configuration, not history) are cleaned up first
            // so they no longer block deletion with a raw FK error.
            // The history check, deletion, and D1 audit row share one
            // transaction; uploaded-file cleanup remains best-effort
            // after the database commit.
            const result = await prisma.$transaction(async (tx) => {
               const product = await tx.product.findUnique({
                  where: { id },
                  select: {
                     id: true,
                     customId: true,
                     productName: true,
                     images: true,
                     variants: { select: { image: true } },
                  },
               });
               if (!product) throw new Error("Product not found");

               const movementCount = await tx.stockMovement.count({
                  where: { productId: id },
               });
               if (movementCount > 0) return { blocked: true, product };

               await tx.productBundleItem.deleteMany({
                  where: { componentProductId: id },
               });
               await tx.product.delete({ where: { id } });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "DELETE",
                  entityType: "PRODUCT",
                  entityId: product.id,
                  entityCustomId: product.customId,
                  summary: `Product ${product.customId || product.productName} permanently deleted from bin`,
                  ...requestAuditContext(request),
               });
               return { blocked: false, product };
            });
            if (result.blocked) {
               return NextResponse.json(
                  {
                     error:
                        "This product has stock movement history and cannot be permanently deleted without destroying the inventory audit trail. Keep it in the Recycle Bin (soft-deleted) instead.",
                  },
                  { status: 409 },
               );
            }
            // Phase 4 (D8): the record is gone for good — remove
            // its uploaded image files too, so permanent deletion
            // doesn't leave orphans in UPLOAD_DIR. (Soft delete
            // keeps files: a restored product needs its images.)
            const urls = [
               ...((result.product.images as any[]) || []),
               ...(result.product.variants || []).map((v) => v.image),
            ].filter(Boolean);
            if (urls.length > 0) await deleteUploadedFiles(urls);
            return NextResponse.json({ message: "Product permanently deleted" });
         }
      }

      // 6. EXPENSE HANDLING
      if (type === "expense") {
         if (action === "restore") {
            // Follow-up round: audited in the same transaction,
            // mirroring the product/order/purchase bin pattern
            // (expense bin ops were the remaining unaudited pair).
            await prisma.$transaction(async (tx) => {
               const expense = await tx.expense.findUnique({
                  where: { id },
                  select: { id: true, customId: true, type: true },
               });
               if (!expense) throw new Error("Expense not found");
               await tx.expense.update({
                  where: { id },
                  data: { isDeleted: false, deletedAt: null },
               });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "RESTORE",
                  entityType: "EXPENSE",
                  entityId: expense.id,
                  entityCustomId: expense.customId,
                  summary: `Expense ${expense.customId || expense.type} restored from bin`,
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Expense restored successfully" });
         } else if (action === "delete") {
            await prisma.$transaction(async (tx) => {
               const expense = await tx.expense.findUnique({
                  where: { id },
                  select: { id: true, customId: true, type: true },
               });
               if (!expense) throw new Error("Expense not found");
               await tx.expense.delete({ where: { id } });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "DELETE",
                  entityType: "EXPENSE",
                  entityId: expense.id,
                  entityCustomId: expense.customId,
                  summary: `Expense ${expense.customId || expense.type} permanently deleted from bin`,
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Expense permanently deleted" });
         }
      }

      // 7. ASSET HANDLING
      if (type === "asset") {
         if (action === "restore") {
            // P2-4: audited in the same transaction, mirroring the
            // expense/product bin pattern.
            await prisma.$transaction(async (tx) => {
               const asset = await tx.asset.findUnique({
                  where: { id },
                  select: { id: true, customId: true, name: true },
               });
               if (!asset) throw new Error("Asset not found");
               await tx.asset.update({
                  where: { id },
                  data: { isDeleted: false, deletedAt: null },
               });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "RESTORE",
                  entityType: "ASSET",
                  entityId: asset.id,
                  entityCustomId: asset.customId,
                  summary: `Asset ${asset.customId || asset.name} restored from bin`,
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Asset restored successfully" });
         } else if (action === "delete") {
            await prisma.$transaction(async (tx) => {
               const asset = await tx.asset.findUnique({
                  where: { id },
                  select: { id: true, customId: true, name: true },
               });
               if (!asset) throw new Error("Asset not found");
               await tx.asset.delete({ where: { id } });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "DELETE",
                  entityType: "ASSET",
                  entityId: asset.id,
                  entityCustomId: asset.customId,
                  summary: `Asset ${asset.customId || asset.name} permanently deleted from bin`,
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Asset permanently deleted" });
         }
      }

      // 8. CUSTOMER HANDLING
      if (type === "customer") {
         if (action === "restore") {
            // P2-4: audited in the same transaction, mirroring the
            // expense/product bin pattern.
            await prisma.$transaction(async (tx) => {
               const customer = await tx.customer.findUnique({
                  where: { id },
                  select: { id: true, customId: true, name: true },
               });
               if (!customer) throw new Error("Customer not found");
               await tx.customer.update({
                  where: { id },
                  data: { isDeleted: false, deletedAt: null },
               });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "RESTORE",
                  entityType: "CUSTOMER",
                  entityId: customer.id,
                  entityCustomId: customer.customId,
                  summary: `Customer ${customer.customId || customer.name} restored from bin`,
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Customer restored successfully" });
         } else if (action === "delete") {
            await prisma.$transaction(async (tx) => {
               const customer = await tx.customer.findUnique({
                  where: { id },
                  select: { id: true, customId: true, name: true },
               });
               if (!customer) throw new Error("Customer not found");
               await tx.order.updateMany({ where: { customerId: id }, data: { customerId: null } });
               await tx.customer.delete({ where: { id } });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "DELETE",
                  entityType: "CUSTOMER",
                  entityId: customer.id,
                  entityCustomId: customer.customId,
                  summary: `Customer ${customer.customId || customer.name} permanently deleted from bin`,
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Customer permanently deleted" });
         }
      }

      // 9. CATEGORY HANDLING
      if (type === "category") {
         if (action === "restore") {
            // P2-4: audited in the same transaction, mirroring the
            // expense/product bin pattern.
            await prisma.$transaction(async (tx) => {
               const category = await tx.category.findUnique({
                  where: { id },
                  select: { id: true, customId: true, name: true },
               });
               if (!category) throw new Error("Category not found");
               await tx.category.update({
                  where: { id },
                  data: { isDeleted: false, deletedAt: null },
               });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "RESTORE",
                  entityType: "CATEGORY",
                  entityId: category.id,
                  entityCustomId: category.customId,
                  summary: `Category ${category.customId || category.name} restored from bin`,
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Category restored successfully" });
         } else if (action === "delete") {
            await prisma.$transaction(async (tx) => {
               const category = await tx.category.findUnique({
                  where: { id },
                  select: { id: true, customId: true, name: true },
               });
               if (!category) throw new Error("Category not found");
               await tx.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
               await tx.category.delete({ where: { id } });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "DELETE",
                  entityType: "CATEGORY",
                  entityId: category.id,
                  entityCustomId: category.customId,
                  summary: `Category ${category.customId || category.name} permanently deleted from bin`,
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Category permanently deleted" });
         }
      }

      // 10. UNIT HANDLING
      if (type === "unit") {
         if (action === "restore") {
            // P2-4: audited in the same transaction, mirroring the
            // expense/product bin pattern.
            await prisma.$transaction(async (tx) => {
               const unit = await tx.unit.findUnique({
                  where: { id },
                  select: { id: true, customId: true, name: true },
               });
               if (!unit) throw new Error("Unit not found");
               await tx.unit.update({
                  where: { id },
                  data: { isDeleted: false, deletedAt: null },
               });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "RESTORE",
                  entityType: "UNIT",
                  entityId: unit.id,
                  entityCustomId: unit.customId,
                  summary: `Unit ${unit.customId || unit.name} restored from bin`,
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Unit restored successfully" });
         } else if (action === "delete") {
            await prisma.$transaction(async (tx) => {
               const unit = await tx.unit.findUnique({
                  where: { id },
                  select: { id: true, customId: true, name: true },
               });
               if (!unit) throw new Error("Unit not found");
               await tx.unit.delete({ where: { id } });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "DELETE",
                  entityType: "UNIT",
                  entityId: unit.id,
                  entityCustomId: unit.customId,
                  summary: `Unit ${unit.customId || unit.name} permanently deleted from bin`,
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Unit permanently deleted" });
         }
      }

      // 11. WAREHOUSE HANDLING (rider D-0a, completes P2-1)
      if (type === "warehouse") {
         if (action === "restore") {
            // Audited in the same transaction, mirroring the
            // CUSTOMER/SUPPLIER bin pattern above.
            await prisma.$transaction(async (tx) => {
               const warehouse = await tx.warehouse.findUnique({
                  where: { id },
                  select: { id: true, customId: true, name: true },
               });
               if (!warehouse) throw new Error("Warehouse not found");
               await tx.warehouse.update({
                  where: { id },
                  data: { isDeleted: false, deletedAt: null },
               });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "RESTORE",
                  entityType: "WAREHOUSE",
                  entityId: warehouse.id,
                  entityCustomId: warehouse.customId,
                  summary: `Warehouse ${warehouse.customId || warehouse.name} restored from bin`,
                  ...requestAuditContext(request),
               });
            });
            return NextResponse.json({ message: "Warehouse restored successfully" });
         } else if (action === "delete") {
            // Permanent delete respects the SAME guards as the
            // warehouse DELETE route (warehouses/[id]): the default
            // warehouse cannot be deleted, and a warehouse whose
            // stock mirror does not sum to zero cannot be deleted.
            // The guards run inside the transaction and answer a
            // clean 409, mirroring the purchase/product blocked
            // pattern above.
            const result = await prisma.$transaction(async (tx) => {
               const warehouse = await tx.warehouse.findUnique({
                  where: { id },
                  select: { id: true, customId: true, name: true, isDefault: true },
               });
               if (!warehouse) throw new Error("Warehouse not found");
               if (warehouse.isDefault) {
                  return { blocked: "default" as const, heldUnits: 0, warehouse };
               }
               const stockAgg = await tx.productWarehouseStock.aggregate({
                  where: { warehouseId: id },
                  _sum: { quantity: true },
               });
               const heldUnits = Number(stockAgg._sum.quantity || 0);
               if (heldUnits !== 0) {
                  return { blocked: "stock" as const, heldUnits, warehouse };
               }
               await tx.warehouse.delete({ where: { id } });
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "DELETE",
                  entityType: "WAREHOUSE",
                  entityId: warehouse.id,
                  entityCustomId: warehouse.customId,
                  summary: `Warehouse ${warehouse.customId || warehouse.name} permanently deleted from bin`,
                  ...requestAuditContext(request),
               });
               return { blocked: null, heldUnits: 0, warehouse };
            });
            if (result.blocked === "default") {
               return NextResponse.json(
                  {
                     error:
                        "Cannot delete the default warehouse. Set another warehouse as default first.",
                  },
                  { status: 409 },
               );
            }
            if (result.blocked === "stock") {
               return NextResponse.json(
                  {
                     error: `Warehouse still holds stock (${result.heldUnits} units in the warehouse mirror). Adjust or move that stock before deleting.`,
                  },
                  { status: 409 },
               );
            }
            return NextResponse.json({ message: "Warehouse permanently deleted" });
         }
      }

      return NextResponse.json({ error: "Unsupported entity type or action" }, { status: 400 });
   } catch (error: any) {
      if (error instanceof InsufficientStockError) {
         return NextResponse.json(
            { error: "Insufficient stock", message: error.message },
            { status: 400 },
         );
      }
      console.error("POST /api/bin error:", error);
      return NextResponse.json({ error: "Failed to process bin item" }, { status: 500 });
   }
}
