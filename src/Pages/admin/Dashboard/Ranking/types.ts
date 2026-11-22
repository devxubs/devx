import type { RankingSettings } from "@src/lib/rankingSettings";

/**
 * Client-side shapes for the ranking API contract
 * (GET /api/employees/ranking, .../ranking/history, POST .../finalize).
 * These mirror the server payload exactly — no field is renamed.
 */

export interface RankingScores {
   completedSales: number;
   netRevenue: number;
   confirmationRate: number;
   handlingQuality: number;
   cancellationControl: number;
}

export interface RankingRaw {
   completedSales: number;
   netRevenue: number;
   confirmations: number;
   confirmationDecisions: number;
   slaOnTime: number;
   slaEvaluated: number;
   handledOrders: number;
   attributableCancellations: number;
}

export interface RankingEvidence {
   auditLogTransitions: number;
   auditHistoryTransitions: number;
   impliedTransitions: number;
   unattributedOrders: number;
}

export interface RankingRow {
   employeeId: string;
   employeeCustomId: string | null;
   employeeName: string;
   roleName: string | null;
   rank: number | null;
   provisional: boolean;
   finalScore: number;
   scores: RankingScores;
   raw: RankingRaw;
   evidence: RankingEvidence;
}

export interface RankingSummary {
   employeesRanked: number;
   provisionalCount: number;
   topScore: number;
   totalCompletedSales: number;
   totalNetRevenue: number;
   unattributedOrders: number;
}

export interface TrendBucket {
   weekStart: string;
   label: string;
   scores: { employeeId: string; employeeName: string; finalScore: number }[];
}

export interface RankingResponse {
   mode: string;
   range?: { startDate: string; endDate: string };
   settings: RankingSettings;
   summary: RankingSummary;
   rows: RankingRow[];
   top3: RankingRow[];
   trend?: { buckets: TrendBucket[] };
   finalizedMeta?: {
      periodKey?: string;
      finalizedAt?: string;
      finalizedByLabel?: string | null;
   } | null;
   periodKey?: string;
   finalizedAt?: string;
   finalizedByLabel?: string | null;
}

export interface HistoryPeriod {
   periodKey: string;
   periodStart: string;
   periodEnd: string;
   finalizedAt: string;
   finalizedByLabel: string | null;
   entryCount: number;
}

/** The five scored metrics, in display order (S1..S5). */
export const METRICS: {
   key: keyof RankingScores;
   short: string;
   label: string;
}[] = [
   { key: "completedSales", short: "S1", label: "Completed Sales" },
   { key: "netRevenue", short: "S2", label: "Net Revenue" },
   { key: "confirmationRate", short: "S3", label: "Confirmation Rate" },
   { key: "handlingQuality", short: "S4", label: "Handling Quality" },
   { key: "cancellationControl", short: "S5", label: "Cancellation Control" },
];

export const fmtScore = (value: number | null | undefined): string =>
   Number(value ?? 0).toFixed(2);
