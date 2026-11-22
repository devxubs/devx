/**
 * Smart Employee Ranking — attribution (plan §2, §4.0).
 *
 * Turns the two audit trails into attributed status transitions,
 * classifies them (confirm / complete / cancel — first per order
 * per class wins), and aggregates them per employee into the
 * engine's EmployeePeriodAggregate shape.
 *
 * The pure core (extraction, dedupe, classification, aggregation)
 * is unit-tested; `loadPeriodTransitions` is the only I/O and is
 * kept thin: bounded Prisma queries + the pure functions.
 *
 * Attribution sources, in preference order:
 *   A. AuditLog STATUS_CHANGE rows (structured, from 2026-11-20).
 *   B. orderTags.auditHistory status events (longer history).
 *   Implied: an order created directly in a post-PENDING status
 *   has no transition events; its creation is one implied
 *   transition by its creator (Order.employeeId) at createdAt.
 *   Nothing else is ever guessed — orders with no evidence are
 *   counted as unattributed, never credited.
 */
import { normalizeOrderStatus } from "../orderStatus";
import type { RankingSettings } from "../rankingSettings";
import type { EmployeePeriodAggregate } from "./engine";
import { classifyCancellation } from "./cancellation";

export interface AttributedTransition {
   orderId: string;
   employeeId: string;
   toStatus: string;
   fromStatus: string | null;
   at: Date;
   source: "auditlog" | "history" | "implied";
   cancellationReason?: string | null;
}

/** Minimal AuditLog row shape the extractor needs. */
export interface AuditLogLike {
   entityId: string;
   actorId: string | null;
   createdAt: Date | string;
   changes: unknown;
}

const SOURCE_PRIORITY: Record<AttributedTransition["source"], number> = {
   auditlog: 0,
   history: 1,
   implied: 2,
};

function toDate(value: Date | string | null | undefined): Date | null {
   if (value === null || value === undefined) return null;
   const d = value instanceof Date ? value : new Date(value);
   return Number.isNaN(d.getTime()) ? null : d;
}

function asRecord(value: unknown): Record<string, unknown> | null {
   return value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
}

/**
 * Source A: AuditLog rows → transitions. The caller passes rows
 * pre-filtered to entityType "ORDER" / action "STATUS_CHANGE";
 * here a row only counts when `changes.status.to` is present and
 * the actor is a real user id. The AuditLog cancellationReason
 * diff (§4.5) is carried onto CANCELLED transitions when present.
 */
export function transitionsFromAuditLog(
   rows: AuditLogLike[],
): AttributedTransition[] {
   const out: AttributedTransition[] = [];
   for (const row of rows || []) {
      if (!row || !row.entityId || !row.actorId) continue;
      const changes = asRecord(row.changes);
      const statusChange = asRecord(changes?.status);
      if (!statusChange || statusChange.to === null || statusChange.to === undefined) {
         continue;
      }
      const toStatus = normalizeOrderStatus(statusChange.to);
      if (!toStatus) continue;
      const at = toDate(row.createdAt);
      if (!at) continue;

      const reasonChange = asRecord(changes?.cancellationReason);
      const reason =
         reasonChange && typeof reasonChange.to === "string"
            ? reasonChange.to
            : null;

      out.push({
         orderId: row.entityId,
         employeeId: row.actorId,
         toStatus,
         fromStatus:
            statusChange.from === null || statusChange.from === undefined
               ? null
               : normalizeOrderStatus(statusChange.from),
         at,
         source: "auditlog",
         ...(toStatus === "CANCELLED" ? { cancellationReason: reason } : {}),
      });
   }
   return out;
}

/**
 * Source B: one order's `orderTags.auditHistory` → transitions.
 * Only events whose `diff.field === "status"` count (note events
 * carry the note title as diff.field and are ignored). The
 * cancellation event written by the order PUT embeds its reason
 * in `details` ("Order cancelled. Reason: …") — parsed back out
 * for the §4.5 classifier.
 */
