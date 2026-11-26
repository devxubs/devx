// DevX POS — Phase 1B backfill for Order.stockDeducted
//
// PURPOSE
//   Phase 1B made stock holding a RECORDED state (Order.stockDeducted)
//   instead of a status derivation. Orders created before the column
//   existed all default to false, which is wrong for every order that
//   is currently holding stock. This script derives the historically
//   correct value for each order from the StockMovement LEDGER — not
//   from status alone — and (only with --execute) writes it.
//
// HOW THE STATE IS DERIVED (per order, PER PRODUCT/VARIANT POOL)
//   Movements and current items are grouped into pools keyed by
//   (productId, variantId) — a null variantId is its own pool.
//   For each pool: outstanding = -(Σ SALE/RETURN quantity), compared
//   against the summed quantity of the order's CURRENT items in the
//   same pool (duplicate items in one pool are summed). Pools are
//   compared INDEPENDENTLY: one product's or variant's surplus can
//   never compensate for another pool's shortage. If ANY pool
//   differs, the whole order is AMBIGUOUS.
//
// CLASSIFICATION
//   TO_TRUE     every pool matches, the summed ledger net is < 0
//               (units still out), and the order is live (not
//               CANCELLED/FAILED, not deleted).
//   TO_FALSE    no movements and nothing to hold, or every pool
//               matches with nothing outstanding.
//   AMBIGUOUS   anything inconsistent — reported, NEVER written:
//               - any product/variant pool whose outstanding ledger
//                 quantity differs from the current item quantity
//                 (including the case where the AGGREGATE totals
//                 happen to match while individual pools do not);
//               - ledger shows units still out but the order is
//                 terminal/deleted (should have been restored);
//               - ledger net positive (more restored than deducted);
//               - no movements at all, but a live order holds
//                 tracked items (pre-ledger data / missed deduction).
//
// SAFETY
//   - Default mode is DRY-RUN: reads only, writes nothing.
//   - --execute performs the writes in ONE transaction, and only
//     for TO_TRUE / TO_FALSE orders; ambiguous orders are skipped.
//   - Product quantities and StockMovement rows are NEVER modified.
//   - Idempotent: classification depends only on the ledger and the
//     items, never on the current flag, so re-running converges.
//   - Requires the stockDeducted column: run `npx prisma db push`
//     (and deploy the Phase 1B code) BEFORE executing.
//
// USAGE
//   node scripts/backfill-stock-deducted.js            # dry-run report
//   node scripts/backfill-stock-deducted.js --execute  # apply (explicit)

const TERMINAL = new Set(["CANCELLED", "FAILED"]);

/** Pool identity: product + variant, with null variant as its own pool. */
function poolKey(productId, variantId) {
   return `${productId}::${variantId == null ? "" : variantId}`;
}

function poolLabel(pool) {
   const name = pool.name || pool.productId;
   return pool.variantId
      ? `${name} [variant ${pool.variantId}]`
      : `${name} [no variant]`;
}

/**
 * Classify one order from its current items and its SALE/RETURN
 * ledger pools. Pure — no database access.
 *
 * order: { status, isDeleted, items: [{ productId, variantId,
 *          quantity, trackInventory, name }] }
 *        Items with no productId, or whose product does not track
 *        inventory, never move stock and are excluded from the
 *        expected pools. An item whose product was deleted since
 *        (trackInventory unknown) is treated as tracked.
 * pools: [{ productId, variantId, net, count }] — this order's
 *        movements grouped by (productId, variantId); net is the
 *        summed signed quantity (SALE negative, RETURN positive).
 *
 * Returns { target: true | false } or { target: null, reason }.
 */
function classifyOrder(order, pools) {
   const expected = new Map();
   for (const it of order.items || []) {
      if (!it.productId || it.trackInventory === false) continue;
      const key = poolKey(it.productId, it.variantId);
      const pool = expected.get(key) || {
         productId: it.productId,
         variantId: it.variantId ?? null,
         name: it.name,
         qty: 0,
      };
      pool.qty += it.quantity || 0;
      expected.set(key, pool);
   }

   const ledger = new Map();
   let orderNet = 0;
   let movementCount = 0;
   for (const p of pools || []) {
      ledger.set(poolKey(p.productId, p.variantId), p);
      orderNet += p.net || 0;
      movementCount += p.count || 0;
   }

   const trackedItemQty = [...expected.values()].reduce((s, p) => s + p.qty, 0);
   const terminal = TERMINAL.has(String(order.status || "").toUpperCase());
   const live = !terminal && !order.isDeleted;

   if (movementCount === 0) {
      if (trackedItemQty > 0 && live) {
         return {
            target: null,
            reason: `live order holds ${trackedItemQty} tracked unit(s) but has no stock movements — pre-ledger data or a missed deduction`,
         };
      }
      return { target: false, reason: null };
   }

   // Per-pool comparison — the heart of the safeguard. A surplus in
   // one pool must never mask a shortage in another.
   const keys = new Set([...expected.keys(), ...ledger.keys()]);
   for (const key of keys) {
      const exp = expected.get(key);
      const led = ledger.get(key);
      const expectedQty = exp ? exp.qty : 0;
      const outstanding = led ? -(led.net || 0) : 0;
      if (outstanding !== expectedQty) {
         const labelPool = exp || {
            productId: led.productId,
            variantId: led.variantId ?? null,
            name: undefined,
         };
         return {
            target: null,
            reason: `pool ${poolLabel(labelPool)}: ledger outstanding ${outstanding} ≠ current items ${expectedQty} — movements and items disagree per product/variant`,
         };
      }
   }

   if (orderNet < 0) {
      if (!live) {
         return {
            target: null,
            reason: `ledger shows ${-orderNet} unit(s) still out, but the order is ${order.status}${order.isDeleted ? " and deleted" : ""} — stock should have been restored`,
         };
      }
      return { target: true, reason: null };
   }
   if (orderNet > 0) {
      // Unreachable once pools match (a positive net forces some
      // pool's outstanding negative); kept as a safety net.
      return {
         target: null,
         reason: `ledger net is positive (${orderNet}) — more restored than deducted`,
      };
   }
   return { target: false, reason: null };
}

