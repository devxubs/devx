import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";

export async function GET(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { searchParams } = new URL(request.url);
   const isExportAll = searchParams.get("all") === "true" || searchParams.get("export") === "true";
   const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
   const limit = isExportAll ? 10000 : Math.min(parseInt(searchParams.get("limit") || "50"), 100);
   const type = searchParams.get("type") || undefined;
   const skip = isExportAll ? 0 : (page - 1) * limit;

   const where: any = { isDeleted: false };
   if (type) {
      where.type = { contains: type };
   }

   try {
      const [expenses, total] = await Promise.all([
         prisma.expense.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
         }),
         prisma.expense.count({ where }),
      ]);

      return NextResponse.json({ expenses, total, page, limit });
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch expenses" },
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
      const { type, amount, note } = body;

      if (!type || amount === undefined) {
         return NextResponse.json(
            { error: "Expense type and amount are required" },
            { status: 400 },
         );
      }

      const { customId } = await generateNextEntityId("EXPENSE");

      const expense = await prisma.expense.create({
         data: {
            customId,
            type,
            amount: parseFloat(amount),
            note: note || null,
            createdById: session.id,
         },
      });

      return NextResponse.json(expense, { status: 201 });
   } catch {
      return NextResponse.json(
         { error: "Failed to create expense" },
         { status: 500 },
      );
   }
}