export function transitionsFromAuditHistory(order: {
   id: string;
   orderTags: unknown;
}): AttributedTransition[] {
   let tags: unknown = order?.orderTags;
   if (typeof tags === "string") {
      try {
         tags = JSON.parse(tags);
      } catch {
         return [];
      }
   }
   const tagsRecord = asRecord(tags);
   const history = tagsRecord?.auditHistory;
   if (!Array.isArray(history)) return [];

   const out: AttributedTransition[] = [];
   for (const event of history) {
      const ev = asRecord(event);
      if (!ev) continue;
      const diff = asRecord(ev.diff);
      if (!diff || diff.field !== "status") continue;
      if (diff.new === null || diff.new === undefined) continue;
      const toStatus = normalizeOrderStatus(diff.new);
      if (!toStatus) continue;
      const actor = asRecord(ev.actor);
      const employeeId =
         actor && typeof actor.id === "string" && actor.id ? actor.id : null;
      if (!employeeId) continue;
      const at = toDate(ev.timestamp as Date | string | undefined);
      if (!at) continue;

      let cancellationReason: string | null = null;
      if (toStatus === "CANCELLED" && typeof ev.details === "string") {
         const marker = "Reason: ";
         const idx = ev.details.indexOf(marker);
         if (idx >= 0) {
            cancellationReason = ev.details.slice(idx + marker.length) || null;
         }
      }

      out.push({
         orderId: order.id,
         employeeId,
         toStatus,
         fromStatus:
            diff.previous === null || diff.previous === undefined
               ? null
               : normalizeOrderStatus(diff.previous as string),
         at,
         source: "history",
         ...(toStatus === "CANCELLED" ? { cancellationReason } : {}),
      });
   }
   return out;
}

/**
 * §4.0 dedupe: same (orderId, to-status, time to the minute) from
 * two sources is ONE transition — AuditLog wins over auditHistory
 * wins over implied. First-seen position is preserved.
 */
export function dedupeTransitions(
   list: AttributedTransition[],
): AttributedTransition[] {
   const byKey = new Map<string, AttributedTransition>();
   const order: string[] = [];
   for (const t of list || []) {
      const minute = Math.floor(t.at.getTime() / 60000);
      const key = `${t.orderId}|${t.toStatus}|${minute}`;
      const existing = byKey.get(key);
      if (!existing) {
         byKey.set(key, t);
         order.push(key);
      } else if (SOURCE_PRIORITY[t.source] < SOURCE_PRIORITY[existing.source]) {
         byKey.set(key, t);
      }
   }
   return order.map((key) => byKey.get(key)!);
}

const CONFIRM_TARGET_STATUSES: ReadonlySet<string> = new Set([
   "CONFIRMED",
   "PROCESSING",
   "SHIPPED",
   "OUT_FOR_DELIVERY",
   "DELIVERED",
   "COMPLETED",
]);
const CONFIRM_FROM_STATUSES: ReadonlySet<string> = new Set(["PENDING", "HOLD"]);
const COMPLETE_TARGET_STATUSES: ReadonlySet<string> = new Set([
   "DELIVERED",
   "COMPLETED",
]);

export interface ClassifiedTransitions {
   /** First confirm-class transition per order. */
   confirm: Map<string, AttributedTransition>;
   /** First complete-class transition per order. */
   complete: Map<string, AttributedTransition>;
   /** First cancel-class transition per order (list form). */
   cancel: AttributedTransition[];
}

/**
 * §4.0 transition classes — first entry per order per class wins
 * (earliest `at`; ties break AuditLog → auditHistory → implied,
 * then input order):
 *   confirm-class: into {CONFIRMED, PROCESSING, SHIPPED,
 *     OUT_FOR_DELIVERY, DELIVERED, COMPLETED} from {PENDING, HOLD}.
 *     A null from-status also qualifies: it only occurs on implied
 *     transitions, where creation itself is the act being credited.
 *   complete-class: into {DELIVERED, COMPLETED} (any from).
 *   cancel-class: into CANCELLED (any from; from-status retained
 *     for the §4.3 pre-confirmation rule).
 */
