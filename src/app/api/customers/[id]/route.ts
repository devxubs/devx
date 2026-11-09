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

      // Helper to check if order is delivered
      const isDelivered = (o: any) =>
         o.status === "COMPLETED" ||
         o.status === "DELIVERED" ||
         (o.courierStatus && o.courierStatus.toUpperCase() === "DELIVERED");

      // Helper to check if order had a courier failure (not unshipped/pre-courier cancellations)
      const isCourierFailed = (o: any) => {
         if (o.status === "FAILED") return true;
         if (o.courier && o.courier.trim() !== "") {
            const cs = (o.courierStatus || "").toUpperCase();
            if (cs === "FAILED" || cs === "RETURNED") return true;
            if (o.status === "CANCELLED" && o.courierSubmittedAt) return true;
         }
         return false;
      };

      const deliveredOrdersList = orders.filter(isDelivered);
      const deliveredOrders = deliveredOrdersList.length;

      const failedOrdersList = orders.filter(isCourierFailed);
      const failedOrders = failedOrdersList.length;

      const unshippedCancelledList = orders.filter(
         (o) => o.status === "CANCELLED" && !isCourierFailed(o),
      );
      const unshippedCancelled = unshippedCancelledList.length;

      const pendingOrders = Math.max(
         0,
         totalOrders - deliveredOrders - failedOrders - unshippedCancelled,
      );

      const totalAmountOrdered = orders.reduce(
         (sum, o) => sum + Number(o.total || 0),
         0,
      );
      const totalAmountDelivered = deliveredOrdersList.reduce(
         (sum, o) => sum + Number(o.total || 0),
         0,
      );

      const overallSuccessRate =
         deliveredOrders + failedOrders > 0
            ? Math.round((deliveredOrders / (deliveredOrders + failedOrders)) * 100)
            : totalOrders > 0 && deliveredOrders > 0
              ? 100
              : 0;

      // Courier-wise Statistics Calculation
      const courierMap = new Map<
         string,
         { totalOrders: number; delivered: number; failed: number; pending: number }
      >();

      for (const o of orders) {
         if (!o.courier || o.courier.trim() === "") continue;
         const courierName = o.courier.trim();
         if (!courierMap.has(courierName)) {
            courierMap.set(courierName, {
               totalOrders: 0,
               delivered: 0,
               failed: 0,
               pending: 0,
            });
         }
         const data = courierMap.get(courierName)!;
         data.totalOrders += 1;

         if (isDelivered(o)) {
            data.delivered += 1;
         } else if (isCourierFailed(o)) {
            data.failed += 1;
         } else if (o.status !== "CANCELLED") {
            data.pending += 1;
         }
      }

      const courierStats = Array.from(courierMap.entries()).map(
         ([courier, data]) => {
            const finished = data.delivered + data.failed;
            const successRate =
               finished > 0
                  ? Math.round((data.delivered / finished) * 100)
                  : data.delivered > 0
                    ? 100
                    : 0;
            return {
               courier,
               totalOrders: data.totalOrders,
               delivered: data.delivered,
               failed: data.failed,
               pending: data.pending,
               successRate,
            };
         },
      );

      // Courier Performance Summary
      let mostOrdersCourier = "-";
      let mostOrdersCount = 0;
      let mostSuccessfulCourier = "-";
      let mostSuccessCount = 0;
      let mostFailedCourier = "-";
      let mostFailedCount = 0;

      for (const cs of courierStats) {
         if (cs.totalOrders > mostOrdersCount) {
            mostOrdersCount = cs.totalOrders;
            mostOrdersCourier = cs.courier;
         }
         if (cs.delivered > mostSuccessCount) {
            mostSuccessCount = cs.delivered;
            mostSuccessfulCourier = cs.courier;
         }
         if (cs.failed > mostFailedCount) {
            mostFailedCount = cs.failed;
            mostFailedCourier = cs.courier;
         }
      }

      return NextResponse.json({
         ...customer,
         overallStats: {
            totalOrders,
            deliveredOrders,
            failedOrders,
            pendingOrders,
            unshippedCancelled,
            totalAmountOrdered,
            totalAmountDelivered,
            successRate: overallSuccessRate,
         },
         courierStats,
         courierPerformance: {
            mostOrdersCourier,
            mostOrdersCount,
            mostSuccessfulCourier,
            mostSuccessCount,
            mostFailedCourier,
            mostFailedCount,
         },
         // Backwards compatibility for previous stats structure
         stats: {
            totalOrders,
            deliveredOrders,
            unsuccessfulOrders: failedOrders + unshippedCancelled,
            pendingOrders,
            successRate: overallSuccessRate,
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
