import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";

export async function GET(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const categories = await prisma.category.findMany({
         where: { isDeleted: false },
         include: { _count: { select: { products: true } } },
         orderBy: { name: "asc" },
      });
      return NextResponse.json(categories);
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch categories" },
         { status: 500 },
      );
   }
}

export async function POST(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const body = await request.json();
      const { name } = body;
      if (!name) {
         return NextResponse.json(
            { error: "Category name is required" },
            { status: 400 },
         );
      }

      const { customId } = await generateNextEntityId("CATEGORY");

      const category = await prisma.category.create({
         data: { customId, name: name.trim() },
      });
      return NextResponse.json(category, { status: 201 });
   } catch (error: any) {
      if (error?.code === "P2002") {
         return NextResponse.json(
            { error: "Category already exists" },
            { status: 409 },
         );
      }
      return NextResponse.json(
         { error: "Failed to create category" },
         { status: 500 },
      );
   }
}