export function firstTransitionsByClass(
   transitions: AttributedTransition[],
): ClassifiedTransitions {
   const sorted = (transitions || [])
      .map((t, index) => ({ t, index }))
      .sort((a, b) => {
         const byTime = a.t.at.getTime() - b.t.at.getTime();
         if (byTime !== 0) return byTime;
         const bySource =
            SOURCE_PRIORITY[a.t.source] - SOURCE_PRIORITY[b.t.source];
         if (bySource !== 0) return bySource;
         return a.index - b.index;
      })
      .map(({ t }) => t);

   const confirm = new Map<string, AttributedTransition>();
   const complete = new Map<string, AttributedTransition>();
   const cancelByOrder = new Map<string, AttributedTransition>();

   for (const t of sorted) {
      if (
         CONFIRM_TARGET_STATUSES.has(t.toStatus) &&
         (t.fromStatus === null || CONFIRM_FROM_STATUSES.has(t.fromStatus)) &&
         !confirm.has(t.orderId)
      ) {
         confirm.set(t.orderId, t);
      }
      if (COMPLETE_TARGET_STATUSES.has(t.toStatus) && !complete.has(t.orderId)) {
         complete.set(t.orderId, t);
      }
      if (t.toStatus === "CANCELLED" && !cancelByOrder.has(t.orderId)) {
         cancelByOrder.set(t.orderId, t);
      }
   }

   return { confirm, complete, cancel: [...cancelByOrder.values()] };
}

/** Order facts buildAggregates needs, keyed by order id. */
export interface RankingOrderInfo {
   total: number;
   createdAt: Date;
   cancellationReason: string | null;
   /** O8 duplicate flag, computed by the caller (lib/duplicateOrders). */
   isDuplicate: boolean;
   /** Status at calculation time — §4.1 counts completions only
    *  while the order is still DELIVERED/COMPLETED. */
   currentStatus: string;
}

export interface RankingUserInfo {
   customId: string | null;
   name: string;
   roleName?: string | null;
}

type Lookup<T> = Map<string, T> | Record<string, T>;

function lookupGet<T>(lookup: Lookup<T>, key: string): T | undefined {
   if (lookup instanceof Map) return lookup.get(key);
   return (lookup as Record<string, T>)[key];
}

/**
 * Pure aggregation: deduped transitions + order/user lookups →
 * per-employee aggregates for the engine.
 *
 * - H(E): distinct orders with ≥1 transition by E (any class,
 *   implied included). Only employees with H > 0 appear (§4.0
 *   population).
 * - Conf/CancPre from the confirm/cancel classes; CancPre counts
 *   only cancels whose from-status is PENDING or HOLD (§4.3).
 * - C/R from the complete class, filtered to orders whose CURRENT
 *   status is still DELIVERED/COMPLETED (§4.1) — an order completed
 *   in the period but later cancelled drops out.
 * - SLA (§4.4): latency = confirm.at − order.createdAt ≤
 *   processingSlaHours counts on-time; slaEvaluated counts the
 *   confirmations whose order data was available to evaluate.
 * - A(E): cancels classified "attributable" by
 *   classifyCancellation(reason, { isDuplicate }); the reason
 *   prefers the transition's own recorded reason (AuditLog diff /
 *   history details) over the order column.
 * - evidence: per-employee transition counts by source.
 *   `unattributedOrders` is period-level evidence (not per
 *   employee): the caller-supplied global count is stamped on
 *   every aggregate's evidence so the API/UI can surface it from
 *   any row, and it is also returned separately.
 */
