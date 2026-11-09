const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function backfill() {
   console.log("================================================================================");
   console.log("  DEVX POS — ORDER SEQUENTIAL ID & DEDICATED ORDER CODE BACKFILL");
   console.log("================================================================================\n");

   // 1. Fetch active orders sorted by createdAt asc
   const activeOrders = await prisma.order.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true, orderId: true, customId: true },
   });

   // 2. Fetch soft-deleted orders sorted by createdAt asc
   const deletedOrders = await prisma.order.findMany({
      where: { isDeleted: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true, orderId: true, customId: true },
   });

   const allOrders = [...activeOrders, ...deletedOrders];
   console.log(`Found ${allOrders.length} total orders (${activeOrders.length} active, ${deletedOrders.length} soft-deleted).\n`);

   // Phase 1: Temporary prefix to avoid any unique constraint conflicts during reassignment
   console.log("--- Phase 1: Applying temporary IDs to prevent unique constraint collisions ---");
   for (let i = 0; i < allOrders.length; i++) {
      const o = allOrders[i];
      await prisma.order.update({
         where: { id: o.id },
         data: {
            orderCode: null,
            orderId: `TEMP_ORD_${o.id}`,
            customId: `TEMP_CUS_${o.id}`,
            invoiceNo: `TEMP_INV_${o.id}`,
         },
      });
   }
   console.log("  Temporary IDs successfully applied.\n");

   // Phase 2: Sequential ORD_1, ORD_2, ... assignment
   console.log("--- Phase 2: Assigning clean sequential ORD_ codes and invoice numbers ---");
   for (let i = 0; i < allOrders.length; i++) {
      const o = allOrders[i];
      const seq = i + 1;
      const code = `ORD_${seq}`;
      const inv = `INV_${seq}`;

      await prisma.order.update({
         where: { id: o.id },
         data: {
            orderCode: code,
            orderId: code,
            customId: code,
            invoiceNo: inv,
         },
      });

      const statusTag = i < activeOrders.length ? "ACTIVE" : "BIN";
      console.log(`  [${statusTag}] Order #${seq}: id=${o.id} -> code=${code}, invoiceNo=${inv}`);
   }

   // Phase 3: Update EntitySequence for ORDER
   console.log("\n--- Phase 3: Updating EntitySequence for ORDER ---");
   const finalSeq = allOrders.length;
   await prisma.entitySequence.upsert({
      where: { entityType: "ORDER" },
      update: { currentSeq: finalSeq },
      create: { entityType: "ORDER", currentSeq: finalSeq },
   });
   console.log(`  EntitySequence for 'ORDER' set to ${finalSeq}.\n`);

   console.log("================================================================================");
   console.log("  BACKFILL COMPLETED SUCCESSFULLY!");
   console.log("================================================================================\n");
}

backfill()
   .catch((err) => {
      console.error("Backfill failed:", err);
      process.exit(1);
   })
   .finally(() => prisma.$disconnect());
