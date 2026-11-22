import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import {
   parseRankingSettings,
   type RankingSettings,
} from "@src/lib/rankingSettings";
import {
   loadPeriodTransitions,
   buildAggregates,
   type RankingOrderInfo,
   type RankingUserInfo,
} from "@src/lib/ranking/attribution";
import { scoreEmployees, type ScoredEmployee } from "@src/lib/ranking/engine";
import {
   normalizeCustomerPhone,
   orderItemSignature,
   dhakaDayKey,
   type DuplicateOrderInput,
} from "@src/lib/duplicateOrders";
import {
   logAuditStandalone,
   auditActorFromContext,
   requestAuditContext,
} from "@src/lib/audit";

// Smart Employee Ranking — finalize a month (Phase 2 plan §7,
// Step 4). POST { periodKey: "YYYY-MM" } → 201 { periodKey,
// finalizedAt, entryCount }.
//
// Gate: the settings permission — the same requirePermission
// candidate list the settings route uses. A month is finalizable
// only after it has fully ended (periodEnd < now). Snapshots are
// create-once: an already-finalized period returns 409 (the
// periodKey @unique constraint is the backstop inside the
// transaction), and there are NO update/delete handlers for
// snapshots anywhere in the API.
//
// The period is computed with the CURRENT settings at finalize
// time through the same live pipeline as GET /api/employees/
// ranking (transitions → O8 duplicate flags → aggregates →
// scores), then snapshot + entries are written in ONE
// prisma.$transaction. The AuditLog row is written best-effort
// AFTER the transaction (logAuditStandalone never throws).
//
// Pre-push degradation: the snapshot tables do not exist until
// the owner runs `prisma db push`; in that state this route
// returns 503 with an explicit message instead of a bare 500.

function startOfDay(d: Date) {
   const x = new Date(d);
   x.setHours(0, 0, 0, 0);
   return x;
}
function endOfDay(d: Date) {
   const x = new Date(d);
   x.setHours(23, 59, 59, 999);
   return x;
}
function round2(n: number): number {
   return Math.round((Number(n) || 0) * 100) / 100;
}
function isMissingTableError(err: unknown): boolean {
   return (err as any)?.code === "P2021";
}

const PRE_PUSH_MESSAGE =
   "Employee ranking snapshots are not available yet: the snapshot tables (EmployeeRankingSnapshot / EmployeeRankingEntry) have not been pushed to this database. Run `prisma db push` first.";

/**
 * Order + user lookups + O8 duplicate flags — the same pipeline
 * step as the live ranking route (kept local: route files cannot
 * share non-handler exports). Duplicate approach: the O8 rule
 * only matches pairs of *valid* orders, so for each CANCELLED
 * order the rule's four dimensions (normalised phone + item
 * multiset + total at paisa precision + same Asia/Dhaka day) are
 * applied against earlier valid orders from ONE bounded candidate
 * query (valid orders in the cancelled orders' Dhaka-day span
 * sharing one of their raw phone numbers).
 */
