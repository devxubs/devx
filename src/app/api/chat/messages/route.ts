import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

/**
 * CHAT-01 fix: every handler verifies the caller is a member of the
 * conversation before reading or writing. Membership lives in the
 * Conversation.members JSON array (DB-07), so it is checked in code.
 */
async function requireMembership(conversationId: string, userId: string) {
   const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
   });
   if (!conversation) return { error: "Conversation not found", status: 404 as const };
   const memberIds: string[] = Array.isArray(conversation.members)
      ? (conversation.members as string[])
      : [];
   if (!memberIds.includes(userId)) {
      return { error: "Forbidden: not a conversation member", status: 403 as const };
   }
   return { conversation };
}

export async function GET(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { searchParams } = new URL(request.url);
   const conversationId = searchParams.get("conversationId");

   if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
   }

   try {
      const gate = await requireMembership(conversationId, session.id);
      if ("error" in gate) {
         return NextResponse.json({ error: gate.error }, { status: gate.status });
      }

      // Fix instruction #18: GET is a pure read — it no longer marks
      // messages as read as a side effect. Read state changes go
      // through the explicit POST { action: "mark_read" } operation.
      const messages = await prisma.chatMessage.findMany({
         where: { conversationId },
         orderBy: { createdAt: "asc" },
      });

      return NextResponse.json(messages);
   } catch {
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const body = await request.json();
      const message = body.message || body.content;
      const { conversationId, attachments, action } = body;

      if (!conversationId) {
         return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
      }

      const gate = await requireMembership(conversationId, session.id);
      if ("error" in gate) {
         return NextResponse.json({ error: gate.error }, { status: gate.status });
      }

      // Explicit read-marking operation (replaces the old GET side
      // effect). Only a member can mark, and only other members'
      // messages are affected.
      if (action === "mark_read") {
         await prisma.chatMessage.updateMany({
            where: {
               conversationId,
               senderId: { not: session.id },
               isRead: false,
            },
            data: { isRead: true },
         });
         return NextResponse.json({ message: "Messages marked as read" });
      }

      if (!message && (!attachments || attachments.length === 0)) {
         return NextResponse.json({ error: "Message content or attachment is required" }, { status: 400 });
      }

      // Find user details for senderName and avatar
      const user = await prisma.user.findUnique({
         where: { id: session.id },
         select: { name: true, image: true },
      });

      const [createdMessage, conversation] = await prisma.$transaction([
         prisma.chatMessage.create({
            data: {
               conversationId,
               senderId: session.id,
               senderName: user?.name || session.name || "User",
               senderAvatar: user?.image || "/images/avatar-25.webp",
               message: message ? message.trim() : null,
               attachments: attachments || null,
               isRead: false,
            },
         }),
         prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
         }),
      ]);

      // Create notification only for members who have NOT muted this chat
      const memberIds: string[] = Array.isArray(conversation.members) ? (conversation.members as string[]) : [];
      const mutedUserIds: string[] = Array.isArray(conversation.mutedUserIds) ? (conversation.mutedUserIds as string[]) : [];

      for (const recipientId of memberIds) {
         if (recipientId !== session.id && !mutedUserIds.includes(recipientId)) {
            await prisma.notification.create({
               data: {
                  userId: recipientId,
                  title: `New message from ${user?.name || session.name || "Colleague"}`,
                  message: message ? message.slice(0, 100) : "Sent an attachment",
                  category: "Chat",
                  type: "info",
                  link: `/admin/chat?conversationId=${conversationId}`,
               },
            }).catch(() => {});
         }
      }

      return NextResponse.json(createdMessage, { status: 201 });
   } catch {
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
   }
}
