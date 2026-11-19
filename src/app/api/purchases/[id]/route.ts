import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import {
   reverseStockForPurchaseItems,
   findVariantlessVariableLine,
   StockReversalUnsafeError,
} from "@src/lib/stock";
import { lockPurchaseRow } from "@src/lib/purchaseReturns";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
   buildChanges,
} from "@src/lib/audit";

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const { id } = await params;
   try {
      const purchase = await prisma.purchase.findFirst({
         where: {
            OR: [{ id }, { customId: id }, { invoice: id }],
         },
         include: {
            supplier: true,
            createdBy: { select: { id: true, name: true, email: true } },
            items: {
               include: {
                  product: true,
                  variant: {
                     select: { id: true, variantName: true, sku: true, attributes: true, quantity: true },
                  },
               },
            },
            attachments: true,
         },
      });

      if (!purchase || purchase.isDeleted) {
         return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
      }

      return NextResponse.json(purchase);
   } catch {
      return NextResponse.json({ error: "Failed to fetch purchase" }, { status: 500 });
   }
}

export async function PUT(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, ["purchases", "purchase", "purchase_update"]);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      const body = await request.json();

      const existing = await prisma.purchase.findUnique({
         where: { id },
         include: { items: true },
      });

      if (!existing || existing.isDeleted) {
         return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
      }

      const safeMoney = (value: any) => {
         const n = Number(value);
         return Number.isFinite(n) ? Math.max(0, n) : 0;
      };

      // Validate supplier reference when one is supplied.
      if (body.supplierId) {
         const supplier = await prisma.supplier.findUnique({
            where: { id: body.supplierId },
         });
         if (!supplier) {
            return NextResponse.json(
               { error: "Supplier not found" },
               { status: 400 },
            );
         }
      }

      const hasItems = Array.isArray(body.items);

      // ── Item-level correction (PUR-03, backend level) ──────────────
      // When `items` is provided, items are replaced and stock is
      // netted per product: increases add PURCHASE stock, decreases
      // reverse it — with the same safety rule as purchase deletion
      // (a decrease that would push stock below zero is rejected).
      // The current UI does not send items, so existing edit workflows
      // are untouched; the capability exists for API clients.
      let normalizedItems: Array<{
         productId: string | null;
         variantId: string | null;
         name: string;
         code: string | null;
         quantity: number;
         price: number;
         subtotal: number;
      }> | null = null;

      if (hasItems) {
         const builtItems = body.items.map((item: any) => {
            const quantity = Math.max(1, parseInt(item.quantity) || 1);
            const price = safeMoney(item.price);
            return {
               productId: item.productId || null,
               variantId: item.variantId || null,
               name: item.name || "Unknown Item",
               code: item.code || null,
               quantity,
               price,
               subtotal: parseFloat((quantity * price).toFixed(2)),
            };
         });
         normalizedItems = builtItems;

         const itemProductIds: string[] = Array.from(
            new Set(
               builtItems
                  .map((it: any) => it.productId)
                  .filter((pid: any): pid is string => Boolean(pid)),
            ),
         );
         if (itemProductIds.length > 0) {
            const found = await prisma.product.findMany({
               where: { id: { in: itemProductIds } },
               select: { id: true },
            });
            const foundIds = new Set(found.map((p) => p.id));
            const invalid = itemProductIds.filter((pid) => !foundIds.has(pid));
            if (invalid.length > 0) {
               return NextResponse.json(
                  {
                     error: "Invalid product reference",
                     message: `Product(s) not found: ${invalid.join(", ")}`,
                  },
                  { status: 400 },
               );
            }
         }

         // INV-02: every variantId must name a live variant of the
         // line's own product.
         const itemVariantIds: string[] = Array.from(
            new Set(
               builtItems
                  .map((it: any) => it.variantId)
                  .filter((v: any): v is string => Boolean(v)),
            ),
         );
         if (itemVariantIds.length > 0) {
            const foundVariants = await prisma.productVariant.findMany({
               where: { id: { in: itemVariantIds } },
               select: { id: true, productId: true, variantName: true, isDeleted: true },
            });
            const variantById = new Map(foundVariants.map((v) => [v.id, v]));
            for (const it of builtItems) {
               if (!it.variantId) continue;
               const variant = variantById.get(it.variantId);
               if (!variant || variant.isDeleted || variant.productId !== it.productId) {
                  return NextResponse.json(
                     {
                        error: "Invalid variant",
                        message: `Variant '${it.variantId}' does not belong to product '${it.name}'.`,
                     },
                     { status: 400 },
                  );
               }
            }
         }
      }

      // QA fix (B1): reject any replacement line that names a
      // variable product without a variant — it would net against
      // the product pool only and break the variant-stock
      // invariant (same rule as purchase create).
      if (hasItems && normalizedItems) {
         const variantless = await findVariantlessVariableLine(
            prisma,
            normalizedItems.map((it) => ({
               productId: it.productId,
               variantId: it.variantId,
            })),
         );
         if (variantless) {
            return NextResponse.json(
               {
                  error: "Variant required",
                  message: `Product '${variantless.productName}' has variants — select a variant for this line before saving.`,
               },
               { status: 400 },
            );
         }
      }

      const itemsSnapshot = normalizedItems;
      const auditCtx = requestAuditContext(request);

      const updated = await prisma.$transaction(async (tx) => {
         // Phase 4 (§2.2 companion): lock the Purchase row FIRST,
         // then re-read it — item netting and totals must be
         // computed from the latest committed state, serialized
         // against concurrent purchase returns and allocated
         // supplier payments (which take the same lock). The
         // pre-transaction `existing` read above remains the 404 /
         // validation fast path; `fresh` is authoritative here.
         await lockPurchaseRow(tx, id);
         const fresh = await tx.purchase.findUnique({
            where: { id },
            include: { items: true },
         });
         if (!fresh || fresh.isDeleted) {
            throw new Error("Purchase not found");
         }

         let productAmount = Number(fresh.productAmount);
         let othersCost = Number(fresh.othersCost);
         let discount = Number(fresh.discount);
         let paid = Number(fresh.paid);

         if (body.othersCost !== undefined) othersCost = safeMoney(body.othersCost);
         if (body.discount !== undefined) discount = safeMoney(body.discount);
         if (body.paid !== undefined) paid = safeMoney(body.paid);

         if (itemsSnapshot) {
            const normalizedItems = itemsSnapshot;
            // Net stock difference per product + variant (new − old)
            // — INV-02: variant lines net against their own variant
            // pool, never against the product total or another variant.
            const diffMap = new Map<
               string,
               { productId: string; variantId: string | null; diff: number }
            >();
            const addDiff = (
               productId: string,
               variantId: string | null,
               delta: number,
            ) => {
               const key = `${productId}::${variantId ?? ""}`;
               const current = diffMap.get(key);
               if (current) current.diff += delta;
               else diffMap.set(key, { productId, variantId, diff: delta });
            };
            for (const oldItem of fresh.items) {
               if (oldItem.productId) {
                  addDiff(oldItem.productId, oldItem.variantId ?? null, -oldItem.quantity);
               }
            }
            for (const newItem of normalizedItems) {
               if (newItem.productId) {
                  addDiff(newItem.productId, newItem.variantId, newItem.quantity);
               }
            }

            const increases: Array<{
               productId: string;
               variantId: string | null;
               quantity: number;
            }> = [];
            const decreases: Array<{
               productId: string;
               variantId: string | null;
               quantity: number;
            }> = [];
            for (const { productId, variantId, diff } of diffMap.values()) {
               if (diff > 0) increases.push({ productId, variantId, quantity: diff });
               else if (diff < 0)
                  decreases.push({ productId, variantId, quantity: -diff });
            }

            if (decreases.length > 0) {
               await reverseStockForPurchaseItems(tx, decreases, {
                  purchaseId: fresh.id,
                  note: `Purchase ${fresh.customId} edited — stock corrected`,
               });
            }
            if (increases.length > 0) {
               const { addStockForPurchaseItems } = await import("@src/lib/stock");
               await addStockForPurchaseItems(tx, increases, {
                  purchaseId: fresh.id,
                  note: `Purchase ${fresh.customId} edited — stock corrected`,
               });
            }

            await tx.purchaseItem.deleteMany({
               where: { purchaseId: fresh.id },
            });
            await tx.purchaseItem.createMany({
               data: normalizedItems.map((it) => ({
                  purchaseId: fresh.id,
                  productId: it.productId,
                  variantId: it.variantId,
                  name: it.name,
                  code: it.code,
                  quantity: it.quantity,
                  price: it.price,
                  subtotal: it.subtotal,
               })),
            });

            productAmount = parseFloat(
               normalizedItems.reduce((sum, it) => sum + it.subtotal, 0).toFixed(2),
            );
         }

         // Financial integrity: total and due are always recomputed
         // server-side; a client-sent `due` is never stored verbatim.
         const total = Math.max(0, productAmount + othersCost - discount);
         const due = Math.max(0, total - paid);

         const result = await tx.purchase.update({
            where: { id },
            data: {
               invoice:
                  body.invoice !== undefined ? String(body.invoice).trim() : undefined,
               supplierId: body.supplierId !== undefined ? body.supplierId : undefined,
               ...(normalizedItems ? { productAmount } : {}),
               ...(body.othersCost !== undefined ? { othersCost } : {}),
               ...(body.discount !== undefined ? { discount } : {}),
               ...(body.paid !== undefined ? { paid } : {}),
               total,
               due,
               note: body.note !== undefined ? body.note : undefined,
            },
            include: {
               supplier: true,
               createdBy: { select: { id: true, name: true, email: true } },
               items: {
               include: {
                  product: true,
                  variant: {
                     select: { id: true, variantName: true, sku: true, attributes: true, quantity: true },
                  },
               },
            },
               attachments: true,
            },
         });

         // Phase 4 (D1): audit in the same transaction.
         await logAudit(tx, {
            actor: auditActorFromContext(gate),
            action: "UPDATE",
            entityType: "PURCHASE",
            entityId: fresh.id,
            entityCustomId: fresh.customId,
            summary: `Purchase ${fresh.customId || fresh.id} updated — total ৳${total.toFixed(2)}, due ৳${due.toFixed(2)}`,
            changes: buildChanges(fresh, result, [
               "total",
               "due",
               "paid",
               "productAmount",
               "othersCost",
               "discount",
            ]),
            ...auditCtx,
         });

         return result;
      });

      return NextResponse.json(updated);
   } catch (err) {
      if (err instanceof StockReversalUnsafeError) {
         return NextResponse.json(
            { error: "Stock reversal unsafe", message: err.message },
            { status: 409 },
         );
      }
      return NextResponse.json({ error: "Failed to update purchase" }, { status: 500 });
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, ["purchases", "purchase", "purchase_delete"]);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;
   const auditCtx = requestAuditContext(request);

   try {
      // PUR-03 fix: soft-deleting a purchase reverses the stock it
      // added, exactly once (state-checked inside the transaction),
      // and refuses — without changing anything — when the purchased
      // units have already been sold (fix instruction #15).
      // Phase 4 (§2.2 companion): the Purchase-row lock is taken
      // first so the delete serializes against concurrent purchase
      // returns and allocated payments of the same purchase.
      const purchase = await prisma.$transaction(async (tx) => {
         await lockPurchaseRow(tx, id);

         const existing = await tx.purchase.findUnique({
            where: { id },
            include: { items: true },
         });

         if (!existing) {
            throw new Error("Purchase not found");
         }

         if (!existing.isDeleted) {
            await reverseStockForPurchaseItems(
               tx,
               existing.items
                  .filter((it) => it.productId)
                  .map((it) => ({
                     productId: it.productId as string,
                     quantity: it.quantity,
                     variantId: it.variantId,
                  })),
               {
                  purchaseId: existing.id,
                  note: `Purchase ${existing.customId} deleted — stock reversed`,
               },
            );

            const deleted = await tx.purchase.update({
               where: { id },
               data: { isDeleted: true, deletedAt: new Date() },
            });

            // Phase 4 (D1): audit in the same transaction.
            await logAudit(tx, {
               actor: auditActorFromContext(gate),
               action: "DELETE",
               entityType: "PURCHASE",
               entityId: existing.id,
               entityCustomId: existing.customId,
               summary: `Purchase ${existing.customId || existing.id} moved to bin — stock reversed`,
               ...auditCtx,
            });

            return deleted;
         }

         return existing;
      });

      return NextResponse.json({ message: "Purchase moved to bin", purchase });
   } catch (err) {
      if (err instanceof StockReversalUnsafeError) {
         return NextResponse.json(
            { error: "Cannot delete purchase", message: err.message },
            { status: 409 },
         );
      }
      return NextResponse.json({ error: "Failed to delete purchase" }, { status: 500 });
   }
}