async function main() {
   const { PrismaClient } = require("@prisma/client");
   const prisma = new PrismaClient();
   const EXECUTE = process.argv.includes("--execute");

   try {
      // Fail with a clear message when the column is not there yet.
      try {
         await prisma.order.findFirst({ select: { stockDeducted: true } });
      } catch (e) {
         console.error(
            "Cannot read Order.stockDeducted — run `npx prisma db push` first, then re-run this script.",
         );
         throw e;
      }

      const orders = await prisma.order.findMany({
         select: {
            id: true,
            orderId: true,
            customId: true,
            status: true,
            isDeleted: true,
            stockDeducted: true,
            items: {
               select: {
                  productId: true,
                  variantId: true,
                  name: true,
                  quantity: true,
                  product: { select: { trackInventory: true } },
               },
            },
         },
      });

      // Ledger grouped per order AND per product/variant pool.
      const movementGroups = await prisma.stockMovement.groupBy({
         by: ["orderId", "productId", "variantId"],
         where: { orderId: { not: null }, type: { in: ["SALE", "RETURN"] } },
         _sum: { quantity: true },
         _count: { _all: true },
      });
      const poolsByOrder = new Map();
      for (const g of movementGroups) {
         const list = poolsByOrder.get(g.orderId) || [];
         list.push({
            productId: g.productId,
            variantId: g.variantId ?? null,
            net: g._sum.quantity || 0,
            count: g._count._all,
         });
         poolsByOrder.set(g.orderId, list);
      }

      const toTrue = [];
      const toFalse = [];
      const ambiguous = [];
      let alreadyCorrect = 0;

      for (const order of orders) {
         const display = order.orderId || order.customId || order.id;
         const verdict = classifyOrder(
            {
               status: order.status,
               isDeleted: order.isDeleted,
               items: order.items.map((it) => ({
                  productId: it.productId,
                  variantId: it.variantId,
                  name: it.name,
                  quantity: it.quantity,
                  // A deleted product reads as null here; undefined
                  // trackInventory is treated as tracked.
                  trackInventory: it.product ? it.product.trackInventory : undefined,
               })),
            },
            poolsByOrder.get(order.id) || [],
         );

         if (verdict.target === null) {
            ambiguous.push({
               id: order.id,
               display,
               status: order.status,
               reason: verdict.reason,
            });
         } else if (verdict.target === true) {
            if (order.stockDeducted) alreadyCorrect += 1;
            else toTrue.push(order.id);
         } else {
            if (!order.stockDeducted) alreadyCorrect += 1;
            else toFalse.push(order.id);
         }
      }

      console.log(`Orders examined:            ${orders.length}`);
      console.log(`Already correct:            ${alreadyCorrect}`);
      console.log(`To mark stockDeducted=true: ${toTrue.length}`);
      console.log(`To mark stockDeducted=false:${toFalse.length}`);
      console.log(`Ambiguous (manual review):  ${ambiguous.length}`);
      for (const a of ambiguous) {
         console.log(`  AMBIGUOUS ${a.display} [${a.status}] — ${a.reason}`);
      }

      if (!EXECUTE) {
         console.log(
            "\nDRY-RUN only — nothing was written. Re-run with --execute to apply the non-ambiguous classifications.",
         );
         return;
      }

      if (toTrue.length === 0 && toFalse.length === 0) {
         console.log("\nNothing to write.");
         return;
      }

      await prisma.$transaction(async (tx) => {
         if (toTrue.length > 0) {
            await tx.order.updateMany({
               where: { id: { in: toTrue } },
               data: { stockDeducted: true },
            });
         }
         if (toFalse.length > 0) {
            await tx.order.updateMany({
               where: { id: { in: toFalse } },
               data: { stockDeducted: false },
            });
         }
      });
      console.log(
         `\nEXECUTED: ${toTrue.length} order(s) marked deducted, ${toFalse.length} marked not deducted, ${ambiguous.length} ambiguous left untouched.`,
      );
   } finally {
      await prisma.$disconnect();
   }
}

if (require.main === module) {
   main().catch((e) => {
      console.error(e);
      process.exitCode = 1;
   });
}

module.exports = { classifyOrder, poolKey };
