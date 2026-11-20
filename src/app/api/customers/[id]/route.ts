import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { isValidOrder } from "@src/lib/orderStatus";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
   buildChanges,
} from "@src/lib/audit";

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   // Read gate (B3, audit S-1 / P1-9): the customers family (the
   // same keys the PUT/DELETE writes below use) guards this read
   // because it returns the customer's full order history.
   const gate = await requirePermission(request, [
      "customers",
      "customer",
      "customer_view_customer",
   ]);
   if (gate instanceof NextResponse) return gate;

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

      // Phase B1 (P1-2): the purchase totals below use the ONE
      // canonical valid-order definition (lib/orderStatus) — the
      // same one the Customers list and the Dashboard use. The old
      // totals counted every non-deleted order, so a cancelled
      // due-bearing order inflated this profile's figures while the
      // list showed a different due for the same customer.
      // `totalOrders` is therefore the VALID order count; the
      // delivered / failed / unshipped-cancelled breakdown further
      // down stays an operational courier-outcome breakdown over ALL
      // non-deleted orders (failed and cancelled parcels are exactly
      // what it exists to show), and the full order history in
      // `orders` is unchanged.
      const validOrders = orders.filter(isValidOrder);
      const totalOrders = validOrders.length;
      const totalPaid = validOrders.reduce(
         (sum, o) => sum + Number(o.advancePayment || 0),
         0,
      );
      const totalDue = validOrders.reduce(
         (sum, o) => sum + Number(o.dueAmount || 0),
         0,
      );

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

      // Delivered is counted inside the valid-order universe (a
      // CANCELLED order is never a delivered purchase); failed and
      // unshipped-cancelled stay counts over ALL non-deleted orders —
      // they are the courier-outcome breakdown, not purchase totals.
      const deliveredOrdersList = validOrders.filter(isDelivered);
      const deliveredOrders = deliveredOrdersList.length;

      const failedOrdersList = orders.filter(isCourierFailed);
      const failedOrders = failedOrdersList.length;

      const unshippedCancelledList = orders.filter(
         (o) => o.status === "CANCELLED" && !isCourierFailed(o),
      );
      const unshippedCancelled = unshippedCancelledList.length;

      const pendingOrders = Math.max(0, totalOrders - deliveredOrders);

      const totalAmountOrdered = validOrders.reduce(
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
            // Canonical money totals over valid orders (P1-2): the
            // same figures the Customers list shows for this customer.
            totalPaid,
            totalDue,
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
            totalPaid,
            totalDue,
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
   const gate = await requirePermission(request, ["customers", "customer", "customer_view_customer"]);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      const body = await request.json();

      // CUS-01 fix: same phone validation / duplicate guard as create.
      let normalizedPhone: string | undefined;
      if (body.phone !== undefined) {
         normalizedPhone = body.phone
            ? String(body.phone).replace(/[\s-]/g, "")
            : "";
         if (normalizedPhone && !/^\+?[0-9]{7,15}$/.test(normalizedPhone)) {
            return NextResponse.json(
               { error: "Invalid phone number format" },
               { status: 400 },
            );
         }
         if (normalizedPhone) {
            const duplicate = await prisma.customer.findFirst({
               where: {
                  phone: normalizedPhone,
                  isDeleted: false,
                  id: { not: id },
               },
               select: { id: true, customId: true, name: true },
            });
            if (duplicate) {
               return NextResponse.json(
                  {
                     error: "A customer with this phone number already exists",
                     existingCustomer: duplicate,
                  },
                  { status: 409 },
               );
            }
         }
      }

      const auditCtx = requestAuditContext(request);
      // P2-4: customer updates are audited in the same transaction;
      // a no-op PUT (empty diff) writes no row.
      const updated = await prisma.$transaction(async (tx) => {
         const before = await tx.customer.findUnique({ where: { id } });
         const result = await tx.customer.update({
            where: { id },
            data: {
               name: body.name !== undefined ? body.name.trim() : undefined,
               email: body.email !== undefined ? body.email.trim() : undefined,
               phone: normalizedPhone,
               address: body.address !== undefined ? body.address : undefined,
            },
         });

         if (before) {
            const changes = buildChanges(before, result, [
               "name",
               "email",
               "phone",
               "address",
            ]);
            if (changes) {
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "UPDATE",
                  entityType: "CUSTOMER",
                  entityId: result.id,
                  entityCustomId: result.customId,
                  summary: `Customer ${result.customId || result.name} updated`,
                  changes,
                  ...auditCtx,
               });
            }
         }

         return result;
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
   const gate = await requirePermission(request, ["customers", "customer", "customer_view_customer"]);
   if (gate instanceof NextResponse) return gate;

   const { id } = await params;

   try {
      const auditCtx = requestAuditContext(request);
      // P2-4: the soft delete is audited in the same transaction.
      await prisma.$transaction(async (tx) => {
         const before = await tx.customer.findUnique({ where: { id } });
         await tx.customer.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() },
         });
         if (before && !before.isDeleted) {
            await logAudit(tx, {
               actor: auditActorFromContext(gate),
               action: "DELETE",
               entityType: "CUSTOMER",
               entityId: before.id,
               entityCustomId: before.customId,
               summary: `Customer ${before.customId || before.name} moved to bin`,
               ...auditCtx,
            });
         }
      });
      return NextResponse.json({ message: "Customer moved to Recycle Bin" });
   } catch {
      return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
   }
}