async function loadLookups(transitions: { orderId: string; employeeId: string }[]): Promise<{
   orders: Map<string, RankingOrderInfo>;
   users: Map<string, RankingUserInfo>;
   activeEmployeeIds: Set<string>;
}> {
   const orderIds = Array.from(new Set(transitions.map((t) => t.orderId)));
   const employeeIds = Array.from(new Set(transitions.map((t) => t.employeeId)));

   const [orderRows, userRows] = await Promise.all([
      orderIds.length > 0
         ? prisma.order.findMany({
              where: { id: { in: orderIds } },
              select: {
                 id: true,
                 total: true,
                 createdAt: true,
                 cancellationReason: true,
                 status: true,
                 isDeleted: true,
                 customer: { select: { phone: true } },
                 items: {
                    select: { productId: true, variantId: true, quantity: true },
                 },
              },
           })
         : Promise.resolve([] as any[]),
      employeeIds.length > 0
         ? prisma.user.findMany({
              where: { id: { in: employeeIds }, status: "ACTIVE" },
              select: {
                 id: true,
                 customId: true,
                 name: true,
                 status: true,
                 role: { select: { name: true } },
              },
           })
         : Promise.resolve([] as any[]),
   ]);

   const duplicateIds = new Set<string>();
   try {
      const toInput = (o: any): DuplicateOrderInput => ({
         id: o.id,
         customerPhone: o.customer?.phone || null,
         total: Number(o.total || 0),
         createdAt: o.createdAt,
         status: o.status,
         isDeleted: o.isDeleted,
         items: (o.items || []).map((it: any) => ({
            productId: it.productId || null,
            variantId: it.variantId || null,
            quantity: it.quantity,
         })),
      });
      const cancelledInputs = (orderRows as any[])
         .filter((o) => String(o.status).toUpperCase() === "CANCELLED")
         .map(toInput);
      const rawPhones = Array.from(
         new Set(
            cancelledInputs
               .map((o) => o.customerPhone)
               .filter((p): p is string => Boolean(p && p.trim())),
         ),
      );
      if (cancelledInputs.length > 0 && rawPhones.length > 0) {
         const dayKeys = cancelledInputs
            .map((o) => dhakaDayKey(o.createdAt))
            .filter(Boolean)
            .sort();
         const rangeStart = new Date(`${dayKeys[0]}T00:00:00.000+06:00`);
         const rangeEnd = new Date(
            new Date(
               `${dayKeys[dayKeys.length - 1]}T00:00:00.000+06:00`,
            ).getTime() +
               24 * 60 * 60 * 1000,
         );
         const candidates = await prisma.order.findMany({
            where: {
               isDeleted: false,
               status: { notIn: ["CANCELLED", "FAILED"] as any },
               createdAt: { gte: rangeStart, lt: rangeEnd },
               customer: { phone: { in: rawPhones } },
            },
            select: {
               id: true,
               total: true,
               createdAt: true,
               status: true,
               isDeleted: true,
               customer: { select: { phone: true } },
               items: {
                  select: { productId: true, variantId: true, quantity: true },
               },
            },
         });
         const candidateInputs = (candidates as any[]).map(toInput);
         for (const cancelled of cancelledInputs) {
            const phone = normalizeCustomerPhone(cancelled.customerPhone);
            if (!phone) continue;
            const signature = orderItemSignature(cancelled.items || []);
            if (!signature) continue;
            const paisa = Math.round(Number(cancelled.total || 0) * 100);
            const day = dhakaDayKey(cancelled.createdAt);
            const isDuplicate = candidateInputs.some(
               (c) =>
                  c.id !== cancelled.id &&
                  new Date(c.createdAt).getTime() <=
                     new Date(cancelled.createdAt).getTime() &&
                  normalizeCustomerPhone(c.customerPhone) === phone &&
                  orderItemSignature(c.items || []) === signature &&
                  Math.round(Number(c.total || 0) * 100) === paisa &&
                  dhakaDayKey(c.createdAt) === day,
            );
            if (isDuplicate) duplicateIds.add(cancelled.id);
         }
      }
   } catch {
      // Advisory only — flags stay false on failure (see live route).
   }

   const orders = new Map<string, RankingOrderInfo>();
   for (const o of orderRows as any[]) {
      orders.set(o.id, {
         total: Number(o.total || 0),
         createdAt: new Date(o.createdAt),
         cancellationReason: o.cancellationReason ?? null,
         isDuplicate: duplicateIds.has(o.id),
         currentStatus: String(o.status || ""),
      });
   }
   const users = new Map<string, RankingUserInfo>();
   const activeEmployeeIds = new Set<string>();
   for (const u of userRows as any[]) {
      users.set(u.id, {
         customId: u.customId ?? null,
         name: u.name || u.id,
         roleName: u.role?.name ?? null,
      });
      activeEmployeeIds.add(u.id);
   }
   return { orders, users, activeEmployeeIds };
}

async function computeMonth(
   range: { start: Date; end: Date },
   settings: RankingSettings,
): Promise<ScoredEmployee[]> {
   const { transitions, unattributedOrders } = await loadPeriodTransitions(
      prisma,
      range,
   );
   const { orders, users, activeEmployeeIds } = await loadLookups(transitions);
   const { aggregates } = buildAggregates({
      transitions,
      orders,
      users,
      settings,
      unattributedOrders,
   });
   const population = aggregates.filter((a) => activeEmployeeIds.has(a.employeeId));
   const daysInPeriod =
      Math.round(
         (startOfDay(range.end).getTime() - startOfDay(range.start).getTime()) /
            86400000,
      ) + 1;
   return scoreEmployees(population, settings, daysInPeriod);
}

