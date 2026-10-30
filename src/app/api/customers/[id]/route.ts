import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(
   _request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   try {
      const customer = await prisma.customer.findFirst({
         where: {
            OR: [{ id }, { customId: id }],
         },
         include: {
            orders: {
               where: { isDeleted: false },
               orderBy: { createdAt: "desc" },
               include: {
                  items: true,
               },
            },
         },
      });

      if (!customer) {
         return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }

      const orders = customer.orders || [];
      const totalOrders = orders.length;
      const deliveredOrders = orders.filter(
         (o) => o.status === "COMPLETED" || o.status === "DELIVERED",
      ).length;
      const unsuccessfulOrders = orders.filter(
         (o) => o.status === "CANCELLED" || o.status === "FAILED",
      ).length;
      const pendingOrders = totalOrders - deliveredOrders - unsuccessfulOrders;
      const successRate =
         totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 100;

      return NextResponse.json({
         ...customer,
         stats: {
            totalOrders,
            deliveredOrders,
            unsuccessfulOrders,
            pendingOrders,
            successRate,
         },
      });
   } catch {
      return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
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
      const updated = await prisma.customer.update({
         where: { id },
         data: {
            name: body.name !== undefined ? body.name.trim() : undefined,
            email: body.email !== undefined ? body.email.trim() : undefined,
            phone: body.phone !== undefined ? body.phone.trim() : undefined,
            address: body.address !== undefined ? body.address : undefined,
         },
      });

      return NextResponse.json(updated);
   } catch {
      return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
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
      await prisma.customer.update({ where: { id }, data: { isDeleted: true } });
      return NextResponse.json({ message: "Customer moved to Recycle Bin" });
   } catch {
      return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
   }
}
