import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

const ROLE_UPDATE_KEYS = ["roles", "role", "role_update_role", "role_update"];
const ROLE_DELETE_KEYS = ["roles", "role", "role_delete_role", "role_delete"];

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
      const role = await prisma.role.findUnique({
         where: { id },
         include: {
            // Never leak password hashes through the role detail view.
            users: {
               select: {
                  id: true,
                  customId: true,
                  name: true,
                  email: true,
                  phoneNumber: true,
                  image: true,
                  status: true,
               },
            },
         },
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
   const gate = await requirePermission(request, ROLE_UPDATE_KEYS);
   if (gate instanceof NextResponse) return gate;

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
   const gate = await requirePermission(request, ROLE_DELETE_KEYS);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      await prisma.role.delete({ where: { id } });
      return NextResponse.json({ message: "Role deleted successfully" });
   } catch {
      return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
   }
}
