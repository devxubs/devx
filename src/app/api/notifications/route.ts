import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      // NOTIF-01 fix: notifications are per-user. A user sees their own
      // notifications plus broadcasts (userId = null, e.g. low-stock
      // alerts) — never other users' private notifications. The unread
      // count uses the same scope so the badge can stay in sync.
      const visibilityScope = {
         OR: [{ userId: session.id }, { userId: null }],
      };

      const [notifications, unreadCount] = await Promise.all([
         prisma.notification.findMany({
            where: visibilityScope,
            orderBy: { createdAt: "desc" },
            take: 50,
         }),
         prisma.notification.count({
            where: { ...visibilityScope, isRead: false, isArchived: false },
         }),
      ]);

      return NextResponse.json({
         notifications,
         unreadCount,
      });
   } catch {
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const body = await request.json();
      const { action, id, title, message, category, type, link } = body;

      // NOTIF-01 fix: every mutation is scoped to notifications the
      // caller may see (their own or broadcasts).
      const visibilityScope = {
         OR: [{ userId: session.id }, { userId: null }],
      };

      if (action === "mark_all_read") {
         await prisma.notification.updateMany({
            where: { ...visibilityScope, isRead: false },
            data: { isRead: true },
         });
         return NextResponse.json({ message: "All notifications marked as read" });
      }

      if (action === "toggle_read" && id) {
         const notif = await prisma.notification.findFirst({
            where: { id, ...visibilityScope },
         });
         if (!notif) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
         const updated = await prisma.notification.update({
            where: { id },
            data: { isRead: !notif.isRead },
         });
         return NextResponse.json(updated);
      }

      if (action === "toggle_archive" && id) {
         const notif = await prisma.notification.findFirst({
            where: { id, ...visibilityScope },
         });
         if (!notif) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
         const updated = await prisma.notification.update({
            where: { id },
            data: { isArchived: !notif.isArchived },
         });
         return NextResponse.json(updated);
      }

      if (action === "delete" && id) {
         const notif = await prisma.notification.findFirst({
            where: { id, ...visibilityScope },
         });
         if (!notif) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
         await prisma.notification.delete({ where: { id } });
         return NextResponse.json({ message: "Notification deleted" });
      }

      if (title && message) {
         const created = await prisma.notification.create({
            data: {
               title: title.trim(),
               message: message.trim(),
               category: category || "System",
               type: type || "info",
               link: link || null,
               isRead: false,
               userId: session.id,
            },
         });
         return NextResponse.json(created, { status: 201 });
      }

      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
   } catch {
      return NextResponse.json({ error: "Failed to process notification action" }, { status: 500 });
   }
}
