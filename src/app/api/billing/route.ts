import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requireAdmin } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";
import { parsePagination } from "@src/lib/pagination";

export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const { searchParams } = new URL(request.url);

   try {
      // P4-2: the transaction list is paginated with the shared
      // parsePagination bounds (default 20, max 100); the response
      // gains total/page/limit. The three totals below stay GLOBAL
      // aggregates over every transaction (unchanged figures) — the
      // Billing page walks the bounded pages via fetchAllPages and
      // renders the same complete set as the old unbounded load.
      const { page, limit, skip } = parsePagination(searchParams, 20);
      const [transactions, total, totalSettledAgg, totalPendingAgg, totalChargesAgg] = await Promise.all([
         prisma.billingTransaction.findMany({
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
         }),
         prisma.billingTransaction.count(),
         prisma.billingTransaction.aggregate({
            where: { status: "COMPLETED" },
            _sum: { amount: true },
         }),
         prisma.billingTransaction.aggregate({
            where: { status: "PENDING" },
            _sum: { amount: true },
         }),
         prisma.billingTransaction.aggregate({
            _sum: { serviceCharge: true },
         }),
      ]);

      return NextResponse.json({
         transactions,
         total,
         page,
         limit,
         totalSettled: Number(totalSettledAgg._sum.amount || 0),
         totalPending: Number(totalPendingAgg._sum.amount || 0),
         totalCharges: Number(totalChargesAgg._sum.serviceCharge || 0),
      });
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch billing data" },
         { status: 500 },
      );
   }
}

export async function POST(request: NextRequest) {
   const gate = await requireAdmin(request);
   if (gate instanceof NextResponse) return gate;

   try {
      const body = await request.json();
      const { amount, paymentMethod, description } = body;

      if (!amount || !paymentMethod) {
         return NextResponse.json(
            { error: "Amount and payment method are required" },
            { status: 400 },
         );
      }

      const numAmount = parseFloat(amount);
      const serviceCharge = numAmount * 0.015; // 1.5% gateway/settlement fee
      const { customId } = await generateNextEntityId("BILLING");

      const transaction = await prisma.billingTransaction.create({
         data: {
            customId,
            amount: numAmount,
            paymentMethod,
            status: body.status || "PENDING",
            description: description || "POS settlement payout request",
            serviceCharge,
         },
      });

      return NextResponse.json(transaction, { status: 201 });
   } catch {
      return NextResponse.json(
         { error: "Failed to process billing transaction" },
         { status: 500 },
      );
   }
}
