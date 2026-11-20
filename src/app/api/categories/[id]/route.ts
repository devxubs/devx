import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   try {
      const category = await prisma.category.findUnique({
         where: { id },
         // P4-12: the products include is filtered to live products —
         // the old unfiltered include leaked soft-deleted (binned)
         // products through the category detail response.
         include: { products: { where: { isDeleted: false } } },
      });

      if (!category) {
         return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }

      return NextResponse.json(category);
   } catch {
      return NextResponse.json({ error: "Failed to fetch category" }, { status: 500 });
   }
}

export async function PUT(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, ["categories", "category", "category_update"]);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      const body = await request.json();
      const { name } = body;

      if (!name) {
         return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }

      const updated = await prisma.category.update({
         where: { id },
         data: { name: name.trim() },
      });

      return NextResponse.json(updated);
   } catch (error: any) {
      // P4-12: renaming onto an existing category name hits the
      // unique index — a 409, matching category POST and the other
      // entity routes, instead of a raw 500.
      if (error?.code === "P2002") {
         return NextResponse.json(
            { error: "Category already exists" },
            { status: 409 },
         );
      }
      return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const gate = await requirePermission(request, ["categories", "category", "category_delete"]);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      await prisma.category.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
      return NextResponse.json({ message: "Category moved to Recycle Bin" });
   } catch {
      return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
   }
}
