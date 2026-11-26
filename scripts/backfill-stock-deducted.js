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
// HOW THE STATE IS DERIVED (per order)
//   net = Σ StockMovement.quantity over the order's SALE/RETURN rows
//         (SALE rows are negative, RETURN rows positive). net < 0
//         means units are still out of stock for that order.
//   trackedItemQty = Σ quantities of the order's CURRENT items whose
//         product still exists and tracks inventory — what a holding
//         order's net should equal (as a negative) if every movement
//         was written by the current engine.
//
// CLASSIFICATION
//   TO_TRUE     net < 0, order live (not CANCELLED/FAILED, not
//               deleted), and net === -trackedItemQty.
//   TO_FALSE    net === 0 with a consistent story (no movements and
//               nothing to hold, or movements that net to zero).
//   AMBIGUOUS   anything inconsistent — reported, NEVER written:
//               - net < 0 but the order is terminal/deleted (stock
//                 should have been restored at cancel/delete time);
//               - net < 0 but ≠ -trackedItemQty (movements and items
//                 disagree — edited outside the netting paths, a
//                 product deleted since, partial legacy data);
//               - net > 0 (more restored than deducted);
//               - net === 0 with movements, but the live order still
//                 has tracked items (deducted and restored while
//                 live — impossible under the current engine);
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

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const EXECUTE = process.argv.includes("--execute");
const TERMINAL = new Set(["CANCELLED", "FAILED"]);

async function main() {
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
               quantity: true,
               product: { select: { trackInventory: true } },
            },
         },
      },
   });

   const movementGroups = await prisma.stockMovement.groupBy({
      by: ["orderId"],
      where: { orderId: { not: null }, type: { in: ["SALE", "RETURN"] } },
      _sum: { quantity: true },
      _count: { _all: true },
   });
   const movementByOrder = new Map(
      movementGroups.map((g) => [
         g.orderId,
         { net: g._sum.quantity || 0, count: g._count._all },
      ]),
   );

   const toTrue = [];
   const toFalse = [];
   const ambiguous = [];
   let alreadyCorrect = 0;

   for (const order of orders) {
      const display = order.orderId || order.customId || order.id;
      const mv = movementByOrder.get(order.id) || { net: 0, count: 0 };
      const trackedItemQty = order.items
         .filter((it) => it.productId && it.product && it.product.trackInventory !== false)
         .reduce((sum, it) => sum + (it.quantity || 0), 0);
      const terminal = TERMINAL.has(String(order.status || "").toUpperCase());

      let target = null;
      let reason = null;
      if (mv.net < 0) {
         if (terminal || order.isDeleted) {
            reason = `ledger shows ${-mv.net} unit(s) still out, but the order is ${order.status}${order.isDeleted ? " and deleted" : ""} — stock should have been restored`;
         } else if (mv.net !== -trackedItemQty) {
            reason = `ledger outstanding (${-mv.net}) does not match current tracked items (${trackedItemQty})`;
         } else {
            target = true;
         }
      } else if (mv.net > 0) {
         reason = `ledger net is positive (${mv.net}) — more restored than deducted`;
      } else {
         // net === 0
         if (mv.count === 0) {
            if (trackedItemQty > 0 && !terminal && !order.isDeleted) {
               reason = `live order holds ${trackedItemQty} tracked unit(s) but has no stock movements — pre-ledger data or a missed deduction`;
            } else {
               target = false;
            }
         } else if (trackedItemQty > 0 && !terminal && !order.isDeleted) {
            reason = `movements net to zero, but the live order still holds ${trackedItemQty} tracked unit(s)`;
         } else {
            target = false;
         }
      }

      if (reason) {
         ambiguous.push({ id: order.id, display, status: order.status, reason });
      } else if (target === true) {
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
}

main()
   .catch((e) => {
      console.error(e);
      process.exitCode = 1;
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
