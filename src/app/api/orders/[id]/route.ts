import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(
   _request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   try {
      const order = await prisma.order.findFirst({
         where: {
            OR: [{ id }, { customId: id }, { orderId: id }, { invoiceNo: id }],
         },
         include: {
            customer: true,
            employee: { select: { id: true, name: true, email: true, phoneNumber: true } },
            items: { include: { product: true } },
         },
      });

      if (!order) {
         return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      return NextResponse.json(order);
   } catch {
      return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
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
      const updated = await prisma.order.update({
         where: { id },
         data: {
            status: body.status !== undefined ? body.status : undefined,
            orderNote: body.orderNote !== undefined ? body.orderNote : undefined,
            orderSource: body.orderSource !== undefined ? body.orderSource : undefined,
            paymentMethod: body.paymentMethod !== undefined ? body.paymentMethod : undefined,
            advancePayment: body.advancePayment !== undefined ? parseFloat(body.advancePayment) : undefined,
            dueAmount: body.dueAmount !== undefined ? parseFloat(body.dueAmount) : undefined,
            cancellationReason: body.cancellationReason !== undefined ? body.cancellationReason : undefined,
            deliveredAt: body.deliveredAt ? new Date(body.deliveredAt) : undefined,
         },
         include: {
            customer: true,
            items: true,
         },
      });

      return NextResponse.json(updated);
   } catch {
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
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
      const order = await prisma.order.update({
         where: { id },
         data: { isDeleted: true },
      });

      return NextResponse.json({ message: "Order moved to bin", order });
   } catch {
      return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
   }
}
