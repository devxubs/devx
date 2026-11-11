import { NextRequest, NextResponse } from "next/server";
import {
   getSessionUser,
   hashPassword,
   requirePermission,
} from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

// Permission keys (seed + Roles-UI shapes) that grant user management.
const USER_UPDATE_KEYS = ["users", "user", "user_update", "user_view_user"];
const USER_DELETE_KEYS = ["users", "user", "user_delete", "user_suspend"];

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

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
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

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
      if (!isSelf || touchesPrivilegedFields) {
         const gate = await requirePermission(request, USER_UPDATE_KEYS);
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
      await prisma.user.update({
         where: { id },
         data: { status: "INACTIVE" },
      });
      return NextResponse.json({ message: "User moved to Recycle Bin" });
   } catch {
      return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
   }
}
