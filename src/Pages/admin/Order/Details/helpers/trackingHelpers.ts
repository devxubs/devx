import {
   TrackingStep,
   TrackingStepState,
   EmployeeActivity,
   GroupedActivities,
   ActivityActor,
} from "../types/trackingTypes";

// In-memory cache for deterministic sequential employee codes
const employeeCodeCache = new Map<string, string>();
let nextSequentialCodeNumber = 1;

/**
 * Replaces raw CUIDs (e.g. cmvrtax2v00000swqrpleclyr) with clean employee codes like EP_1.
 * Uses permanent code if already clean, otherwise assigns a reliable sequential code.
 */
export function formatEmployeeCode(employee: any, fallbackId?: string): string {
   if (!employee && !fallbackId) return "EP_1";

   const emp = typeof employee === "object" && employee !== null ? employee : { id: fallbackId || employee };

   // 1. Check if permanent customId / employeeId is already a clean code (not a CUID)
   const candidate = emp.customId || emp.employeeId || emp.code;
   if (candidate && typeof candidate === "string") {
      const isCuid = candidate.length >= 20 && candidate.startsWith("c");
      if (!isCuid) {
         if (candidate.startsWith("EP_")) return candidate;
         const digits = candidate.replace(/\D/g, "");
         if (digits) return `EP_${parseInt(digits, 10)}`;
         return candidate;
      }
   }

   // 2. Check if raw id is already a clean short code
   const rawId = String(emp.id || fallbackId || "").trim();
   if (!rawId) return "EP_1";

   if (rawId.startsWith("EP_")) return rawId;
   if (rawId.startsWith("EMP")) {
      const digits = rawId.replace(/\D/g, "");
      return digits ? `EP_${parseInt(digits, 10)}` : "EP_1";
   }

   const isCuid = rawId.length >= 20 && rawId.startsWith("c");
   if (!isCuid && rawId.length <= 6 && /^\d+$/.test(rawId)) {
      return `EP_${parseInt(rawId, 10)}`;
   }

   // 3. For raw CUIDs, look up or assign a stable sequential employee code (EP_1, EP_2, etc.)
   if (!employeeCodeCache.has(rawId)) {
      employeeCodeCache.set(rawId, `EP_${nextSequentialCodeNumber++}`);
   }

   return employeeCodeCache.get(rawId) || "EP_1";
}

export function formatDateTimeParts(dateVal?: string | Date | null): {
   date: string;
   time: string;
   full: string;
   rawDate?: Date;
} {
   if (!dateVal) {
      return { date: "-", time: "-", full: "-" };
   }
   const d = new Date(dateVal);
   if (isNaN(d.getTime())) {
      return { date: "-", time: "-", full: "-" };
   }

   const date = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
   });

   const time = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
   });

   return {
      date,
      time,
      full: `${date} • ${time}`,
      rawDate: d,
   };
}

