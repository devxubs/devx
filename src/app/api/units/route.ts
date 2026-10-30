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
      const units = await prisma.unit.findMany({
         where: { isDeleted: false },
         orderBy: { name: "asc" },
      });
      return NextResponse.json(units);
   } catch {
      return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
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
         return NextResponse.json({ error: "Unit name is required" }, { status: 400 });
      }

      const { customId } = await generateNextEntityId("UNIT");

      const unit = await prisma.unit.create({
         data: { customId, name: name.trim() },
      });
      return NextResponse.json(unit, { status: 201 });
   } catch (error: any) {
      if (error?.code === "P2002") {
         return NextResponse.json({ error: "Unit already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create unit" }, { status: 500 });
   }
}
