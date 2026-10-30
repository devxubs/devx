const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
   console.log("Seeding initial notifications and chat data...");

   // Get existing users
   const users = await prisma.user.findMany({ take: 5 });
   const userIds = users.map((u) => u.id);
   const primaryUser = users[0] || { id: "system", name: "DevX Admin" };

   // 1. Seed Notifications if none exist
   const notifCount = await prisma.notification.count();
   if (notifCount === 0) {
      await prisma.notification.createMany({
         data: [
            {
               title: "System Initialized",
               message: "DevX POS successfully configured with sequential ID sequences and MySQL database.",
               category: "System",
               type: "success",
               link: "/admin/dashboard",
               isRead: false,
            },
            {
               title: "Low Stock Alert",
               message: "Wireless Earbuds (PROD_5) has reached the low stock threshold (10 units left).",
               category: "Inventory",
               type: "warning",
               link: "/admin/product",
               isRead: false,
            },
            {
               title: "New POS Order #ORD_3",
               message: "New retail sale of ৳ 8,450 completed by cashier counter.",
               category: "Order",
               type: "info",
               link: "/admin/order",
               isRead: true,
            },
            {
               title: "Settlement Payout Recorded",
               message: "Payout withdrawal #BILL_1 for ৳ 50,000 recorded via Bank Transfer.",
               category: "Settlement",
               type: "info",
               link: "/admin/billing",
               isRead: true,
            },
         ],
      });
      console.log("Created 4 default notifications.");
   }

   // 2. Seed Conversations if none exist
   const convCount = await prisma.conversation.count();
   if (convCount === 0) {
      // General Store Team Group
      const generalGroup = await prisma.conversation.create({
         data: {
            type: "group",
            name: "DevX Team & Store Announcements",
            members: userIds,
            adminIds: userIds.slice(0, 1),
            messages: {
               create: [
                  {
                     senderId: primaryUser.id,
                     senderName: primaryUser.name || "Store Admin",
                     senderAvatar: primaryUser.image || "/images/avatar-25.webp",
                     message: "Welcome team to the DevX POS communication hub! Please review daily inventory and opening counters.",
                     isRead: true,
                  },
                  {
                     senderId: userIds[1] || primaryUser.id,
                     senderName: users[1]?.name || "Cashier Desk",
                     senderAvatar: users[1]?.image || "/images/avatar-25.webp",
                     message: "Opening register balanced and verified with ৳ 5,000 petty float.",
                     isRead: false,
                  },
               ],
            },
         },
      });

      // Direct Conversation between staff
      if (users.length > 1) {
         await prisma.conversation.create({
            data: {
               type: "direct",
               name: users[1].name || "Staff Member",
               members: [users[0].id, users[1].id],
               messages: {
                  create: [
                     {
                        senderId: users[1].id,
                        senderName: users[1].name,
                        message: "Hi Admin, could you approve the restock request for beverages?",
                        isRead: false,
                     },
                  ],
               },
            },
         });
      }
      console.log("Created default chat conversations and messages.");
   }

   console.log("Seed complete.");
}

main()
   .catch(console.error)
   .finally(() => prisma.$disconnect());
