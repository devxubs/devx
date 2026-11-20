import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
   buildChanges,
} from "@src/lib/audit";
import { validateUserExpenseAmount } from "@src/lib/expenses";

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

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
   const gate = await requirePermission(request, ["expenses", "expense", "expense_update"]);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;
   try {
      const body = await request.json();
      // C4-1 (audit P2-10): the PUT amount was never re-validated —
      // a non-numeric amount flowed in as NaN and surfaced as a 500.
      // When a user changes the amount it must satisfy the same
      // policy as creation (finite and > 0) → 400, never 500.
      let validatedAmount: number | undefined;
      if (body.amount !== undefined) {
         const amountCheck = validateUserExpenseAmount(body.amount);
         if (!amountCheck.ok) {
            return NextResponse.json(
               { error: amountCheck.error },
               { status: 400 },
            );
         }
         validatedAmount = amountCheck.amount;
      }
      const auditCtx = requestAuditContext(request);
      const expense = await prisma.$transaction(async (tx) => {
         const before = await tx.expense.findUnique({ where: { id } });
         const updated = await tx.expense.update({
            where: { id },
            data: {
               type: body.type,
               amount: validatedAmount,
               note: body.note !== undefined ? body.note : undefined,
            },
         });

         // Phase 4 (D1): audit in the same transaction.
         // Follow-up round: a no-op PUT (empty computed diff)
         // writes no UPDATE audit row.
         if (before) {
            const changes = buildChanges(before, updated, ["type", "amount", "note"]);
            if (changes) {
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "UPDATE",
                  entityType: "EXPENSE",
                  entityId: updated.id,
                  entityCustomId: updated.customId,
                  summary: `Expense ${updated.customId || updated.id} updated`,
                  changes,
                  ...auditCtx,
               });
            }
         }

         return updated;
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
   const gate = await requirePermission(request, ["expenses", "expense", "expense_delete"]);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;
   try {
      const auditCtx = requestAuditContext(request);
      await prisma.$transaction(async (tx) => {
         const before = await tx.expense.findUnique({ where: { id } });
         await tx.expense.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() },
         });

         // Phase 4 (D1): audit in the same transaction.
         if (before && !before.isDeleted) {
            await logAudit(tx, {
               actor: auditActorFromContext(gate),
               action: "DELETE",
               entityType: "EXPENSE",
               entityId: before.id,
               entityCustomId: before.customId,
               summary: `Expense ${before.customId || before.id} moved to bin — ${before.type}, ৳${Number(before.amount).toFixed(2)}`,
               ...auditCtx,
            });
         }
      });
      return NextResponse.json({ success: true });
   } catch {
      return NextResponse.json(
         { error: "Failed to delete expense" },
         { status: 500 },
      );
   }
}