export function buildAggregates(params: {
   transitions: AttributedTransition[];
   orders: Lookup<RankingOrderInfo>;
   users: Lookup<RankingUserInfo>;
   settings: RankingSettings;
   unattributedOrders: number;
}): { aggregates: EmployeePeriodAggregate[]; unattributedOrders: number } {
   const { transitions, orders, users, settings } = params;
   const classified = firstTransitionsByClass(transitions);
   const slaLimitMs = settings.processingSlaHours * 60 * 60 * 1000;

   interface Acc {
      handled: Set<string>;
      completedSales: number;
      netRevenue: number;
      confirmations: number;
      preConfirmationCancellations: number;
      slaOnTime: number;
      slaEvaluated: number;
      attributableCancellations: number;
      auditLogTransitions: number;
      auditHistoryTransitions: number;
      impliedTransitions: number;
   }
   const accs = new Map<string, Acc>();
   const accFor = (employeeId: string): Acc => {
      let acc = accs.get(employeeId);
      if (!acc) {
         acc = {
            handled: new Set(),
            completedSales: 0,
            netRevenue: 0,
            confirmations: 0,
            preConfirmationCancellations: 0,
            slaOnTime: 0,
            slaEvaluated: 0,
            attributableCancellations: 0,
            auditLogTransitions: 0,
            auditHistoryTransitions: 0,
            impliedTransitions: 0,
         };
         accs.set(employeeId, acc);
      }
      return acc;
   };

   // H(E) + evidence counts come from ALL transitions, not just
   // the classified first-per-class ones.
   for (const t of transitions || []) {
      const acc = accFor(t.employeeId);
      acc.handled.add(t.orderId);
      if (t.source === "auditlog") acc.auditLogTransitions += 1;
      else if (t.source === "history") acc.auditHistoryTransitions += 1;
      else acc.impliedTransitions += 1;
   }

   for (const [orderId, t] of classified.confirm) {
      const acc = accFor(t.employeeId);
      acc.confirmations += 1;
      const order = lookupGet(orders, orderId);
      if (order) {
         acc.slaEvaluated += 1;
         const latency = t.at.getTime() - order.createdAt.getTime();
         if (latency <= slaLimitMs) acc.slaOnTime += 1;
      }
   }

   for (const [orderId, t] of classified.complete) {
      const order = lookupGet(orders, orderId);
      if (!order) continue;
      const current = String(order.currentStatus || "").toUpperCase();
      if (!COMPLETE_TARGET_STATUSES.has(current)) continue;
      const acc = accFor(t.employeeId);
      acc.completedSales += 1;
      acc.netRevenue += Number(order.total) || 0;
   }

   for (const t of classified.cancel) {
      const acc = accFor(t.employeeId);
      // §4.3, literally: only cancels FROM PENDING/HOLD are
      // pre-confirmation rejections. A null from-status (implied
      // transition) does not qualify — the from-status is unknown,
      // and unknown is never counted against (or for) an employee.
      if (t.fromStatus !== null && CONFIRM_FROM_STATUSES.has(t.fromStatus)) {
         acc.preConfirmationCancellations += 1;
      }
      const order = lookupGet(orders, t.orderId);
      const reason = t.cancellationReason ?? order?.cancellationReason ?? null;
      const cls = classifyCancellation(reason, {
         isDuplicate: order?.isDuplicate ?? false,
      });
      if (cls === "attributable") acc.attributableCancellations += 1;
   }

   const aggregates: EmployeePeriodAggregate[] = [];
   for (const [employeeId, acc] of accs) {
      if (acc.handled.size === 0) continue;
      const user = lookupGet(users, employeeId);
      aggregates.push({
         employeeId,
         employeeCustomId: user?.customId ?? null,
         employeeName: user?.name ?? employeeId,
         roleName: user?.roleName ?? null,
         completedSales: acc.completedSales,
         netRevenue: acc.netRevenue,
         confirmations: acc.confirmations,
         preConfirmationCancellations: acc.preConfirmationCancellations,
         slaOnTime: acc.slaOnTime,
         slaEvaluated: acc.slaEvaluated,
         handledOrders: acc.handled.size,
         attributableCancellations: acc.attributableCancellations,
         evidence: {
            auditLogTransitions: acc.auditLogTransitions,
            auditHistoryTransitions: acc.auditHistoryTransitions,
            impliedTransitions: acc.impliedTransitions,
            unattributedOrders: params.unattributedOrders,
         },
      });
   }

   return { aggregates, unattributedOrders: params.unattributedOrders };
}

