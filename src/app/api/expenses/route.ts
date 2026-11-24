import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { parsePagination } from "@src/lib/pagination";
import { generateNextEntityId } from "@src/lib/idGenerator";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
} from "@src/lib/audit";
import { validateUserExpenseAmount } from "@src/lib/expenses";

export async function GET(request: NextRequest) {
   const sessionGate = await requirePermission(request, ["expenses", "expense", "expense_view_expense", "expense_create"]);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const { searchParams } = new URL(request.url);
   // Follow-up round: the ?all=true / ?export=true escape hatch
   // (one unbounded 10,000-row response for any active session) is
   // removed — no client used it; exports page through this list
   // via fetchAllPages. The route now always paginates normally.
   const { page, limit } = parsePagination(searchParams, 50);
   const type = searchParams.get("type") || undefined;
   // Phase 2 (2.1): free-text search so the list toolbar's search box
   // works against the same filtered set the pagination total counts.
   const search = searchParams.get("search")?.trim() || "";
   const skip = (page - 1) * limit;

   const where: any = { isDeleted: false };
   if (type) {
      where.type = { contains: type };
   }
   if (search) {
      where.OR = [
         { type: { contains: search } },
         { note: { contains: search } },
         { customId: { contains: search } },
      ];
   }

   try {
      const [expenses, total, amountAgg] = await Promise.all([
         prisma.expense.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
         }),
         prisma.expense.count({ where }),
         // OBS-H1: the Expenses page showed no money total at all.
         // Sum over the same filtered set the list/count use.
         prisma.expense.aggregate({ where, _sum: { amount: true } }),
      ]);

      return NextResponse.json({
         expenses,
         total,
         page,
         limit,
         totalAmount: Number(amountAgg._sum.amount || 0),
      });
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch expenses" },
         { status: 500 },
      );
   }
}

export async function POST(request: NextRequest) {
   const gate = await requirePermission(request, ["expenses", "expense", "expense_create"]);
   if (gate instanceof NextResponse) return gate;
   const session = gate.session;

   try {
      const body = await request.json();
      const { type, amount, note } = body;

      if (!type || amount === undefined) {
         return NextResponse.json(
            { error: "Expense type and amount are required" },
            { status: 400 },
         );
      }

      // EXP-01 fix: reject non-numeric amounts with 400 instead of
      // persisting NaN / throwing a 500.
      // C4-1 (audit P2-10): a USER-created expense must also be
      // positive — a negative expense is money back in and would
      // inflate profit through the shared formula. The system's
      // one legitimate negative row (the CASH_REFUND "Purchase
      // Return Refund" expense) is created internally by the
      // returns flow via Prisma directly, never through this
      // endpoint, so this policy cannot break refunds.
      const amountCheck = validateUserExpenseAmount(amount);
      if (!amountCheck.ok) {
         return NextResponse.json(
            { error: amountCheck.error },
            { status: 400 },
         );
      }
      const parsedAmount = amountCheck.amount;

      const auditCtx = requestAuditContext(request);

      const expense = await prisma.$transaction(async (tx) => {
         const { customId } = await generateNextEntityId("EXPENSE", tx);

         const created = await tx.expense.create({
            data: {
               customId,
               type,
               amount: parsedAmount,
               note: note || null,
               createdById: session.id,
            },
         });

         // Phase 4 (D1): audit in the same transaction.
         await logAudit(tx, {
            actor: auditActorFromContext(gate),
            action: "CREATE",
            entityType: "EXPENSE",
            entityId: created.id,
            entityCustomId: created.customId,
            summary: `Expense ${created.customId} created — ${type}, ৳${parsedAmount.toFixed(2)}`,
            ...auditCtx,
         });

         return created;
      });

      return NextResponse.json(expense, { status: 201 });
   } catch {
      return NextResponse.json(
         { error: "Failed to create expense" },
         { status: 500 },
      );
   }
}