export function deriveTrackingSteps(order: any): TrackingStep[] {
   if (!order) return [];

   const rawStatus = String(order.status || "PENDING").toUpperCase();
   const orderType = String(order.orderType || "").toLowerCase();
   const hasCourier = Boolean(order.courier || order.courierSubmittedAt);

   // Determine delivery mode
   const isStorePickup =
      orderType.includes("pickup") ||
      orderType.includes("store") ||
      orderType === "direct store pickup";
   const isInHouse =
      !isStorePickup &&
      !hasCourier &&
      (orderType.includes("in-house") || orderType.includes("rider") || orderType.includes("pos"));
   const isCourierDelivery = !isStorePickup && !isInHouse;

   const isCancelled = rawStatus === "CANCELLED" || rawStatus === "FAILED";
   const isReturned = rawStatus === "RETURNED";
   const isDelivered = rawStatus === "DELIVERED" || rawStatus === "COMPLETED";
   const isOutForDelivery = rawStatus === "OUT_FOR_DELIVERY";
   const isShipped =
      isDelivered ||
      rawStatus === "SHIPPED" ||
      isOutForDelivery ||
      Boolean(order.courierSubmittedAt);
   const isConfirmedOrAbove =
      isShipped ||
      rawStatus === "PROCESSING" ||
      rawStatus === "CONFIRMED";

   // OBS-I3 (Full Live QA Audit 2026-11-25): stage times came from
   // createdAt/updatedAt only, so every reached stage showed the
   // creation (or last-edit) time rather than when the stage
   // actually happened. The persistent audit history carries the
   // real transition timestamps — prefer the earliest status event
   // for each stage, falling back to the previous derivation for
   // legacy orders without history.
   const tagsForStages =
      typeof order.orderTags === "object" && order.orderTags !== null
         ? (order.orderTags as Record<string, any>)
         : typeof order.orderTags === "string"
           ? (() => {
                try {
                   return JSON.parse(order.orderTags);
                } catch {
                   return {};
                }
             })()
           : {};
   const statusEventTimes = new Map<string, string>();
   if (Array.isArray(tagsForStages.auditHistory)) {
      // auditHistory is stored newest-first; walk it oldest-first
      // so each status keeps its EARLIEST transition time.
      for (const ev of [...tagsForStages.auditHistory].reverse()) {
         const next = ev?.diff?.field === "status" ? ev?.diff?.new : null;
         const ts = ev?.timestamp || ev?.createdAt;
         if (next && ts && !statusEventTimes.has(String(next))) {
            statusEventTimes.set(String(next), ts);
         }
      }
   }
   const stageTime = (...statuses: string[]) => {
      for (const s of statuses) {
         const t = statusEventTimes.get(s);
         if (t) return t;
      }
      return null;
   };

   const placedTimes = formatDateTimeParts(order.createdAt);
   const processingTimes = formatDateTimeParts(
      stageTime("CONFIRMED", "PROCESSING") ||
         (isConfirmedOrAbove ? order.updatedAt || order.createdAt : null),
   );
   const courierTimes = formatDateTimeParts(
      order.courierSubmittedAt ||
         stageTime("SHIPPED", "OUT_FOR_DELIVERY") ||
         (isShipped ? order.updatedAt : null),
   );
   const deliveryTimes = formatDateTimeParts(
      order.deliveredAt ||
         stageTime("COMPLETED", "DELIVERED") ||
         (isDelivered ? order.updatedAt : null),
   );
   const cancelledTimes = formatDateTimeParts(
      stageTime("CANCELLED", "FAILED", "RETURNED") ||
         (isCancelled || isReturned ? order.updatedAt || order.createdAt : null),
   );

   const trackingId = order.courierTrackingCode || order.courierTrackingId || order.referenceId;

   // ===================================================
   // 1. STORE PICKUP WORKFLOW (4 clear stages)
   // ===================================================
   if (isStorePickup) {
      const totalStages = 4;
      const steps: TrackingStep[] = [];

      // Stage 1: Order Placed
      steps.push({
         id: "step-placed",
         stageNumber: 1,
         totalStages,
         title: "Order Placed",
         description: `Order registered via ${order.orderSource || "Direct Sales"}`,
         date: placedTimes.date,
         time: placedTimes.time,
         timestamp: placedTimes.full,
         state: "completed",
         icon: "solar:bag-check-bold",
         nextStagePreview: "Processing & Order Assembly",
         metadata: [
            { label: "Sales Channel", value: order.orderSource || "Direct Sales" },
            { label: "Fulfillment Method", value: "Store Pickup" },
         ],
      });

      // Stage 2: Processing & Assembly
      let assemblyState: TrackingStepState = "pending";
      if (isCancelled) {
         assemblyState = isConfirmedOrAbove ? "completed" : "skipped";
      } else if (isDelivered || isConfirmedOrAbove) {
         assemblyState = "completed";
      } else {
         assemblyState = "current";
      }

      steps.push({
         id: "step-assembly",
         stageNumber: 2,
         totalStages,
         title: "Processing & Order Assembly",
         description: "Items inspected, packaged, and assembled for store pickup",
         date: assemblyState === "completed" ? processingTimes.date : undefined,
         time: assemblyState === "completed" ? processingTimes.time : undefined,
         timestamp:
            assemblyState === "completed"
               ? processingTimes.full
               : assemblyState === "skipped"
                 ? "Skipped (Cancelled)"
                 : "Awaiting staff assembly",
         state: assemblyState,
         icon: "solar:box-bold",
         nextStagePreview: "Ready for Pickup",
         metadata: [
            { label: "Payment", value: order.paymentMethod || "Cash" },
            {
               // Phase 3B: order.paymentStatus is the payment
               // VERIFICATION enum (UNVERIFIED/VERIFIED/MISMATCHED),
               // not the paid/due state — the paid/due label is
               // derived from dueAmount, as it was before the
               // verification field existed.
               label: "Payment Status",
               value: Number(order.dueAmount || 0) <= 0 ? "PAID" : "DUE",
               highlight: Number(order.dueAmount || 0) <= 0,
            },
         ],
      });

      // Stage 3: Ready for Pickup
      let readyState: TrackingStepState = "pending";
      if (isCancelled) {
         readyState = "skipped";
      } else if (isDelivered) {
         readyState = "completed";
      } else if (isConfirmedOrAbove) {
         readyState = "current";
      }

      steps.push({
         id: "step-ready",
         stageNumber: 3,
         totalStages,
         title: "Ready for Pickup",
         description: "Order is staged at the pickup counter awaiting customer collection",
         date: readyState === "completed" ? processingTimes.date : undefined,
         time: readyState === "completed" ? processingTimes.time : undefined,
         timestamp:
            readyState === "completed"
               ? processingTimes.full
               : readyState === "skipped"
                 ? "Skipped (Cancelled)"
                 : "Awaiting customer arrival",
         state: readyState,
         icon: "solar:shop-bold",
         nextStagePreview: "Picked Up by Customer",
         metadata: [
            { label: "Pickup Location", value: "Main Store Counter", highlight: true },
         ],
      });

      // Stage 4: Final Outcome (Picked Up / Cancelled / Returned)
      if (isCancelled) {
         steps.push({
            id: "step-final",
            stageNumber: 4,
            totalStages,
            title: "Order Cancelled",
            description: "Store pickup order cancelled and terminated",
            date: cancelledTimes.date,
            time: cancelledTimes.time,
            timestamp: cancelledTimes.full,
            state: "current",
            icon: "solar:close-circle-bold",
            nextStagePreview: "Order Terminated",
         });
      } else if (isReturned) {
         steps.push({
            id: "step-final",
            stageNumber: 4,
            totalStages,
            title: "Order Restocked / Uncollected",
            description: "Customer did not collect; package returned to active inventory",
            date: cancelledTimes.date,
            time: cancelledTimes.time,
            timestamp: cancelledTimes.full,
            state: "current",
            icon: "solar:backspace-bold",
            nextStagePreview: "Order Terminated",
            metadata: [{ label: "Inventory Status", value: "Restocked", highlight: true }],
         });
      } else {
         const pickedState: TrackingStepState = isDelivered ? "completed" : "pending";
         steps.push({
            id: "step-final",
            stageNumber: 4,
            totalStages,
            title: "Picked Up by Customer",
            description: isDelivered
               ? "Order collected and signed by customer at store counter"
               : "Awaiting customer collection",
            date: isDelivered ? deliveryTimes.date : undefined,
            time: isDelivered ? deliveryTimes.time : undefined,
            timestamp: isDelivered ? deliveryTimes.full : "Pending customer arrival",
            state: pickedState,
            icon: "solar:check-circle-bold",
            nextStagePreview: "All Stages Completed",
            metadata: isDelivered
               ? [{ label: "Status", value: "Collected", highlight: true }]
               : undefined,
         });
      }

      return steps;
   }

   // ===================================================
   // 2. COURIER DELIVERY WORKFLOW (5 clear stages)
   // ===================================================
   if (isCourierDelivery) {
      const totalStages = 5;
      const steps: TrackingStep[] = [];

      // Stage 1: Order Placed
      steps.push({
         id: "step-placed",
         stageNumber: 1,
         totalStages,
         title: "Order Placed",
         description: `Order registered via ${order.orderSource || "Direct Sales"}`,
         date: placedTimes.date,
         time: placedTimes.time,
         timestamp: placedTimes.full,
         state: "completed",
         icon: "solar:bag-check-bold",
         nextStagePreview: "Confirmed & Processing",
         metadata: [
            { label: "Sales Channel", value: order.orderSource || "Direct Sales" },
            { label: "Fulfillment Method", value: order.orderType || "Home Delivery" },
         ],
      });

      // Stage 2: Confirmed & Processing
      let procState: TrackingStepState = "pending";
      if (isCancelled) {
         procState = isConfirmedOrAbove ? "completed" : "skipped";
      } else if (isDelivered || isShipped) {
         procState = "completed";
      } else if (isConfirmedOrAbove) {
         procState = "current";
      } else {
         // A live order that has not reached confirmation yet is
         // CURRENTLY at this stage — the store-pickup workflow above
         // already treats its assembly stage this way. Without this,
         // a PENDING order has no current step at all and the
         // tracking header falls back to the final step, announcing
         // "Current: Delivered to Customer" for an unshipped order.
         procState = "current";
      }

      steps.push({
         id: "step-processing",
         stageNumber: 2,
         totalStages,
         title: "Confirmed & Processing",
         description: `Payment: ${order.paymentMethod || "Cash on Delivery"} • Order verified and packaged`,
         // procState cannot be "pending" here anymore (every branch
         // above assigns completed/current/skipped), so only the
         // skipped case suppresses the stage time.
         date: procState !== "skipped" ? processingTimes.date : undefined,
         time: procState !== "skipped" ? processingTimes.time : undefined,
         timestamp:
            procState === "completed"
               ? processingTimes.full
               : procState === "skipped"
                 ? "Skipped (Cancelled)"
                 : "Awaiting warehouse verification",
         state: procState,
         icon: "solar:box-bold",
         nextStagePreview: "Logistics Handover",
         metadata: [
            { label: "Payment", value: order.paymentMethod || "Cash on Delivery" },
            {
               // Phase 3B: order.paymentStatus is the payment
               // VERIFICATION enum (UNVERIFIED/VERIFIED/MISMATCHED),
               // not the paid/due state — the paid/due label is
               // derived from dueAmount, as it was before the
               // verification field existed.
               label: "Payment Status",
               value: Number(order.dueAmount || 0) <= 0 ? "PAID" : "DUE",
               highlight: Number(order.dueAmount || 0) <= 0,
            },
         ],
      });

      // Stage 3: Logistics Handover
      let handoverState: TrackingStepState = "pending";
      if (isCancelled) {
         handoverState = isShipped ? "completed" : "skipped";
      } else if (isDelivered || isOutForDelivery) {
         handoverState = "completed";
      } else if (isShipped || hasCourier) {
         handoverState = "current";
      }

      steps.push({
         id: "step-handover",
         stageNumber: 3,
         totalStages,
         title: "Logistics Handover",
         description: order.courier
            ? `Dispatched to ${order.courier} courier partner`
            : "Awaiting courier partner handover and tracking generation",
         date: handoverState !== "pending" && handoverState !== "skipped" ? courierTimes.date : undefined,
         time: handoverState !== "pending" && handoverState !== "skipped" ? courierTimes.time : undefined,
         timestamp:
            handoverState === "completed"
               ? courierTimes.full
               : handoverState === "skipped"
                 ? "Skipped (Cancelled)"
                 : "Awaiting courier dispatch",
         state: handoverState,
         icon: "solar:box-minimalistic-bold",
         nextStagePreview: "Out for Delivery",
         metadata: [
            ...(order.courier
               ? [{ label: "Carrier", value: order.courier, highlight: true }]
               : []),
            ...(trackingId
               ? [{ label: "Tracking ID", value: trackingId, highlight: true, copyable: true }]
               : []),
            ...(order.courierStatus
               ? [{ label: "Courier Status", value: order.courierStatus }]
               : []),
         ],
      });

      // Stage 4: Out for Delivery / In Transit
      let transitState: TrackingStepState = "pending";
      if (isCancelled) {
         transitState = "skipped";
      } else if (isDelivered) {
         transitState = "completed";
      } else if (isOutForDelivery) {
         transitState = "current";
      }

      steps.push({
         id: "step-transit",
         stageNumber: 4,
         totalStages,
         title: "Out for Delivery",
         description: isOutForDelivery
            ? "Courier delivery agent has package and is en route to recipient"
            : isDelivered
              ? "Package cleared transit and reached delivery point"
              : "In transit to local courier distribution hub",
         date: transitState === "completed" || transitState === "current" ? courierTimes.date : undefined,
         time: transitState === "completed" || transitState === "current" ? courierTimes.time : undefined,
         timestamp:
            transitState === "completed"
               ? courierTimes.full
               : transitState === "skipped"
                 ? "Skipped (Cancelled)"
                 : isOutForDelivery
                   ? "En route with rider"
                   : "Pending courier transit",
         state: transitState,
         icon: "solar:delivery-bold",
         nextStagePreview: "Delivered to Customer",
         metadata: [
            { label: "Transit Status", value: isOutForDelivery ? "On Vehicle / En Route" : "In Transit" },
         ],
      });

      // Stage 5: Final Outcome (Delivered / Cancelled / Returned)
      if (isCancelled) {
         steps.push({
            id: "step-final",
            stageNumber: 5,
            totalStages,
            title: "Order Cancelled",
            description: "Delivery cancelled and package return / release initiated",
            date: cancelledTimes.date,
            time: cancelledTimes.time,
            timestamp: cancelledTimes.full,
            state: "current",
            icon: "solar:close-circle-bold",
            nextStagePreview: "Order Terminated",
         });
      } else if (isReturned) {
         steps.push({
            id: "step-final",
            stageNumber: 5,
            totalStages,
            title: "Package Returned to Origin",
            description: `Courier returned package to merchant (${order.cancellationReason || "Delivery Failed / Undeliverable"})`,
            date: cancelledTimes.date,
            time: cancelledTimes.time,
            timestamp: cancelledTimes.full,
            state: "current",
            icon: "solar:backspace-bold",
            nextStagePreview: "Order Terminated",
            metadata: [{ label: "Return Status", value: "Returned to Origin", highlight: true }],
         });
      } else {
         const finalState: TrackingStepState = isDelivered ? "completed" : "pending";
         steps.push({
            id: "step-final",
            stageNumber: 5,
            totalStages,
            title: "Delivered to Customer",
            description: isDelivered
               ? "Package successfully delivered and handed over to recipient"
               : "Awaiting final delivery confirmation from courier",
            date: isDelivered ? deliveryTimes.date : undefined,
            time: isDelivered ? deliveryTimes.time : undefined,
            timestamp: isDelivered ? deliveryTimes.full : "Pending final delivery",
            state: finalState,
            icon: "solar:check-circle-bold",
            nextStagePreview: "All Stages Completed",
            metadata: isDelivered
               ? [{ label: "Delivery Status", value: "Completed & Received", highlight: true }]
               : undefined,
         });
      }

      return steps;
   }

   // ===================================================
   // 3. IN-HOUSE DELIVERY WORKFLOW (4 stages)
   // ===================================================
   const totalStages = 4;
   const steps: TrackingStep[] = [];

   // Stage 1: Order Placed
   steps.push({
      id: "step-placed",
      stageNumber: 1,
      totalStages,
      title: "Order Placed",
      description: `Order registered via ${order.orderSource || "Direct Sales"}`,
      date: placedTimes.date,
      time: placedTimes.time,
      timestamp: placedTimes.full,
      state: "completed",
      icon: "solar:bag-check-bold",
      nextStagePreview: "Confirmed & Assembling",
      metadata: [
         { label: "Sales Channel", value: order.orderSource || "Direct Sales" },
         { label: "Fulfillment Method", value: "In-House Delivery" },
      ],
   });

   // Stage 2: Confirmed & Assembling
   let procState: TrackingStepState = "pending";
   if (isCancelled) {
      procState = isConfirmedOrAbove ? "completed" : "skipped";
   } else if (isDelivered || isShipped) {
      procState = "completed";
   } else if (isConfirmedOrAbove) {
      procState = "current";
   } else {
      // Same fall-through as the courier workflow: a PENDING order
      // is currently at this stage; leaving it "pending" leaves the
      // order with no current step and the header falls back to the
      // final step.
      procState = "current";
   }

   steps.push({
      id: "step-processing",
      stageNumber: 2,
      totalStages,
      title: "Confirmed & Assembling",
      description: `Payment: ${order.paymentMethod || "Cash"} • Packaging order for in-house rider`,
      // procState cannot be "pending" here anymore (every branch
      // above assigns completed/current/skipped), so only the
      // skipped case suppresses the stage time.
      date: procState !== "skipped" ? processingTimes.date : undefined,
      time: procState !== "skipped" ? processingTimes.time : undefined,
      timestamp:
         procState === "completed"
            ? processingTimes.full
            : procState === "skipped"
              ? "Skipped (Cancelled)"
              : "Awaiting preparation",
      state: procState,
      icon: "solar:box-bold",
      nextStagePreview: "Dispatched via In-House Rider",
      metadata: [{ label: "Payment", value: order.paymentMethod || "Cash" }],
   });

   // Stage 3: Dispatched via In-House Rider
   let riderState: TrackingStepState = "pending";
   if (isCancelled) {
      riderState = isShipped ? "completed" : "skipped";
   } else if (isDelivered) {
      riderState = "completed";
   } else if (isShipped || isOutForDelivery) {
      riderState = "current";
   }

   steps.push({
      id: "step-rider",
      stageNumber: 3,
      totalStages,
      title: "Dispatched via In-House Rider",
      description: "Assigned to company delivery personnel for direct delivery",
      date: riderState !== "pending" && riderState !== "skipped" ? courierTimes.date : undefined,
      time: riderState !== "pending" && riderState !== "skipped" ? courierTimes.time : undefined,
      timestamp:
         riderState === "completed"
            ? courierTimes.full
            : riderState === "skipped"
              ? "Skipped (Cancelled)"
              : "Awaiting rider dispatch",
      state: riderState,
      icon: "solar:scooter-bold",
      nextStagePreview: "Delivered to Customer",
      metadata: [{ label: "Delivery Team", value: "In-House Staff Rider", highlight: true }],
   });

   // Stage 4: Final Outcome
   if (isCancelled) {
      steps.push({
         id: "step-final",
         stageNumber: 4,
         totalStages,
         title: "Order Cancelled",
         description: "In-house order cancelled and rider release completed",
         date: cancelledTimes.date,
         time: cancelledTimes.time,
         timestamp: cancelledTimes.full,
         state: "current",
         icon: "solar:close-circle-bold",
         nextStagePreview: "Order Terminated",
      });
   } else if (isReturned) {
      steps.push({
         id: "step-final",
         stageNumber: 4,
         totalStages,
         title: "Delivery Unfulfilled / Returned",
         description: "Recipient unavailable; package returned to hub",
         date: cancelledTimes.date,
         time: cancelledTimes.time,
         timestamp: cancelledTimes.full,
         state: "current",
         icon: "solar:backspace-bold",
         nextStagePreview: "Order Terminated",
         metadata: [{ label: "Return Status", value: "Returned", highlight: true }],
      });
   } else {
      const finalState: TrackingStepState = isDelivered ? "completed" : "pending";
      steps.push({
         id: "step-final",
         stageNumber: 4,
         totalStages,
         title: "Delivered to Customer",
         description: isDelivered
            ? "Package delivered and payment collected by rider"
            : "En route to delivery address",
         date: isDelivered ? deliveryTimes.date : undefined,
         time: isDelivered ? deliveryTimes.time : undefined,
         timestamp: isDelivered ? deliveryTimes.full : "Pending fulfillment",
         state: finalState,
         icon: "solar:check-circle-bold",
         nextStagePreview: "All Stages Completed",
         metadata: isDelivered
            ? [{ label: "Status", value: "Delivered", highlight: true }]
            : undefined,
      });
   }

   return steps;
}

