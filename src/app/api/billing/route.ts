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
      const [transactions, totalSettledAgg, totalPendingAgg, totalChargesAgg] = await Promise.all([
         prisma.billingTransaction.findMany({
            orderBy: { createdAt: "desc" },
         }),
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
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

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
