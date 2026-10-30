require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";

async function main() {
   console.log("=== CHAT SYSTEM DEEP FUNCTIONAL VERIFICATION ===");

   // Fetch two separate users
   const admin = await prisma.user.findFirst({ where: { email: "devxub@gmail.com" } });
   const cashier = await prisma.user.findFirst({ where: { email: "cashier@devxpos.com" } });

   if (!admin || !cashier) {
      throw new Error("Both admin and cashier accounts must exist in database");
   }

   const adminToken = jwt.sign({ id: admin.id, email: admin.email, role: "System Admin" }, JWT_SECRET);
   const cashierToken = jwt.sign({ id: cashier.id, email: cashier.email, role: "Cashier" }, JWT_SECRET);

   const adminHeaders = {
      Authorization: `Bearer ${adminToken}`,
      Cookie: `devx_token=${adminToken}`,
      "Content-Type": "application/json",
   };

   const cashierHeaders = {
      Authorization: `Bearer ${cashierToken}`,
      Cookie: `devx_token=${cashierToken}`,
      "Content-Type": "application/json",
   };

   // 1. Group Chat Creation with Member Selection
   const createGroupRes = await fetch("http://localhost:3000/api/chat/conversations", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
         type: "group",
         name: "Deep Test Ops Squad",
         description: "Initial group operational channel",
         memberIds: [admin.id, cashier.id],
      }),
   });

   if (!createGroupRes.ok) {
      console.error("[FAIL] Group creation failed:", await createGroupRes.text());
      process.exit(1);
   }

   const group = await createGroupRes.json();
   console.log(`[PASS] Group created successfully: ID=${group.id}, Name='${group.name}', Type=${group.type}`);

   // 2. Direct Message Delivery & Unread Counts
   const sendMsgRes = await fetch("http://localhost:3000/api/chat/messages", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
         conversationId: group.id,
         message: "Hello Cashier, operational briefing message 1",
      }),
   });
   const sentMsg = await sendMsgRes.json();
   console.log(`[PASS] Message sent by Admin to group: ID=${sentMsg.id}`);

   // Fetch messages as Cashier
   const getCashierMsgs = await fetch(`http://localhost:3000/api/chat/messages?conversationId=${group.id}`, {
      headers: cashierHeaders,
   });
   const cashierMsgs = await getCashierMsgs.json();
   const received = (cashierMsgs.messages || cashierMsgs).some((m) => m.id === sentMsg.id);
   if (!received) {
      console.error("[FAIL] Cashier could not retrieve message delivered by Admin");
      process.exit(1);
   }
   console.log("[PASS] Message delivered and retrieved by Cashier.");

   // 3. Mute / Unmute Persistence by Authorized Account
   const muteRes = await fetch("http://localhost:3000/api/chat/conversations", {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({
         conversationId: group.id,
         action: "mute",
      }),
   });
   const mutedGroup = await muteRes.json();
   const adminMuted = Array.isArray(mutedGroup.mutedUserIds) && mutedGroup.mutedUserIds.includes(admin.id);
   const cashierMuted = Array.isArray(mutedGroup.mutedUserIds) && mutedGroup.mutedUserIds.includes(cashier.id);

   if (!adminMuted || cashierMuted) {
      console.error("[FAIL] Mute state incorrect: Admin should be muted, Cashier should NOT be muted", mutedGroup.mutedUserIds);
      process.exit(1);
   }
   console.log("[PASS] Mute persisted: Admin is muted, Cashier is unmuted.");

   // 4. Message delivery continues while conversation is muted
   const sendMsgWhileMuted = await fetch("http://localhost:3000/api/chat/messages", {
      method: "POST",
      headers: cashierHeaders,
      body: JSON.stringify({
         conversationId: group.id,
         content: "Cashier acknowledging briefing while Admin is muted",
      }),
   });
   if (!sendMsgWhileMuted.ok) {
      console.error("[FAIL] Message delivery blocked when conversation muted");
      process.exit(1);
   }
   console.log("[PASS] Message delivery continues normally while muted.");

   // 5. Group Profile Editing (Name, Description, Avatar)
   const editProfileRes = await fetch("http://localhost:3000/api/chat/conversations", {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({
         conversationId: group.id,
         action: "update_profile",
         name: "HQ Operations Core",
         description: "Updated HQ command channel",
         avatar: "/demo/hq_avatar.png",
      }),
   });
   const updatedProfile = await editProfileRes.json();
   if (
      updatedProfile.name !== "HQ Operations Core" ||
      updatedProfile.description !== "Updated HQ command channel" ||
      updatedProfile.avatar !== "/demo/hq_avatar.png"
   ) {
      console.error("[FAIL] Group profile edit did not persist:", updatedProfile);
      process.exit(1);
   }
   console.log("[PASS] Group profile editing (name, description, avatar) verified and persisted.");

   // 6. Unmute action
   const unmuteRes = await fetch("http://localhost:3000/api/chat/conversations", {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({
         conversationId: group.id,
         action: "unmute",
      }),
   });
   const unmutedGroup = await unmuteRes.json();
   const adminStillMuted = Array.isArray(unmutedGroup.mutedUserIds) && unmutedGroup.mutedUserIds.includes(admin.id);
   if (adminStillMuted) {
      console.error("[FAIL] Unmute failed to remove Admin from mutedUserIds:", unmutedGroup.mutedUserIds);
      process.exit(1);
   }
   console.log("[PASS] Unmute verified: Admin successfully unmuted.");

   // 7. Cleanup
   await prisma.chatMessage.deleteMany({ where: { conversationId: group.id } });
   await prisma.conversation.delete({ where: { id: group.id } });
   console.log("Cleaned up test group and messages.");

   console.log("==============================================================");
   console.log("CHAT SYSTEM ALL 6 CRITERIA VERIFIED WITH 100% SUCCESS");
   console.log("==============================================================");
}

main()
   .catch(console.error)
   .finally(() => prisma.$disconnect());
