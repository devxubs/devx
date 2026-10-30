import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(
   _request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   try {
      const unit = await prisma.unit.findUnique({
         where: { id },
      });

      if (!unit) {
         return NextResponse.json({ error: "Unit not found" }, { status: 404 });
      }

      return NextResponse.json(unit);
   } catch {
      return NextResponse.json({ error: "Failed to fetch unit" }, { status: 500 });
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
      const { name, operator, operationValue } = body;

      const data: any = {};
      if (name != null) data.name = name.trim();
      if (operator != null) data.operator = operator;
      if (operationValue != null) data.operationValue = Number(operationValue);

      const updated = await prisma.unit.update({
         where: { id },
         data,
      });

      return NextResponse.json(updated);
   } catch {
      return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
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
      await prisma.unit.update({ where: { id }, data: { isDeleted: true } });
      return NextResponse.json({ message: "Unit moved to Recycle Bin" });
   } catch {
      return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 });
   }
}
