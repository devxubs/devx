import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import {
   addStockForPurchaseItems,
   reverseStockForPurchaseItems,
   StockReversalUnsafeError,
} from "@src/lib/stock";

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { id } = await params;
   try {
      const purchase = await prisma.purchase.findFirst({
         where: {
            OR: [{ id }, { customId: id }, { invoice: id }],
         },
         include: {
            supplier: true,
            createdBy: { select: { id: true, name: true, email: true } },
            items: { include: { product: true } },
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
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

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
      }

      const itemsSnapshot = normalizedItems;

      const updated = await prisma.$transaction(async (tx) => {
         let productAmount = Number(existing.productAmount);
         let othersCost = Number(existing.othersCost);
         let discount = Number(existing.discount);
         let paid = Number(existing.paid);

         if (body.othersCost !== undefined) othersCost = safeMoney(body.othersCost);
         if (body.discount !== undefined) discount = safeMoney(body.discount);
         if (body.paid !== undefined) paid = safeMoney(body.paid);

         if (itemsSnapshot) {
            const normalizedItems = itemsSnapshot;
            // Net stock difference per product (new − old).
            const diffMap = new Map<string, number>();
            for (const oldItem of existing.items) {
               if (oldItem.productId) {
                  diffMap.set(
                     oldItem.productId,
                     (diffMap.get(oldItem.productId) || 0) - oldItem.quantity,
                  );
               }
            }
            for (const newItem of normalizedItems) {
               if (newItem.productId) {
                  diffMap.set(
                     newItem.productId,
                     (diffMap.get(newItem.productId) || 0) + newItem.quantity,
                  );
               }
            }

            const increases: Array<{ productId: string; quantity: number }> = [];
            const decreases: Array<{ productId: string; quantity: number }> = [];
            for (const [productId, diff] of diffMap.entries()) {
               if (diff > 0) increases.push({ productId, quantity: diff });
               else if (diff < 0) decreases.push({ productId, quantity: -diff });
            }

            if (decreases.length > 0) {
               await reverseStockForPurchaseItems(tx, decreases, {
                  purchaseId: existing.id,
                  note: `Purchase ${existing.customId} edited — stock corrected`,
               });
            }
            if (increases.length > 0) {
               const { addStockForPurchaseItems } = await import("@src/lib/stock");
               await addStockForPurchaseItems(tx, increases, {
                  purchaseId: existing.id,
                  note: `Purchase ${existing.customId} edited — stock corrected`,
               });
            }

            await tx.purchaseItem.deleteMany({
               where: { purchaseId: existing.id },
            });
            await tx.purchaseItem.createMany({
               data: normalizedItems.map((it) => ({
                  purchaseId: existing.id,
                  productId: it.productId,
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

         return tx.purchase.update({
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
               items: { include: { product: true } },
               attachments: true,
            },
         });
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
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { id } = await params;

   try {
      // PUR-03 fix: soft-deleting a purchase reverses the stock it
      // added, exactly once (state-checked inside the transaction),
      // and refuses — without changing anything — when the purchased
      // units have already been sold (fix instruction #15).
      const purchase = await prisma.$transaction(async (tx) => {
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
                  })),
               {
                  purchaseId: existing.id,
                  note: `Purchase ${existing.customId} deleted — stock reversed`,
               },
            );

            return tx.purchase.update({
               where: { id },
               data: { isDeleted: true },
            });
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
