import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(
   _request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   try {
      const role = await prisma.role.findUnique({
         where: { id },
         include: { users: true },
      });

      if (!role) {
         return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }

      return NextResponse.json(role);
   } catch {
      return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
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
      const updated = await prisma.role.update({
         where: { id },
         data: {
            name: body.name !== undefined ? body.name.trim() : undefined,
            description: body.description !== undefined ? body.description : undefined,
            permissions: body.permissions !== undefined ? body.permissions : undefined,
         },
      });

      return NextResponse.json(updated);
   } catch {
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
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
      await prisma.role.delete({ where: { id } });
      return NextResponse.json({ message: "Role deleted successfully" });
   } catch {
      return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
   }
}
