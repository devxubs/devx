import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { parsePagination } from "@src/lib/pagination";
import { generateNextEntityId } from "@src/lib/idGenerator";
import {
   addStockForPurchaseItems,
   findVariantlessVariableLine,
} from "@src/lib/stock";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
} from "@src/lib/audit";
import { normalizePurchaseAttachments } from "@src/lib/purchaseAttachments";
import { splitCreationPayment } from "@src/lib/utils";

export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const { searchParams } = new URL(request.url);
   // Follow-up round: the ?all=true / ?export=true escape hatch
   // (one unbounded 10,000-row response for any active session) is
   // removed — no client used it; exports page through this list
   // via fetchAllPages. The route now always paginates normally.
   const { page, limit } = parsePagination(searchParams, 20);
   const search = searchParams.get("search")?.trim() || "";
   const skip = (page - 1) * limit;

   const where: any = { isDeleted: false };
   if (search) {
      where.OR = [
         { invoice: { contains: search } },
         { customId: { contains: search } },
         { supplier: { name: { contains: search } } },
      ];
   }

   try {
      const [purchases, total] = await Promise.all([
         prisma.purchase.findMany({
            where,
            skip,
            take: limit,
            include: {
               supplier: true,
               createdBy: { select: { id: true, name: true, email: true } },
               items: {
                  include: {
                     product: true,
                     variant: {
                        select: { id: true, variantName: true, sku: true, barcode: true, attributes: true, quantity: true },
                     },
                  },
               },
               attachments: true,
            },
            orderBy: { createdAt: "desc" },
         }),
         prisma.purchase.count({ where }),
      ]);

      return NextResponse.json({ purchases, total, page, limit });
   } catch {
      return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   const gate = await requirePermission(request, ["purchases", "purchase", "purchase_create"]);
   if (gate instanceof NextResponse) return gate;
   const session = gate.session;

   try {
      const body = await request.json();
      const {
         supplierId,
         invoice,
         items = [],
         othersCost = 0,
         discount = 0,
         paid = 0,
         note,
      } = body;

      if (!Array.isArray(items)) {
         return NextResponse.json(
            { error: "Purchase items must be an array" },
            { status: 400 },
         );
      }

      // Validate + normalise items, then recompute every total on the
      // server (PUR-02 fix: the client-sent productAmount is never
      // trusted — totals derive from validated items × prices).
      const safeMoney = (value: any) => {
         const n = Number(value);
         return Number.isFinite(n) ? Math.max(0, n) : 0;
      };

      const normalizedItems = items.map((item: any) => {
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

      const productAmount = parseFloat(
         normalizedItems.reduce((sum, it) => sum + it.subtotal, 0).toFixed(2),
      );
      const others = safeMoney(othersCost);
      const disc = safeMoney(discount);
      const paidAmount = safeMoney(paid);
      const total = Math.max(0, productAmount + others - disc);
      // C4-3 (audit C-13 / P2-12): creation-time overpayment. `due`
      // is unchanged (it floored at 0 before, and total − paidApplied
      // is the same value), but the excess over the total used to
      // vanish — it was not unallocated credit (that term counts
      // only SupplierPayment rows) and no ledger row existed for
      // creation `paid` at all. Now, when the purchase names a
      // supplier, the stored `paid` is the applied part (the
      // codebase's convention: allocated supplier payments refuse
      // overpayment rather than storing paid > total) and the
      // excess is recorded in the transaction below as an
      // UNALLOCATED SupplierPayment row, which every consumer of
      // the one netPayable definition (suppliers list,
      // payableSummary, Reports Finance) already counts as supplier
      // credit, and the supplier ledger UI already renders as an
      // unallocated payment (voiding it simply stops the credit —
      // the void route touches no purchase for purchase-less rows).
      // Without a supplier there is no one to hold credit for, so
      // the stored `paid` keeps the entered amount exactly as
      // before (the excess stays derivable as paid − total).
      const { paidApplied, overpayment } = splitCreationPayment(
         total,
         paidAmount,
      );
      const recordOverpayment = overpayment > 0 && Boolean(supplierId);
      const storedPaid = recordOverpayment ? paidApplied : paidAmount;
      const due = Math.max(0, total - paidApplied);

      // Validate references before writing anything (fix instruction
      // #14): supplier and every item product must exist.
      if (supplierId) {
         const supplier = await prisma.supplier.findUnique({
            where: { id: supplierId },
         });
         if (!supplier) {
            return NextResponse.json(
               { error: "Supplier not found" },
               { status: 400 },
            );
         }
      }

      const itemProductIds = Array.from(
         new Set(
            normalizedItems
               .map((it) => it.productId)
               .filter((id): id is string => Boolean(id)),
         ),
      );
      if (itemProductIds.length > 0) {
         const found = await prisma.product.findMany({
            where: { id: { in: itemProductIds } },
            select: { id: true },
         });
         const foundIds = new Set(found.map((p) => p.id));
         const invalid = itemProductIds.filter((id) => !foundIds.has(id));
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
      const itemVariantIds = Array.from(
         new Set(
            normalizedItems
               .map((it) => it.variantId)
               .filter((v): v is string => Boolean(v)),
         ),
      );
      if (itemVariantIds.length > 0) {
         const foundVariants = await prisma.productVariant.findMany({
            where: { id: { in: itemVariantIds } },
            select: { id: true, productId: true, variantName: true, isDeleted: true },
         });
         const variantById = new Map(foundVariants.map((v) => [v.id, v]));
         for (const it of normalizedItems) {
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

      // QA fix (B1): a variant-less line for a variable product
      // would credit the product pool only and silently break the
      // Product.quantity = Σ variant quantities invariant — reject
      // it; the caller must pick the variant being purchased.
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

      let creationOverpaymentCredit: {
         amount: number;
         supplierPaymentCustomId: string | null;
      } | null = null;

      const purchase = await prisma.$transaction(async (tx) => {
         const { customId } = await generateNextEntityId("PURCHASE", tx);
         // PUR-01 fix: never fabricate a supplier invoice number. The
         // column is non-nullable, so an absent supplier invoice is
         // stored as an empty string — visibly "not provided" instead
         // of a fake INV-<timestamp> that looks like a real invoice.
         const invoiceNumber = invoice && String(invoice).trim()
            ? String(invoice).trim()
            : "";

         const newPurchase = await tx.purchase.create({
            data: {
               customId,
               invoice: invoiceNumber,
               supplierId: supplierId || null,
               productAmount,
               othersCost: others,
               discount: disc,
               total,
               paid: storedPaid,
               due,
               note: note || undefined,
               createdById: session.id || undefined,
               items: {
                  create: normalizedItems,
               },
               // B2-2 (audit C-8 / P1-6): persist the attachments
               // the form collected — descriptors of files already
               // stored through the uploads flow, validated against
               // the PurchaseAttachment model's fields. Created in
               // the same transaction as the purchase itself.
               attachments: {
                  create: normalizePurchaseAttachments(body.attachments),
               },
            },
            include: {
               items: true,
               supplier: true,
               attachments: true,
            },
         });

         // Increase inventory & record stock movements (shared engine —
         // also mirrors warehouse stock, INV-01).
         await addStockForPurchaseItems(
            tx,
            normalizedItems
               .filter((it) => it.productId)
               .map((it) => ({
                  productId: it.productId as string,
                  quantity: it.quantity,
                  variantId: it.variantId,
               })),
            {
               purchaseId: newPurchase.id,
               note: `Purchase ${newPurchase.customId} (Invoice: ${invoiceNumber || "—"})`,
            },
         );

         // C4-3 (audit C-13 / P2-12): record the creation
         // overpayment excess as an unallocated SupplierPayment —
         // supplier credit under the one netPayable definition (see
         // the split computation above). Same transaction, with its
         // own PAYMENT audit row mirroring the payments route.
         if (recordOverpayment) {
            const { customId: spayId } = await generateNextEntityId(
               "SUPPLIER_PAYMENT",
               tx,
            );
            const creditRow = await tx.supplierPayment.create({
               data: {
                  customId: spayId,
                  supplierId: supplierId as string,
                  purchaseId: null,
                  amount: overpayment,
                  paymentMethod: null,
                  paymentTxId: null,
                  note: `Creation overpayment on purchase ${customId} — paid ৳${paidAmount.toFixed(2)} against a total of ৳${total.toFixed(2)}; the excess is held as supplier credit`,
                  createdById: session.id || undefined,
               },
            });
            creationOverpaymentCredit = {
               amount: overpayment,
               supplierPaymentCustomId: creditRow.customId,
            };
            await logAudit(tx, {
               actor: auditActorFromContext(gate),
               action: "PAYMENT",
               entityType: "SUPPLIER_PAYMENT",
               entityId: creditRow.id,
               entityCustomId: creditRow.customId,
               summary: `Supplier payment ${creditRow.customId} of ৳${overpayment.toFixed(2)} recorded as unallocated credit — creation overpayment on purchase ${customId}`,
               ...requestAuditContext(request),
            });
         }

         // Phase 4 (D1): audit in the same transaction.
         await logAudit(tx, {
            actor: auditActorFromContext(gate),
            action: "CREATE",
            entityType: "PURCHASE",
            entityId: newPurchase.id,
            entityCustomId: newPurchase.customId,
            summary:
               `Purchase ${newPurchase.customId} created — total ৳${total.toFixed(2)}, due ৳${due.toFixed(2)}` +
               (recordOverpayment
                  ? `, overpayment ৳${overpayment.toFixed(2)} held as supplier credit`
                  : ""),
            ...requestAuditContext(request),
         });

         return newPurchase;
      });

      return NextResponse.json(
         creationOverpaymentCredit
            ? { ...purchase, creationOverpayment: creationOverpaymentCredit }
            : purchase,
         { status: 201 },
      );
   } catch (error: any) {
      console.error("POST /api/purchases error:", error);
      // ORD-06 pattern: never leak raw internal error messages.
      return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 });
   }
}
