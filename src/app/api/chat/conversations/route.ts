import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;
   const session = sessionGate.session;

   try {
      const [allConversations, users] = await Promise.all([
         prisma.conversation.findMany({
            orderBy: { updatedAt: "desc" },
            include: {
               messages: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
               },
            },
         }),
         prisma.user.findMany({
            where: { status: "ACTIVE" },
            select: {
               id: true,
               customId: true,
               name: true,
               email: true,
               image: true,
               status: true,
               role: { select: { name: true } },
            },
         }),
      ]);

      // CHAT-01 fix (list side): a user only ever sees conversations
      // they are a member of — previously every conversation in the
      // system was returned to every signed-in user. Membership is a
      // JSON array (DB-07), so filtering happens here.
      const conversations = allConversations.filter((c: any) => {
         const memberIds: string[] = Array.isArray(c.members) ? c.members : [];
         return memberIds.includes(session.id);
      });

      // Enrich conversations with other member's identity if direct
      const enrichedConversations = conversations.map((c: any) => {
         const memberIds: string[] = Array.isArray(c.members) ? c.members : [];
         const isMuted = Array.isArray(c.mutedUserIds) && c.mutedUserIds.includes(session.id);
         if (c.type === "direct") {
            const otherUserId = memberIds.find((id) => id !== session.id) || memberIds[0];
            const otherUser = users.find((u) => u.id === otherUserId);
            return {
               ...c,
               isMuted,
               displayName: otherUser?.name || "Staff Member",
               avatar: otherUser?.image || "/images/avatar-25.webp",
               customId: otherUser?.customId,
               otherUserId,
               description: c.description || "",
            };
         }
         return {
            ...c,
            isMuted,
            displayName: c.name || "Staff Group",
            avatar: c.avatar || "/images/avatar-25.webp",
            description: c.description || "",
         };
      });

      return NextResponse.json({ conversations: enrichedConversations, users });
   } catch {
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
   }
}