// The four order-note types, by the titles the API writes into note
// audit-history events (badgeLabel / diff.field / "<Title> Created|
// Updated|Added" actions).
const NOTE_AUDIT_TITLES = [
   "Courier Note",
   "Customer Note",
   "Packing Note",
   "Employee Note",
] as const;

/**
 * Which of the four note types a persistent audit-history event
 * belongs to, or null when the event is not a typed note event
 * (e.g. a generic "Order Note" entry from the notes array).
 */
function noteTitleOfAuditEvent(item: any): string | null {
   if (!item || item.category !== "note") return null;
   for (const title of NOTE_AUDIT_TITLES) {
      if (item.badgeLabel === title || item.diff?.field === title)
         return title;
   }
   if (typeof item.action === "string") {
      for (const title of NOTE_AUDIT_TITLES) {
         if (item.action.includes(title)) return title;
      }
   }
   return null;
}

export function deriveEmployeeActivities(order: any): EmployeeActivity[] {
   if (!order) return [];

   const staffName = order.employee?.name || "DevX System Administrator";
   const cleanCode = formatEmployeeCode(order.employee, order.employeeId);
   const staffEmail = order.employee?.email || order.employee?.phoneNumber;
   const staffRole =
      order.employee?.role?.name ||
      order.employee?.role ||
      "System Admin";

   const defaultActor: ActivityActor = {
      name: staffName,
      role: staffRole,
      id: order.employee?.id,
      employeeCode: cleanCode,
      email: staffEmail,
   };

   const activities: EmployeeActivity[] = [];

   // Extract persistent audit history from orderTags.auditHistory
   const tagsObj =
      typeof order.orderTags === "object" && order.orderTags !== null
         ? (order.orderTags as Record<string, any>)
         : typeof order.orderTags === "string"
           ? (() => {
                try {
                   return JSON.parse(order.orderTags);
                } catch {
                   return {};
                }
             })()
           : {};

   const coveredNoteTitles = new Set<string>();
   let hasPersistentStatusAudit = false;
   let hasPersistentPaymentAudit = false;
   let hasPersistentCourierAudit = false;
   let hasPersistentTerminalAudit = false;

   if (Array.isArray(tagsObj.auditHistory)) {
      for (const item of tagsObj.auditHistory) {
         const noteTitle = noteTitleOfAuditEvent(item);
         if (noteTitle) coveredNoteTitles.add(noteTitle);
         // OBS-C3 (Full Live QA Audit 2026-11-25): coverage also
         // counts any persistent event carrying a status diff. The
         // "Order Cancelled" event has category "order" (not
         // "workflow") and no "Status" in its action, so cancelling
         // left hasPersistentStatusAudit false and the fallback
         // below added a SECOND, contradictory status entry
         // ("Status: CANCELLED", previous fabricated as PENDING).
         if (
            item.category === "workflow" ||
            item.action?.includes("Status") ||
            item.diff?.field === "status"
         )
            hasPersistentStatusAudit = true;
         if (item.category === "payment") hasPersistentPaymentAudit = true;
         if (item.category === "courier") hasPersistentCourierAudit = true;
         // Terminal coverage: a persistent status event whose new
         // value IS the order's current status. Section 6 below is a
         // fallback for orders WITHOUT such an event — when the real
         // terminal transition is already logged, synthesizing
         // another delivery/cancellation entry duplicates it (and
         // the synthesized cancellation carried a fabricated
         // "Previous: Active").
         if (
            item.diff?.field === "status" &&
            String(item.diff?.new || "").toUpperCase() ===
               String(order.status || "").toUpperCase()
         )
            hasPersistentTerminalAudit = true;

         const timeParts = formatDateTimeParts(item.timestamp || item.createdAt);
         const itemActorCode =
            item.actor?.employeeCode ||
            formatEmployeeCode(item.actor, item.actor?.id);

         activities.push({
            id: item.id || `act-audit-${Math.random()}`,
            action: item.action || "Activity Logged",
            category: item.category || "order",
            actor: {
               name: item.actor?.name || defaultActor.name,
               role: item.actor?.role || "Staff",
               employeeCode: itemActorCode,
               id: item.actor?.id,
               email: item.actor?.email,
            },
            details: item.details || "",
            diff: item.diff,
            date: timeParts.date,
            time: timeParts.time,
            timestamp: timeParts.full,
            rawDate: timeParts.rawDate,
            icon: item.icon || "solar:history-bold",
            badgeLabel: item.badgeLabel || "Audit",
            isImportant: Boolean(item.isImportant),
         });
      }
   }

   // 1. Order Creation Event (Always present)
   const createdTimes = formatDateTimeParts(order.createdAt);
   activities.push({
      id: "act-create",
      action: "Order Created",
      category: "order",
      actor: defaultActor,
      details: `Created new POS sales order via ${order.orderSource || "Direct Sales"} (${order.orderType || "Regular Order"}) with ${order.items?.length || 0} product item(s)`,
      date: createdTimes.date,
      time: createdTimes.time,
      timestamp: createdTimes.full,
      rawDate: createdTimes.rawDate,
      icon: "solar:document-add-bold",
      isImportant: true,
      badgeLabel: "Creation",
   });

   // 2. Invoice Generation / Action
   const invoiceTimes = formatDateTimeParts(order.printedAt || order.createdAt);
   const isPrinted = order.printStatus === "Printed";
   activities.push({
      id: "act-invoice",
      action: isPrinted ? "Invoice Printed" : "Invoice Generated",
      category: "invoice",
      actor: {
         ...defaultActor,
         role: "Billing / Cashier",
      },
      details: `Invoice #${order.invoiceNo || order.orderId || "INV"} registered for billing (${
         order.printStatus || "Not Printed"
      })`,
      date: invoiceTimes.date,
      time: invoiceTimes.time,
      timestamp: invoiceTimes.full,
      rawDate: invoiceTimes.rawDate,
      icon: "solar:printer-minimalistic-bold",
      badgeLabel: isPrinted ? "Printed" : "Generated",
   });

   // 3. Workflow Status Event (Fallback if not in persistent audit log)
   if (!hasPersistentStatusAudit && order.status) {
      const updateTimes = formatDateTimeParts(order.updatedAt || order.createdAt);
      activities.push({
         id: "act-status",
         action: `Status: ${order.status}`,
         category: "workflow",
         actor: {
            ...defaultActor,
            role: "Order Fulfillment",
         },
         details: `Order workflow status registered as "${order.status}"`,
         // OBS-C3: no fabricated "previous" — for a legacy order
         // without persistent history the prior status is unknown,
         // not necessarily PENDING.
         diff: { field: "status", previous: null, new: order.status },
         date: updateTimes.date,
         time: updateTimes.time,
         timestamp: updateTimes.full,
         rawDate: updateTimes.rawDate,
         icon: "solar:refresh-bold",
         badgeLabel: order.status,
      });
   }

   // 4. Initial note fallbacks, per note type (display-only). Orders
   // created before create-time note events existed — or whose notes
   // were otherwise saved without audit history — have note values in
   // orderTags but no persistent events for them. For each of the four
   // types WITHOUT persistent coverage, synthesize the same "… Note
   // Added" entry the old customer-only fallback produced, from the
   // note's current value. Types with real events are never
   // duplicated; the Customer Note keeps its legacy source
   // (orderTags.customerNote, falling back to the orderNote column).
   const noteFallbackValues: { title: string; id: string; value: any }[] = [
      {
         title: "Courier Note",
         id: "act-note-courier",
         value: tagsObj.courierNote,
      },
      {
         title: "Customer Note",
         id: "act-note",
         value: tagsObj.customerNote ? tagsObj.customerNote : order.orderNote,
      },
      {
         title: "Packing Note",
         id: "act-note-packing",
         value: tagsObj.packingNote,
      },
      {
         title: "Employee Note",
         id: "act-note-employee",
         value: tagsObj.employeeNote,
      },
   ];
   for (const fb of noteFallbackValues) {
      if (coveredNoteTitles.has(fb.title)) continue;
      if (!String(fb.value || "").trim()) continue;
      const noteTimes = formatDateTimeParts(order.updatedAt || order.createdAt);
      activities.push({
         id: fb.id,
         action: `${fb.title} Added`,
         category: "note",
         actor: {
            ...defaultActor,
            role: "Customer Support",
         },
         details: `"${fb.value}"`,
         diff: { field: fb.title, previous: null, new: fb.value },
         date: noteTimes.date,
         time: noteTimes.time,
         timestamp: noteTimes.full,
         rawDate: noteTimes.rawDate,
         icon: "solar:notes-bold",
         badgeLabel: fb.title,
      });
   }

   // 5. Courier Logistics Handover (Fallback if not in persistent audit)
   if (!hasPersistentCourierAudit && (order.courier || order.courierSubmittedAt)) {
      const courierTimes = formatDateTimeParts(
         order.courierSubmittedAt || order.updatedAt || order.createdAt,
      );
      const trackingId = order.courierTrackingCode || order.courierTrackingId || order.referenceId;
      activities.push({
         id: "act-courier",
         action: "Courier Logistics Handover",
         category: "courier",
         actor: {
            ...defaultActor,
            role: "Logistics Dispatcher",
         },
         details: `Dispatched to ${order.courier || "Courier"} (Status: ${
            order.courierStatus || "Dispatched"
         }${trackingId ? `, Tracking ID: ${trackingId}` : ""})`,
         date: courierTimes.date,
         time: courierTimes.time,
         timestamp: courierTimes.full,
         rawDate: courierTimes.rawDate,
         icon: "solar:box-minimalistic-bold",
         isImportant: true,
         badgeLabel: order.courier || "Courier",
      });
   }

   // 6. Delivery or Cancellation (Fallback if not already logged)
   const rawStatus = String(order.status || "").toUpperCase();
   if (
      !hasPersistentTerminalAudit &&
      (rawStatus === "DELIVERED" || rawStatus === "COMPLETED")
   ) {
      const delTimes = formatDateTimeParts(
         order.deliveredAt || order.updatedAt || order.createdAt,
      );
      activities.push({
         id: "act-delivered",
         action: "Delivered to Customer",
         category: "order",
         actor: {
            ...defaultActor,
            role: "Delivery Confirmation",
         },
         details: "Package successfully delivered and accepted by customer",
         date: delTimes.date,
         time: delTimes.time,
         timestamp: delTimes.full,
         rawDate: delTimes.rawDate,
         icon: "solar:check-circle-bold",
         isImportant: true,
         badgeLabel: "Delivered",
      });
   } else if (
      !hasPersistentTerminalAudit &&
      (rawStatus === "CANCELLED" || rawStatus === "FAILED")
   ) {
      const cancelTimes = formatDateTimeParts(order.updatedAt || order.createdAt);
      activities.push({
         id: "act-cancelled",
         action: "Order Cancelled",
         category: "order",
         actor: {
            ...defaultActor,
            role: "Order Exception",
         },
         details: `Order marked as cancelled (${
            order.cancellationReason || "No cancellation reason provided"
         })`,
         diff: {
            field: "status",
            // OBS-C3 rule: no fabricated "previous" — a legacy order
            // without persistent history has an unknown prior status,
            // not necessarily "Active".
            previous: null,
            new: "CANCELLED",
         },
         date: cancelTimes.date,
         time: cancelTimes.time,
         timestamp: cancelTimes.full,
         rawDate: cancelTimes.rawDate,
         icon: "solar:close-circle-bold",
         isImportant: true,
         badgeLabel: "Cancelled",
      });
   }

   return activities.sort((a, b) => {
      const timeA = a.rawDate ? a.rawDate.getTime() : 0;
      const timeB = b.rawDate ? b.rawDate.getTime() : 0;
      return timeB - timeA;
   });
}

export function groupActivitiesByDate(
   activities: EmployeeActivity[],
): GroupedActivities[] {
   if (!activities || activities.length === 0) return [];

   const groups: Record<string, EmployeeActivity[]> = {};

   const today = new Date();
   const todayStr = today.toDateString();
   const yesterday = new Date(today);
   yesterday.setDate(yesterday.getDate() - 1);
   const yesterdayStr = yesterday.toDateString();

   for (const act of activities) {
      let label = act.date;
      if (act.rawDate) {
         const actDateStr = act.rawDate.toDateString();
         if (actDateStr === todayStr) {
            label = `Today — ${act.date}`;
         } else if (actDateStr === yesterdayStr) {
            label = `Yesterday — ${act.date}`;
         }
      }

      if (!groups[label]) {
         groups[label] = [];
      }
      groups[label].push(act);
   }

   return Object.keys(groups).map((dateLabel) => ({
      dateLabel,
      activities: groups[dateLabel],
   }));
}
