import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hashPassword } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(
   _request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
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
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

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
