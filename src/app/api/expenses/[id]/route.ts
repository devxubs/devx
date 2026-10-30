import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(
   _request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   try {
      const expense = await prisma.expense.findFirst({
         where: {
            OR: [{ id }, { customId: id }],
         },
         include: { createdBy: { select: { id: true, name: true, email: true } } },
      });

      if (!expense || expense.isDeleted) {
         return NextResponse.json({ error: "Expense not found" }, { status: 404 });
      }

      return NextResponse.json(expense);
   } catch {
      return NextResponse.json({ error: "Failed to fetch expense" }, { status: 500 });
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
      const expense = await prisma.expense.update({
         where: { id },
         data: {
            type: body.type,
            amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
            note: body.note !== undefined ? body.note : undefined,
         },
      });
      return NextResponse.json(expense);
   } catch {
      return NextResponse.json(
         { error: "Failed to update expense" },
         { status: 500 },
      );
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
      await prisma.expense.update({
         where: { id },
         data: { isDeleted: true },
      });
      return NextResponse.json({ success: true });
   } catch {
      return NextResponse.json(
         { error: "Failed to delete expense" },
         { status: 500 },
      );
   }
}
