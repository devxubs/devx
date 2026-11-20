/**
 * Order-row locking (Phase C4, audit R-1 / P2-22) — the order-side
 * mirror of lockPurchaseRow in lib/purchaseReturns.
 *
 * Serialize every concurrent writer of one order's stock effects on
 * the order's own row. Must be the FIRST statement of the caller's
 * interactive transaction: the row lock is held until
 * commit/rollback, so the reads that follow it (the stock engine's
 * availability reads and conditional decrements) see the latest
 * committed state instead of a stale snapshot shared with a
 * concurrent edit of the same order.
 *
 * `Order` is a MySQL reserved word, hence the backticks (the
 * Purchase table needs none). Returns false when no such order row
 * exists.
 */
export async function lockOrderRow(
   tx: any,
   orderId: string,
): Promise<boolean> {
   const rows = await tx.$queryRaw`
      SELECT id FROM \`Order\` WHERE id = ${orderId} FOR UPDATE
   `;
   return Array.isArray(rows) && rows.length > 0;
}
