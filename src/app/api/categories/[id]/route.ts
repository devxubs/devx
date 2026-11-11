import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const category = await prisma.category.findUnique({
         where: { id },
         include: { products: true },
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
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

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
   } catch {
      return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
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
      await prisma.category.update({ where: { id }, data: { isDeleted: true } });
      return NextResponse.json({ message: "Category moved to Recycle Bin" });
   } catch {
      return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
   }
}
