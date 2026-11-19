import { NextRequest, NextResponse } from "next/server";
import {
   hashPassword,
   requireActiveSession,
   requirePermission,
} from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
   buildChanges,
} from "@src/lib/audit";

// Permission keys (seed + Roles-UI shapes) that grant user management.
const USER_UPDATE_KEYS = ["users", "user", "user_update", "user_view_user"];
const USER_DELETE_KEYS = ["users", "user", "user_delete", "user_suspend"];

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const { id } = await params;
   try {
      const user = await prisma.user.findFirst({
         where: {
            OR: [{ id }, { customId: id }, { email: id }],
         },
         include: {
            role: true,
            ordersHandled: { select: { id: true, total: true, status: true } },
         },
      });

      if (!user) {
         return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Phase 1 (S-8): a single-user record exposes salary and contact
      // details — readable by the account owner or by user managers,
      // not by any signed-in account.
      if (user.id !== sessionGate.userId) {
         const gate = await requirePermission(request, USER_UPDATE_KEYS);
         if (gate instanceof NextResponse) return gate;
      }

      const { passwordHash: _, role, ...rest } = user;
      return NextResponse.json({
         ...rest,
         role: role?.name || "Staff",
         roleDetails: role,
      });
   } catch {
      return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
   }
}

export async function PUT(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;
   const session = sessionGate.session;

   const { id } = await params;

   try {
      const body = await request.json();

      // SEC-01 fix: updating ANOTHER account, or changing privileged
      // fields (role, status, salary) on any account, requires the
      // user-management permission. A user may still update their own
      // basic profile fields and password — this prevents privilege
      // self-escalation through the API.
      const touchesPrivilegedFields =
         body.roleId !== undefined ||
         body.status !== undefined ||
         body.salary !== undefined;
      const isSelf = session.id === id;
      let gate: any = null;
      if (!isSelf || touchesPrivilegedFields) {
         gate = await requirePermission(request, USER_UPDATE_KEYS);
         if (gate instanceof NextResponse) return gate;
      }

      const dataToUpdate: any = {};

      if (body.name !== undefined) dataToUpdate.name = body.name;
      if (body.phoneNumber !== undefined) dataToUpdate.phoneNumber = body.phoneNumber;
      if (body.address !== undefined) dataToUpdate.address = body.address;
      if (body.salary !== undefined) dataToUpdate.salary = body.salary;
      if (body.roleId !== undefined) dataToUpdate.roleId = body.roleId;
      if (body.status !== undefined) dataToUpdate.status = body.status.toUpperCase();
      if (body.image !== undefined) dataToUpdate.image = body.image;
      if (body.password) {
         dataToUpdate.passwordHash = await hashPassword(body.password);
      }

      // Phase 4 (D1): role/status/salary changes are audited in the
      // same transaction as the update. Ordinary self profile edits
      // keep the plain update below (no audit row).
      if (touchesPrivilegedFields) {
         const updated = await prisma.$transaction(async (tx) => {
            const before = await tx.user.findUnique({ where: { id } });
            const result = await tx.user.update({
               where: { id },
               data: dataToUpdate,
               include: { role: true },
            });

            if (before) {
               const statusChanged =
                  body.status !== undefined &&
                  String(body.status).toUpperCase() !== before.status;
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: statusChanged ? "STATUS_CHANGE" : "UPDATE",
                  entityType: "USER",
                  entityId: before.id,
                  entityCustomId: before.customId,
                  summary: statusChanged
                     ? `User ${before.name || before.email} status changed from ${before.status} to ${result.status}`
                     : `User ${before.name || before.email} updated (role/status/salary)`,
                  changes: buildChanges(before, result, ["status", "roleId"]),
                  ...requestAuditContext(request),
               });
            }

            return result;
         });

         const { passwordHash: _, ...safeUser } = updated;
         return NextResponse.json(safeUser);
      }

      const updated = await prisma.user.update({
         where: { id },
         data: dataToUpdate,
         include: { role: true },
      });

      const { passwordHash: _, ...safeUser } = updated;
      return NextResponse.json(safeUser);
   } catch {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   // SEC-01 fix: deactivating an account requires user-management rights.
   const gate = await requirePermission(request, USER_DELETE_KEYS);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      await prisma.$transaction(async (tx) => {
         const before = await tx.user.findUnique({ where: { id } });
         await tx.user.update({
            where: { id },
            data: { status: "INACTIVE" },
         });

         // Phase 4 (D1): audit in the same transaction.
         if (before && before.status !== "INACTIVE") {
            await logAudit(tx, {
               actor: auditActorFromContext(gate),
               action: "STATUS_CHANGE",
               entityType: "USER",
               entityId: before.id,
               entityCustomId: before.customId,
               summary: `User ${before.name || before.email} deactivated (moved to Recycle Bin)`,
               changes: { status: { from: before.status, to: "INACTIVE" } },
               ...requestAuditContext(request),
            });
         }
      });
      return NextResponse.json({ message: "User moved to Recycle Bin" });
   } catch {
      return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
   }
}