export async function POST(request: NextRequest) {
   // Same gate + candidate list as PUT /api/settings (plan D6).
   const gate = await requirePermission(request, [
      "settings",
      "setting",
      "setting_update_setting",
      "setting_update",
   ]);
   if (gate instanceof NextResponse) return gate;

   let periodKey: unknown;
   try {
      const body = await request.json();
      periodKey = body?.periodKey;
   } catch {
      return NextResponse.json(
         { error: "Invalid request body: expected JSON with periodKey" },
         { status: 400 },
      );
   }

   if (typeof periodKey !== "string" || !/^\d{4}-\d{2}$/.test(periodKey)) {
      return NextResponse.json(
         { error: 'Invalid periodKey: expected "YYYY-MM"' },
         { status: 400 },
      );
   }
   const [year, month] = periodKey.split("-").map((p) => parseInt(p, 10));
   if (month < 1 || month > 12) {
      return NextResponse.json(
         { error: `Invalid periodKey: "${periodKey}" is not a real month` },
         { status: 400 },
      );
   }
   const periodStart = startOfDay(new Date(year, month - 1, 1));
   const periodEnd = endOfDay(new Date(year, month, 0));
   if (periodEnd >= new Date()) {
      return NextResponse.json(
         { error: `Period ${periodKey} has not ended yet` },
         { status: 400 },
      );
   }

   try {
      // Duplicate check first → 409 (the @unique on periodKey is
      // the transactional backstop for races).
      let existing: any = null;
      try {
         existing = await prisma.employeeRankingSnapshot.findUnique({
            where: { periodKey },
            select: { id: true },
         });
      } catch (err) {
         if (isMissingTableError(err)) {
            return NextResponse.json(
               { error: PRE_PUSH_MESSAGE },
               { status: 503 },
            );
         }
         throw err;
      }
      if (existing) {
         return NextResponse.json(
            { error: `Period ${periodKey} is already finalized` },
            { status: 409 },
         );
      }

      // Settings = the CURRENT settings at finalize time (§7).
      const setting = await prisma.storeSetting.findUnique({
         where: { id: "default" },
         select: { customConfig: true },
      });
      const settings = parseRankingSettings(setting?.customConfig ?? null);

      const scored = await computeMonth(
         { start: periodStart, end: periodEnd },
         settings,
      );

      let snapshot: any;
      try {
         snapshot = await prisma.$transaction(async (tx: any) => {
            const created = await tx.employeeRankingSnapshot.create({
               data: {
                  periodKey,
                  periodStart,
                  periodEnd,
                  settingsSnapshot: settings as any,
                  weightsSnapshot: settings.weights as any,
                  finalizedById: gate.userId,
                  finalizedByLabel: gate.session?.name || gate.email || null,
               },
            });
            if (scored.length > 0) {
               await tx.employeeRankingEntry.createMany({
                  data: scored.map((s) => ({
                     snapshotId: created.id,
                     employeeId: s.employeeId,
                     employeeCustomId: s.employeeCustomId ?? null,
                     employeeName: s.employeeName,
                     roleName: s.roleName ?? null,
                     rank: s.rank,
                     provisional: s.provisional,
                     finalScore: round2(s.finalScore),
                     completedSalesScore: round2(s.scores.completedSales),
                     netRevenueScore: round2(s.scores.netRevenue),
                     confirmationRateScore: round2(s.scores.confirmationRate),
                     handlingQualityScore: round2(s.scores.handlingQuality),
                     cancellationControlScore: round2(
                        s.scores.cancellationControl,
                     ),
                     completedSales: s.completedSales,
                     netRevenue: round2(s.netRevenue),
                     confirmationDecisions:
                        s.confirmations + s.preConfirmationCancellations,
                     confirmations: s.confirmations,
                     slaOnTime: s.slaOnTime,
                     slaEvaluated: s.slaEvaluated,
                     eligibleOrders: s.handledOrders,
                     attributableCancellations: s.attributableCancellations,
                     evidence: s.evidence as any,
                  })),
               });
            }
            return created;
         });
      } catch (err: any) {
         if (err?.code === "P2002") {
            return NextResponse.json(
               { error: `Period ${periodKey} is already finalized` },
               { status: 409 },
            );
         }
         if (isMissingTableError(err)) {
            return NextResponse.json(
               { error: PRE_PUSH_MESSAGE },
               { status: 503 },
            );
         }
         throw err;
      }

      // Best-effort audit row, after the transaction (§7). The
      // AuditLog entityType column is a plain string; the
      // EMPLOYEE_RANKING vocabulary joins it here without a schema
      // change (same pattern as the P2-4 coverage extension in
      // lib/audit.ts, whose typed union is not extended by this
      // route — hence the cast).
      await logAuditStandalone({
         actor: auditActorFromContext(gate),
         action: "CREATE",
         entityType: "EMPLOYEE_RANKING" as any,
         entityId: snapshot.id,
         entityCustomId: periodKey,
         summary: `Employee ranking finalized for ${periodKey} (${scored.length} entries)`,
         ...requestAuditContext(request),
      });

      return NextResponse.json(
         {
            periodKey,
            finalizedAt: new Date(snapshot.finalizedAt).toISOString(),
            entryCount: scored.length,
         },
         { status: 201 },
      );
   } catch {
      return NextResponse.json(
         { error: "Failed to finalize employee ranking" },
         { status: 500 },
      );
   }
}