export async function PUT(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;
   const session = sessionGate.session;

   try {
      const body = await request.json();
      const { conversationId, action, isMuted, name, avatar, description } = body;
      const targetUserId =
         typeof body.userId === "string"
            ? body.userId
            : typeof body.memberId === "string"
              ? body.memberId
              : null;

      if (!conversationId) {
         return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
      }

      const conv = await prisma.conversation.findUnique({
         where: { id: conversationId },
      });

      if (!conv) {
         return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      // CHAT-01 fix: mute/profile actions require membership too.
      const convMemberIds: string[] = Array.isArray(conv.members)
         ? (conv.members as string[])
         : [];
      if (!convMemberIds.includes(session.id)) {
         return NextResponse.json(
            { error: "Forbidden: not a conversation member" },
            { status: 403 },
         );
      }

      const currentMuted = Array.isArray(conv.mutedUserIds) ? (conv.mutedUserIds as string[]) : [];

      // P2-9: adminIds enforcement. Conversation.adminIds (JSON
      // array of user IDs, set to the creator at creation) governs
      // group settings and member management. Legacy conversations
      // whose adminIds were never recorded (null/empty) keep the
      // previous any-member behaviour — there is no recorded admin
      // to enforce — while conversations WITH admins recorded
      // require the caller to be one of them for those operations.
      const adminIds: string[] = Array.isArray(conv.adminIds)
         ? (conv.adminIds as string[])
         : [];
      const callerIsAdmin = adminIds.includes(session.id);
      const requireAdmin = () => {
         if (adminIds.length > 0 && !callerIsAdmin) {
            return NextResponse.json(
               { error: "Forbidden: only group admins can do this" },
               { status: 403 },
            );
         }
         return null;
      };

      // 0. Member management (group conversations only — a direct
      // conversation's membership IS the pair). Adding requires an
      // admin (when admins are recorded); removing another member
      // requires an admin, while any member may remove themselves
      // (leave). Removing a member also strips any admin record
      // for them so adminIds never points at a non-member.
      if (action === "add_member" || action === "remove_member") {
         if (conv.type !== "group") {
            return NextResponse.json(
               { error: "Member management is only available for group conversations" },
               { status: 400 },
            );
         }
         if (!targetUserId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
         }

         if (action === "add_member") {
            const denied = requireAdmin();
            if (denied) return denied;
            const target = await prisma.user.findUnique({
               where: { id: targetUserId },
               select: { id: true, status: true },
            });
            if (!target || target.status !== "ACTIVE") {
               return NextResponse.json(
                  { error: "User not found or not active" },
                  { status: 404 },
               );
            }
            const nextMembers = Array.from(new Set([...convMemberIds, targetUserId]));
            const updated = await prisma.conversation.update({
               where: { id: conversationId },
               data: { members: nextMembers },
            });
            return NextResponse.json({
               message: "Member added",
               conversation: updated,
               ...updated,
            });
         }

         // remove_member
         if (targetUserId !== session.id) {
            const denied = requireAdmin();
            if (denied) return denied;
         }
         if (!convMemberIds.includes(targetUserId)) {
            return NextResponse.json(
               { error: "User is not a member of this conversation" },
               { status: 404 },
            );
         }
         const updated = await prisma.conversation.update({
            where: { id: conversationId },
            data: {
               members: convMemberIds.filter((id) => id !== targetUserId),
               adminIds: adminIds.filter((id) => id !== targetUserId),
            },
         });
         return NextResponse.json({
            message: "Member removed",
            conversation: updated,
            ...updated,
         });
      }

      // 1. Mute / Unmute
      if (action === "mute" || action === "unmute" || isMuted !== undefined) {
         const shouldMute = isMuted !== undefined ? Boolean(isMuted) : action === "mute";
         let updatedMuted: string[];
         if (shouldMute) {
            updatedMuted = Array.from(new Set([...currentMuted, session.id]));
         } else {
            updatedMuted = currentMuted.filter((id) => id !== session.id);
         }

         const updated = await prisma.conversation.update({
            where: { id: conversationId },
            data: { mutedUserIds: updatedMuted },
         });

         return NextResponse.json({
            message: shouldMute ? "Conversation muted" : "Conversation unmuted",
            isMuted: shouldMute,
            conversation: updated,
            ...updated,
         });
      }

      // 2. Edit Group Profile — P2-9: a group-settings operation,
      // so it is admin-gated whenever adminIds are recorded.
      if (
         action === "edit_profile" ||
         action === "update_profile" ||
         name !== undefined ||
         avatar !== undefined ||
         description !== undefined
      ) {
         if (conv.type !== "group") {
            return NextResponse.json({ error: "Only group conversations have editable profiles" }, { status: 400 });
         }
         const denied = requireAdmin();
         if (denied) return denied;

         const updated = await prisma.conversation.update({
            where: { id: conversationId },
            data: {
               name: name !== undefined ? String(name).trim() : undefined,
               avatar: avatar !== undefined ? avatar : undefined,
               description: description !== undefined ? String(description).trim() : undefined,
            },
         });

         return NextResponse.json({
            message: "Group profile updated successfully",
            conversation: updated,
            ...updated,
         });
      }

      return NextResponse.json({ error: "No recognized action or field provided" }, { status: 400 });
   } catch {
      return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;
   const session = sessionGate.session;

   try {
      const body = await request.json();
      const rawType = body.type || (body.name ? "group" : "direct");
      const { name, memberIds = [], description, avatar } = body;

      // 1. Direct conversation duplicate prevention
      if (rawType === "direct" && memberIds.length > 0) {
         const targetId = memberIds.find((id: string) => id !== session.id) || memberIds[0];
         const allDirects = await prisma.conversation.findMany({
            where: { type: "direct" },
         });

         const existingMatch = allDirects.find((c: any) => {
            const m = Array.isArray(c.members) ? c.members : [];
            return m.includes(session.id) && m.includes(targetId);
         });

         if (existingMatch) {
            return NextResponse.json(existingMatch, { status: 200 });
         }
      }

      // Ensure session user is in members
      const allMembers = Array.from(new Set([session.id, ...memberIds]));

      const conversation = await prisma.conversation.create({
         data: {
            type: rawType,
            name: rawType === "group" ? (name || "New Group") : null,
            description: rawType === "group" ? (description || null) : null,
            avatar: rawType === "group" ? (avatar || null) : null,
            members: allMembers,
            adminIds: [session.id],
         },
      });

      return NextResponse.json(conversation, { status: 201 });
   } catch {
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
   }
}
