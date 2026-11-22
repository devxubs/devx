import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import {
   parseRankingSettings,
   type RankingSettings,
} from "@src/lib/rankingSettings";
import {
   loadPeriodTransitions,
   buildAggregates,
   type AttributedTransition,
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

// Smart Employee Ranking — live read (Phase 2 plan §6–§8, Step 4).
//
// GET /api/employees/ranking?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
//
// Gate: requireActiveSession — the same gate as the dashboard API.
// Range parsing follows the dashboard route's convention exactly:
// `new Date(param)` bounded by server-local startOfDay/endOfDay;
// the default range is This Month (plan decision D8).
//
// D10 semantics: when settings.autoRecalculate === false AND the
// requested range is exactly one calendar month AND a finalized
// snapshot exists for that month, the snapshot is served instead
// (mode: "finalized", finalizedMeta set). Otherwise the ranking is
// computed live from the attribution trails (plan §4.0).
//
// Pre-push degradation: the snapshot tables do not exist in a
// database until the owner runs `prisma db push`. The snapshot
// lookup below swallows Prisma P2021 (table missing) and falls
// back to the live computation, so this endpoint works pre-push.

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

function fmtLocalDate(d: Date): string {
   const pad = (n: number) => String(n).padStart(2, "0");
   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function round2(n: number): number {
   return Math.round((Number(n) || 0) * 100) / 100;
}

function daysBetween(start: Date, end: Date): number {
   return (
      Math.round(
         (startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000,
      ) + 1
   );
}

interface RankingRow {
   employeeId: string;
   employeeCustomId: string | null;
   employeeName: string;
   roleName: string | null;
   rank: number | null;
   provisional: boolean;
   finalScore: number;
   scores: {
      completedSales: number;
      netRevenue: number;
      confirmationRate: number;
      handlingQuality: number;
      cancellationControl: number;
   };
   raw: {
      completedSales: number;
      netRevenue: number;
      confirmations: number;
      confirmationDecisions: number;
      slaOnTime: number;
      slaEvaluated: number;
      handledOrders: number;
      attributableCancellations: number;
   };
   evidence: {
      auditLogTransitions: number;
      auditHistoryTransitions: number;
      impliedTransitions: number;
      unattributedOrders: number;
   };
}

function toRow(s: ScoredEmployee): RankingRow {
   return {
      employeeId: s.employeeId,
      employeeCustomId: s.employeeCustomId ?? null,
      employeeName: s.employeeName,
      roleName: s.roleName ?? null,
      rank: s.rank,
      provisional: s.provisional,
      finalScore: round2(s.finalScore),
      scores: {
         completedSales: round2(s.scores.completedSales),
         netRevenue: round2(s.scores.netRevenue),
         confirmationRate: round2(s.scores.confirmationRate),
         handlingQuality: round2(s.scores.handlingQuality),
         cancellationControl: round2(s.scores.cancellationControl),
      },
      raw: {
         completedSales: s.completedSales,
         netRevenue: round2(s.netRevenue),
         confirmations: s.confirmations,
         confirmationDecisions:
            s.confirmations + s.preConfirmationCancellations,
         slaOnTime: s.slaOnTime,
         slaEvaluated: s.slaEvaluated,
         handledOrders: s.handledOrders,
         attributableCancellations: s.attributableCancellations,
      },
      evidence: {
         auditLogTransitions: s.evidence.auditLogTransitions,
         auditHistoryTransitions: s.evidence.auditHistoryTransitions,
         impliedTransitions: s.evidence.impliedTransitions,
         unattributedOrders: s.evidence.unattributedOrders,
      },
   };
}

function summarize(rows: RankingRow[], unattributedOrders: number) {
   const ranked = rows.filter((r) => !r.provisional);
   return {
      employeesRanked: ranked.length,
      provisionalCount: rows.length - ranked.length,
      topScore: ranked.length > 0 ? round2(ranked[0].finalScore) : 0,
      totalCompletedSales: rows.reduce((sum, r) => sum + r.raw.completedSales, 0),
      totalNetRevenue: round2(rows.reduce((sum, r) => sum + r.raw.netRevenue, 0)),
      unattributedOrders,
   };
}

async function loadRankingSettings(): Promise<RankingSettings> {
   const setting = await prisma.storeSetting.findUnique({
      where: { id: "default" },
      select: { customConfig: true },
   });
   return parseRankingSettings(setting?.customConfig ?? null);
}

/**
 * Order + user lookups for buildAggregates, plus the O8 duplicate
 * flags (§4.5). Duplicate approach: the O8 rule
 * (lib/duplicateOrders) only matches pairs of *valid* orders, and a
 * cancelled order is by definition not valid — so for each
 * CANCELLED order among the transition orders we apply the rule's
 * four dimensions (normalised phone + item multiset + total at
 * paisa precision + same Asia/Dhaka day) against earlier valid
 * orders directly, reusing the lib's exported helpers. Candidates
 * come from ONE bounded query: valid orders created inside the
 * Dhaka-day span of the transition orders and sharing one of their
 * raw customer phone numbers (the orders-list O8 pattern).
 */
async function loadLookups(transitions: AttributedTransition[]): Promise<{
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

   // ── O8 duplicate flags for the cancelled transition orders ──
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
         // Dhaka is UTC+6 year-round (same construction as the
         // orders list): a Dhaka day starts 18:00Z the day before.
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
                  // "earlier valid order" (§4.5): not created after
                  // the cancelled order it supposedly duplicates.
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
      // Duplicate flags only ever *exclude* a cancellation from
      // penalties; on any failure they stay false (the classifier's
      // safe defaults still apply). Never fail the ranking read.
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

interface RankingContext {
   transitions: AttributedTransition[];
   unattributedOrders: number;
   orders: Map<string, RankingOrderInfo>;
   users: Map<string, RankingUserInfo>;
   activeEmployeeIds: Set<string>;
}

/** Load transitions + lookups ONCE for a range (shared by the
 *  main computation and the trend buckets — no extra queries). */
async function loadContext(
   range: { start: Date; end: Date },
): Promise<RankingContext> {
   const { transitions, unattributedOrders } = await loadPeriodTransitions(
      prisma,
      range,
   );
   const { orders, users, activeEmployeeIds } = await loadLookups(transitions);
   return { transitions, unattributedOrders, orders, users, activeEmployeeIds };
}

function scoreFromContext(
   ctx: RankingContext,
   transitions: AttributedTransition[],
   settings: RankingSettings,
   daysInPeriod: number,
): ScoredEmployee[] {
   const { aggregates } = buildAggregates({
      transitions,
      orders: ctx.orders,
      users: ctx.users,
      settings,
      unattributedOrders: ctx.unattributedOrders,
   });
   // Population rule (§4.0/D7): only ACTIVE users with H > 0
   // (buildAggregates already only emits H > 0 aggregates).
   const population = aggregates.filter((a) =>
      ctx.activeEmployeeIds.has(a.employeeId),
   );
   return scoreEmployees(population, settings, daysInPeriod);
}

/**
 * Trend buckets over the already-loaded pipeline: the range is
 * split into Monday-start week buckets (capped at 12 — longer
 * ranges fall back to calendar-month buckets). Each bucket re-runs
 * buildAggregates + scoreEmployees over the SAME loaded
 * transitions/lookups (no extra DB queries); only ranked
 * (non-provisional) employees contribute a score per bucket.
 */
async function buildTrend(
   range: { start: Date; end: Date },
   settings: RankingSettings,
   ctx: RankingContext,
): Promise<{ buckets: Array<{ weekStart: string; label: string; scores: Array<{ employeeId: string; employeeName: string; finalScore: number }> }> }> {
   interface Bucket {
      start: Date;
      end: Date;
      label: string;
   }
   const buckets: Bucket[] = [];
   const totalDays = daysBetween(range.start, range.end);

   if (totalDays > 12 * 7) {
      // Monthly fallback for long ranges.
      const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
      while (cursor <= range.end && buckets.length < 12) {
         const monthStart = new Date(cursor);
         const monthEnd = endOfDay(
            new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0),
         );
         buckets.push({
            start: monthStart < range.start ? new Date(range.start) : monthStart,
            end: monthEnd > range.end ? new Date(range.end) : monthEnd,
            label: cursor.toLocaleDateString("en-US", {
               month: "short",
               year: "numeric",
            }),
         });
         cursor.setMonth(cursor.getMonth() + 1);
      }
   } else {
      // Monday-start weeks, first/last clamped to the range.
      let bucketStart = startOfDay(range.start);
      while (bucketStart <= range.end && buckets.length < 12) {
         // Days until the coming Sunday (Mon=0 … Sun=6 offset).
         const mondayOffset = (bucketStart.getDay() + 6) % 7;
         const sunday = new Date(bucketStart);
         sunday.setDate(sunday.getDate() + (6 - mondayOffset));
         const bucketEnd = endOfDay(sunday) > range.end ? new Date(range.end) : endOfDay(sunday);
         buckets.push({
            start: new Date(bucketStart),
            end: bucketEnd,
            label: bucketStart.toLocaleDateString("en-US", {
               month: "short",
               day: "numeric",
            }),
         });
         const next = new Date(sunday);
         next.setDate(next.getDate() + 1);
         bucketStart = startOfDay(next);
      }
   }

   return {
      buckets: buckets.map((bucket) => {
         const inBucket = ctx.transitions.filter(
            (t) => t.at >= bucket.start && t.at <= bucket.end,
         );
         const scored = scoreFromContext(
            ctx,
            inBucket,
            settings,
            daysBetween(bucket.start, bucket.end),
         );
         return {
            weekStart: fmtLocalDate(bucket.start),
            label: bucket.label,
            scores: scored
               .filter((s) => !s.provisional)
               .map((s) => ({
                  employeeId: s.employeeId,
                  employeeName: s.employeeName,
                  finalScore: round2(s.finalScore),
               })),
         };
      }),
   };
}

/** True when [start, end] is exactly one calendar month. */
function exactMonthPeriodKey(start: Date, end: Date): string | null {
   const isFirst = start.getDate() === 1 && start.getHours() === 0;
   const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0);
   const isLast =
      end.getFullYear() === lastDay.getFullYear() &&
      end.getMonth() === lastDay.getMonth() &&
      end.getDate() === lastDay.getDate();
   if (!isFirst || !isLast) return null;
   const pad = (n: number) => String(n).padStart(2, "0");
   return `${start.getFullYear()}-${pad(start.getMonth() + 1)}`;
}

function entryToRow(e: any): RankingRow {
   const evidence =
      e.evidence && typeof e.evidence === "object" ? e.evidence : {};
   return {
      employeeId: e.employeeId,
      employeeCustomId: e.employeeCustomId ?? null,
      employeeName: e.employeeName,
      roleName: e.roleName ?? null,
      rank: e.rank ?? null,
      provisional: Boolean(e.provisional),
      finalScore: round2(Number(e.finalScore || 0)),
      scores: {
         completedSales: round2(Number(e.completedSalesScore || 0)),
         netRevenue: round2(Number(e.netRevenueScore || 0)),
         confirmationRate: round2(Number(e.confirmationRateScore || 0)),
         handlingQuality: round2(Number(e.handlingQualityScore || 0)),
         cancellationControl: round2(Number(e.cancellationControlScore || 0)),
      },
      raw: {
         completedSales: Number(e.completedSales || 0),
         netRevenue: round2(Number(e.netRevenue || 0)),
         confirmations: Number(e.confirmations || 0),
         confirmationDecisions: Number(e.confirmationDecisions || 0),
         slaOnTime: Number(e.slaOnTime || 0),
         slaEvaluated: Number(e.slaEvaluated || 0),
         handledOrders: Number(e.eligibleOrders || 0),
         attributableCancellations: Number(e.attributableCancellations || 0),
      },
      evidence: {
         auditLogTransitions: Number(evidence.auditLogTransitions || 0),
         auditHistoryTransitions: Number(evidence.auditHistoryTransitions || 0),
         impliedTransitions: Number(evidence.impliedTransitions || 0),
         unattributedOrders: Number(evidence.unattributedOrders || 0),
      },
   };
}

function sortSnapshotRows(rows: RankingRow[]): RankingRow[] {
   const ranked = rows
      .filter((r) => !r.provisional)
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
   const provisional = rows
      .filter((r) => r.provisional)
      .sort((a, b) => b.finalScore - a.finalScore);
   return [...ranked, ...provisional];
}

export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const { searchParams } = new URL(request.url);
   const now = new Date();
   // Default = This Month (plan D8).
   let rangeStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
   let rangeEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
   const sd = searchParams.get("startDate");
   const ed = searchParams.get("endDate");
   if (sd) {
      const d = new Date(sd);
      if (!Number.isNaN(d.getTime())) rangeStart = startOfDay(d);
   }
   if (ed) {
      const d = new Date(ed);
      if (!Number.isNaN(d.getTime())) rangeEnd = endOfDay(d);
   }
   if (rangeEnd < rangeStart) rangeEnd = endOfDay(rangeStart);
   const range = { start: rangeStart, end: rangeEnd };

   try {
      const settings = await loadRankingSettings();

      // D10: autoRecalculate OFF + exact calendar month + finalized
      // snapshot → serve the snapshot.
      const periodKey = exactMonthPeriodKey(rangeStart, rangeEnd);
      if (settings.autoRecalculate === false && periodKey) {
         let snapshot: any = null;
         try {
            snapshot = await prisma.employeeRankingSnapshot.findUnique({
               where: { periodKey },
               include: { entries: true },
            });
         } catch (err: any) {
            // P2021 = snapshot tables not pushed yet → live fallback.
            if (err?.code !== "P2021") throw err;
         }
         if (snapshot) {
            const rows = sortSnapshotRows((snapshot.entries || []).map(entryToRow));
            const unattributedOrders =
               rows.length > 0 ? rows[0].evidence.unattributedOrders : 0;
            return NextResponse.json({
               mode: "finalized",
               range: {
                  startDate: fmtLocalDate(new Date(snapshot.periodStart)),
                  endDate: fmtLocalDate(new Date(snapshot.periodEnd)),
               },
               settings: snapshot.settingsSnapshot,
               summary: summarize(rows, unattributedOrders),
               rows,
               top3: rows.filter((r) => !r.provisional).slice(0, 3),
               trend: { buckets: [] },
               finalizedMeta: {
                  periodKey: snapshot.periodKey,
                  finalizedAt: new Date(snapshot.finalizedAt).toISOString(),
                  finalizedByLabel: snapshot.finalizedByLabel ?? null,
               },
            });
         }
      }

      const ctx = await loadContext(range);
      const scored = scoreFromContext(
         ctx,
         ctx.transitions,
         settings,
         daysBetween(rangeStart, rangeEnd),
      );
      const rows = scored.map(toRow);
      const unattributedOrders = ctx.unattributedOrders;
      const trend = await buildTrend(range, settings, ctx);

      return NextResponse.json({
         mode: "live",
         range: {
            startDate: fmtLocalDate(rangeStart),
            endDate: fmtLocalDate(rangeEnd),
         },
         settings,
         summary: summarize(rows, unattributedOrders),
         rows,
         top3: rows.filter((r) => !r.provisional).slice(0, 3),
         trend,
      });
   } catch {
      return NextResponse.json(
         { error: "Failed to compute employee ranking" },
         { status: 500 },
      );
   }
}