/**
 * I/O loader (thin): every attributed transition whose time falls
 * in `range`, plus the period's unattributed-order count.
 *
 * Queries are bounded: AuditLog by (entityType, action, createdAt
 * range); orders by updatedAt range for auditHistory extraction
 * (a status PUT in the period bumps updatedAt, so in-period
 * history events live on in-period-updated orders; extracted
 * events are then filtered to the range by their own timestamp);
 * orders by createdAt range for implied transitions / the
 * unattributed count. Deleted (Bin) orders are excluded.
 *
 * Implied rule (§2.5/§4.0): an order created in range whose current
 * status is beyond PENDING and which has NO transition evidence at
 * all gets one implied transition into its current status by its
 * creator at createdAt. If it has no creator either, there is no
 * honest attribution: it increments `unattributedOrders` instead.
 */
export async function loadPeriodTransitions(
   prismaClient: any,
   range: { start: Date; end: Date },
): Promise<{ transitions: AttributedTransition[]; unattributedOrders: number }> {
   const inRange = (d: Date) => d >= range.start && d <= range.end;

   const auditRows: AuditLogLike[] = await prismaClient.auditLog.findMany({
      where: {
         entityType: "ORDER",
         action: "STATUS_CHANGE",
         createdAt: { gte: range.start, lte: range.end },
      },
      select: { entityId: true, actorId: true, createdAt: true, changes: true },
   });
   const fromAuditLog = transitionsFromAuditLog(auditRows || []);

   const updatedOrders: Array<{ id: string; orderTags: unknown }> =
      await prismaClient.order.findMany({
         where: {
            updatedAt: { gte: range.start, lte: range.end },
            isDeleted: false,
         },
         select: { id: true, orderTags: true },
      });
   const fromHistory: AttributedTransition[] = [];
   for (const order of updatedOrders || []) {
      for (const t of transitionsFromAuditHistory(order)) {
         if (inRange(t.at)) fromHistory.push(t);
      }
   }

   let transitions = dedupeTransitions([...fromAuditLog, ...fromHistory]);
   const evidencedOrderIds = new Set(transitions.map((t) => t.orderId));

   const createdOrders: Array<{
      id: string;
      status: string;
      employeeId: string | null;
      createdAt: Date | string;
   }> = await prismaClient.order.findMany({
      where: {
         createdAt: { gte: range.start, lte: range.end },
         isDeleted: false,
      },
      select: { id: true, status: true, employeeId: true, createdAt: true },
   });

   const implied: AttributedTransition[] = [];
   let unattributedOrders = 0;
   for (const order of createdOrders || []) {
      const status = normalizeOrderStatus(order.status);
      // Still PENDING = never reached a post-PENDING status; not
      // an attribution gap.
      if (!status || status === "PENDING") continue;
      if (evidencedOrderIds.has(order.id)) continue;
      const createdAt = toDate(order.createdAt);
      if (!createdAt) continue;
      if (order.employeeId) {
         implied.push({
            orderId: order.id,
            employeeId: order.employeeId,
            toStatus: status,
            fromStatus: null,
            at: createdAt,
            source: "implied",
         });
      } else {
         unattributedOrders += 1;
      }
   }
   if (implied.length > 0) {
      transitions = dedupeTransitions([...transitions, ...implied]);
   }

   return { transitions, unattributedOrders };
}
