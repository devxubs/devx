/**
 * Pure helper functions for Customer Order Statistics and Courier Analytics.
 */

export interface OrderRecord {
   id: string;
   orderCode?: string | null;
   orderId?: string | null;
   customId?: string | null;
   invoiceNo?: string | null;
   status: string;
   total: number | string;
   dueAmount?: number | string | null;
   advancePayment?: number | string | null;
   paymentMethod?: string | null;
   courier?: string | null;
   courierStatus?: string | null;
   courierSubmittedAt?: string | Date | null;
   deliveredAt?: string | Date | null;
   createdAt: string | Date;
   orderNote?: string | null;
}

export interface OverallCustomerStats {
   totalOrders: number;
   deliveredOrders: number;
   failedOrders: number;
   pendingOrders: number;
   unshippedCancelled: number;
   totalAmountOrdered: number;
   totalAmountDelivered: number;
   successRate: number;
}

export interface CourierStatItem {
   courier: string;
   totalOrders: number;
   delivered: number;
   failed: number;
   pending: number;
   successRate: number;
}

export interface CourierPerformanceSummary {
   mostOrdersCourier: string;
   mostOrdersCount: number;
   mostSuccessfulCourier: string;
   mostSuccessCount: number;
   mostFailedCourier: string;
   mostFailedCount: number;
}

export function isOrderDelivered(order: OrderRecord): boolean {
   const status = (order.status || "").toUpperCase();
   const courierStatus = (order.courierStatus || "").toUpperCase();
   return (
      status === "DELIVERED" ||
      status === "COMPLETED" ||
      courierStatus === "DELIVERED"
   );
}

export function isOrderCourierFailed(order: OrderRecord): boolean {
   const status = (order.status || "").toUpperCase();
   if (status === "FAILED") return true;

   const courier = (order.courier || "").trim();
   if (courier) {
      const courierStatus = (order.courierStatus || "").toUpperCase();
      if (courierStatus === "FAILED" || courierStatus === "RETURNED") return true;
      if (status === "CANCELLED" && order.courierSubmittedAt) return true;
   }
   return false;
}

export function calculateCustomerAnalytics(orders: OrderRecord[]): {
   overallStats: OverallCustomerStats;
   courierStats: CourierStatItem[];
   courierPerformance: CourierPerformanceSummary;
} {
   const safeOrders = Array.isArray(orders) ? orders : [];
   const totalOrders = safeOrders.length;

   let deliveredOrders = 0;
   let failedOrders = 0;
   let unshippedCancelled = 0;
   let totalAmountOrdered = 0;
   let totalAmountDelivered = 0;

   const courierMap = new Map<
      string,
      { totalOrders: number; delivered: number; failed: number; pending: number }
   >();

   for (const order of safeOrders) {
      const orderTotal = Number(order.total || 0);
      totalAmountOrdered += orderTotal;

      const delivered = isOrderDelivered(order);
      const failed = isOrderCourierFailed(order);

      if (delivered) {
         deliveredOrders += 1;
         totalAmountDelivered += orderTotal;
      } else if (failed) {
         failedOrders += 1;
      } else if ((order.status || "").toUpperCase() === "CANCELLED") {
         unshippedCancelled += 1;
      }

      // Track courier breakdown
      const courierName = (order.courier || "").trim();
      if (courierName) {
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

         if (delivered) {
            data.delivered += 1;
         } else if (failed) {
            data.failed += 1;
         } else if ((order.status || "").toUpperCase() !== "CANCELLED") {
            data.pending += 1;
         }
      }
   }

   const pendingOrders = Math.max(
      0,
      totalOrders - deliveredOrders - failedOrders - unshippedCancelled,
   );

   const finishedTotal = deliveredOrders + failedOrders;
   const overallSuccessRate =
      finishedTotal > 0
         ? Math.round((deliveredOrders / finishedTotal) * 100)
         : totalOrders > 0 && deliveredOrders > 0
           ? 100
           : 0;

   const courierStats: CourierStatItem[] = Array.from(courierMap.entries())
      .map(([courier, data]) => {
         const finished = data.delivered + data.failed;
         const rate =
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
            successRate: rate,
         };
      })
      .sort((a, b) => b.totalOrders - a.totalOrders);

   let mostOrdersCourier = "-";
   let mostOrdersCount = 0;
   let mostSuccessfulCourier = "-";
   let mostSuccessCount = 0;
   let mostFailedCourier = "-";
   let mostFailedCount = 0;

   for (const item of courierStats) {
      if (item.totalOrders > mostOrdersCount) {
         mostOrdersCount = item.totalOrders;
         mostOrdersCourier = item.courier;
      }
      if (item.delivered > mostSuccessCount) {
         mostSuccessCount = item.delivered;
         mostSuccessfulCourier = item.courier;
      }
      if (item.failed > mostFailedCount) {
         mostFailedCount = item.failed;
         mostFailedCourier = item.courier;
      }
   }

   return {
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
   };
}
