import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import {
   parseChatLimit,
   parseChatCursor,
   parseChatSince,
   olderThanCursorWhere,
   newerThanSinceWhere,
   chatPageMeta,
   normalizeChatAttachment,
   toggleReaction,
} from "@src/lib/chatMessages";

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
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;
   const session = sessionGate.session;

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
      //
      // P2-8: the history is no longer returned unbounded. Three
      // modes, all returning the SAME envelope
      // `{ messages, hasMore, nextBefore, nextBeforeId }` with
      // messages in ascending createdAt order (the order the UI
      // renders):
      //  - default / cursor mode: the newest `limit` messages at or
      //    before the `before`+`beforeId` cursor (or simply the
      //    newest page when no cursor is given);
      //  - `since` (+ optional `sinceId`) mode for polling: only
      //    messages strictly after that point, ascending, capped at
      //    the max page size — the client appends them and never
      //    re-downloads history.
      const limit = parseChatLimit(searchParams.get("limit"));
      const since = parseChatSince(
         searchParams.get("since"),
         searchParams.get("sinceId"),
      );

      if (since) {
         const messages = await prisma.chatMessage.findMany({
            where: {
               conversationId,
               ...newerThanSinceWhere(since),
            },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: limit,
         });
         return NextResponse.json({
            messages,
            // A full page in since-mode means more may already be
            // waiting; the client's next poll continues from the
            // newest message it now holds.
            hasMore: messages.length === limit,
            nextBefore: null,
            nextBeforeId: null,
         });
      }

      const cursor = parseChatCursor(
         searchParams.get("before"),
         searchParams.get("beforeId"),
         searchParams.get("cursor"),
      );
      // Probe one row past the page to know whether older history
      // exists, fetching newest-first, then present ascending.
      const probed = await prisma.chatMessage.findMany({
         where: {
            conversationId,
            ...(cursor ? olderThanCursorWhere(cursor) : {}),
         },
         orderBy: [{ createdAt: "desc" }, { id: "desc" }],
         take: limit + 1,
      });
      const messages = probed.slice(0, limit).reverse();
      return NextResponse.json({
         messages,
         ...chatPageMeta(messages, probed.length, limit),
      });
   } catch {
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;
   const session = sessionGate.session;

   try {
      const body = await request.json();
      const message = body.message || body.content;
      const { conversationId, action } = body;
      // P2-9: attachments are stored as the single attachment
      // object the chat UI renders ({ type, url, name }) — the
      // composer uploads the file through POST /api/uploads first
      // and sends only the resulting URL. Normalising here keeps a
      // malformed payload from persisting an unrenderable shape.
      const attachments = normalizeChatAttachment(body.attachments);

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

      // P2-9: reactions are persisted on ChatMessage.reactions
      // (JSON map userId → unified emoji code, the shape
      // handler/chatData.ts already types). Toggling the same emoji
      // removes it. Any member may react to any message in the
      // conversation; membership was verified above.
      if (action === "react") {
         const { messageId, reaction } = body;
         if (!messageId || typeof reaction !== "string" || !reaction) {
            return NextResponse.json(
               { error: "messageId and reaction are required" },
               { status: 400 },
            );
         }
         const target = await prisma.chatMessage.findFirst({
            where: { id: messageId, conversationId },
            select: { id: true, reactions: true },
         });
         if (!target) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
         }
         const reactions = toggleReaction(target.reactions, session.id, reaction);
         const updated = await prisma.chatMessage.update({
            where: { id: target.id },
            data: { reactions },
         });
         return NextResponse.json(updated);
      }

      if (!message && !attachments) {
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
               // The normalised object (or null when absent) — cast
               // as the previous untyped body value was.
               attachments: (attachments || null) as any,
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
