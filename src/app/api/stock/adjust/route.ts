import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import {
   adjustStock,
   loadStockSettings,
   InsufficientStockError,
   InvalidVariantError,
} from "@src/lib/stock";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
} from "@src/lib/audit";

// Phase 3A (3.2): manual stock adjustment for the Stock workspace.
// Runs through the stock engine (adjustStock) inside a transaction so
// product quantity, variant quantity, warehouse mirroring and the
// StockMovement ledger entry stay consistent. A reason is mandatory —
// it is stored as the movement note.
export async function POST(request: NextRequest) {
   const gate = await requirePermission(request, [
      "products",
      "product",
      "product_update",
      "product_create",
   ]);
   if (gate instanceof NextResponse) return gate;

   try {
      const body = await request.json();
      const productId =
         typeof body.productId === "string" ? body.productId : "";
      const variantId =
         typeof body.variantId === "string" && body.variantId
            ? body.variantId
            : null;
      const direction = body.direction === "decrease" ? "decrease" : "increase";
      const quantity = Number(body.quantity);
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";

      if (!productId) {
         return NextResponse.json(
            { error: "A product is required" },
            { status: 400 },
         );
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
         return NextResponse.json(
            { error: "Quantity must be a whole number of at least 1" },
            { status: 400 },
         );
      }
      if (!reason) {
         return NextResponse.json(
            { error: "A reason is required for a stock adjustment" },
            { status: 400 },
         );
      }

      const delta = direction === "decrease" ? -quantity : quantity;

      const result = await prisma.$transaction(async (tx) => {
         const settings = await loadStockSettings(tx);
         const adjusted = await adjustStock(tx, {
            productId,
            variantId,
            delta,
            reason,
            settings,
         });

         // Phase 4 (D1): manual stock adjustments are inventory
         // mutations — audit in the same transaction.
         const product = await tx.product.findUnique({
            where: { id: productId },
            select: { customId: true, productName: true },
         });
         await logAudit(tx, {
            actor: auditActorFromContext(gate),
            action: "STOCK",
            entityType: "PRODUCT",
            entityId: productId,
            entityCustomId: product?.customId ?? null,
            summary: `Stock adjusted for ${product?.productName || productId} by ${delta > 0 ? "+" : ""}${delta} — ${reason}`,
            changes: {
               quantity: {
                  from: adjusted.productQuantity - delta,
                  to: adjusted.productQuantity,
               },
            },
            ...requestAuditContext(request),
         });

         return adjusted;
      });

      return NextResponse.json({
         success: true,
         productQuantity: result.productQuantity,
         variantQuantity: result.variantQuantity,
      });
   } catch (error: any) {
      if (error instanceof InvalidVariantError) {
         return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error instanceof InsufficientStockError) {
         return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (
         error instanceof Error &&
         (error.message.includes("reason is required") ||
            error.message.includes("does not track inventory") ||
            error.message.includes("Product not found") ||
            error.message.includes("non-zero"))
      ) {
         return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json(
         { error: "Failed to adjust stock" },
         { status: 500 },
      );
   }
}
