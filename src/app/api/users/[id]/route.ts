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

      // Resolve role / roleId if provided
      let resolvedRoleId: string | null | undefined = undefined;
      if (body.roleId !== undefined) {
         resolvedRoleId = body.roleId || null;
      } else if (body.role !== undefined) {
         if (!body.role) {
            resolvedRoleId = null;
         } else {
            const roleStr = String(body.role).trim();
            const matchedRole = await prisma.role.findFirst({
               where: {
                  OR: [
                     { id: roleStr },
                     { name: roleStr },
                  ],
               },
            });
            if (matchedRole) {
               resolvedRoleId = matchedRole.id;
            } else {
               const allRoles = await prisma.role.findMany();
               const fuzzy = allRoles.find(
                  (r) =>
                     r.name.toLowerCase() === roleStr.toLowerCase() ||
                     r.name.toLowerCase().includes(roleStr.toLowerCase()) ||
                     roleStr.toLowerCase().includes(r.name.toLowerCase()),
               );
               if (fuzzy) {
                  resolvedRoleId = fuzzy.id;
               }
            }
         }
      }

      // SEC-01 fix: updating ANOTHER account, or changing privileged
      // fields (role, status, salary) on any account, requires the
      // user-management permission. A user may still update their own
      // basic profile fields and password — this prevents privilege
      // self-escalation through the API.
      const touchesPrivilegedFields =
         resolvedRoleId !== undefined ||
         body.roleId !== undefined ||
         body.role !== undefined ||
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
      if (resolvedRoleId !== undefined) dataToUpdate.roleId = resolvedRoleId;
      if (body.status !== undefined) dataToUpdate.status = body.status.toUpperCase();
      if (body.image !== undefined) dataToUpdate.image = body.image;
      // P4-13: email changes normalise (trim + lowercase) before
      // the duplicate check and storage, matching user creation —
      // a case-variant of another account's email is a 409, not a
      // unique-index 500.
      if (body.email !== undefined) {
         const normalizedEmail = String(body.email).trim().toLowerCase();
         if (!normalizedEmail) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
         }
         const clash = await prisma.user.findFirst({
            where: { email: normalizedEmail, id: { not: id } },
            select: { id: true },
         });
         if (clash) {
            return NextResponse.json({ error: "Email already in use" }, { status: 409 });
         }
         dataToUpdate.email = normalizedEmail;
      }
      if (body.password) {
         // P4-13: same minimum length as register / user create (6).
         if (String(body.password).length < 6) {
            return NextResponse.json(
               { error: "Password must be at least 6 characters" },
               { status: 400 },
            );
         }
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

         const { passwordHash: _, role: updatedRole, ...safeUser } = updated;
         return NextResponse.json({
            ...safeUser,
            role: updatedRole?.name || "Staff",
            roleDetails: updatedRole,
         });
      }

      const updated = await prisma.user.update({
         where: { id },
         data: dataToUpdate,
         include: { role: true },
      });

      const { passwordHash: _, role: updatedRole, ...safeUser } = updated;
      return NextResponse.json({
         ...safeUser,
         role: updatedRole?.name || "Staff",
         roleDetails: updatedRole,
      });
   } catch (error: any) {
      // P4-13: a race past the email duplicate check hits the
      // unique index — that is a 409, not a 500.
      if (error?.code === "P2002") {
         return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   // SEC-01 fix: deleting an account requires user-management rights.
   const gate = await requirePermission(request, USER_DELETE_KEYS);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      const targetUser = await prisma.user.findFirst({
         where: { OR: [{ id }, { customId: id }] },
      });
      if (!targetUser) {
         return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      // Prevent self-deletion
      if (gate.userId === targetUser.id) {
         return NextResponse.json(
            { error: "You cannot delete your own account" },
            { status: 400 },
         );
      }

      await prisma.$transaction(async (tx) => {
         // Unlink nullable foreign keys so foreign key constraints are satisfied
         await tx.order.updateMany({
            where: { employeeId: targetUser.id },
            data: { employeeId: null },
         });
         await tx.purchase.updateMany({
            where: { createdById: targetUser.id },
            data: { createdById: null },
         });
         await tx.expense.updateMany({
            where: { createdById: targetUser.id },
            data: { createdById: null },
         });
         await tx.purchaseReturn.updateMany({
            where: { createdById: targetUser.id },
            data: { createdById: null },
         });
         await tx.supplierPayment.updateMany({
            where: { createdById: targetUser.id },
            data: { createdById: null },
         });

         await tx.user.delete({
            where: { id: targetUser.id },
         });

         await logAudit(tx, {
            actor: auditActorFromContext(gate),
            action: "DELETE",
            entityType: "USER",
            entityId: targetUser.id,
            entityCustomId: targetUser.customId,
            summary: `Employee ${targetUser.name || targetUser.email} deleted`,
            ...requestAuditContext(request),
         });
      });

      return NextResponse.json({ message: "Employee deleted successfully" });
   } catch {
      return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
   }
}
