import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

// Smart Employee Ranking — finalized snapshot reads (Phase 2 plan
// §7, Step 4). Read-only: snapshots are immutable, so this route
// has no update/delete handlers and never will.
//
// GET /api/employees/ranking/history
//   → { periods: [{ periodKey, periodStart, periodEnd, finalizedAt,
//        finalizedByLabel, entryCount }] } (newest period first)
// GET /api/employees/ranking/history?period=YYYY-MM
//   → one finalized snapshot in the shared Row shape, or 404 when
//     that period was never finalized.
//
// Gate: requireActiveSession (same as the dashboard/ranking APIs).
//
// Pre-push degradation: the snapshot tables do not exist until the
// owner runs `prisma db push`. The list read catches Prisma P2021
// (table missing) and returns { periods: [] } so the UI degrades
// gracefully; a single-period read in that state is simply "not
// finalized" → 404.

function round2(n: number): number {
   return Math.round((Number(n) || 0) * 100) / 100;
}

function fmtLocalDate(d: Date): string {
   const pad = (n: number) => String(n).padStart(2, "0");
   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function entryToRow(e: any) {
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

type RankingRow = ReturnType<typeof entryToRow>;

function sortSnapshotRows(rows: RankingRow[]): RankingRow[] {
   const ranked = rows
      .filter((r) => !r.provisional)
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
   const provisional = rows
      .filter((r) => r.provisional)
      .sort((a, b) => b.finalScore - a.finalScore);
   return [...ranked, ...provisional];
}

function summarize(rows: RankingRow[]) {
   const ranked = rows.filter((r) => !r.provisional);
   return {
      employeesRanked: ranked.length,
      provisionalCount: rows.length - ranked.length,
      topScore: ranked.length > 0 ? round2(ranked[0].finalScore) : 0,
      totalCompletedSales: rows.reduce((sum, r) => sum + r.raw.completedSales, 0),
      totalNetRevenue: round2(rows.reduce((sum, r) => sum + r.raw.netRevenue, 0)),
      unattributedOrders:
         rows.length > 0 ? rows[0].evidence.unattributedOrders : 0,
   };
}

function isMissingTableError(err: unknown): boolean {
   return (err as any)?.code === "P2021";
}

export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const { searchParams } = new URL(request.url);
   const period = searchParams.get("period");

   try {
      if (period) {
         let snapshot: any = null;
         try {
            snapshot = await prisma.employeeRankingSnapshot.findUnique({
               where: { periodKey: period },
               include: { entries: true },
            });
         } catch (err) {
            if (isMissingTableError(err)) {
               return NextResponse.json(
                  { error: `Period ${period} is not finalized` },
                  { status: 404 },
               );
            }
            throw err;
         }
         if (!snapshot) {
            return NextResponse.json(
               { error: `Period ${period} is not finalized` },
               { status: 404 },
            );
         }
         const rows = sortSnapshotRows((snapshot.entries || []).map(entryToRow));
         return NextResponse.json({
            mode: "finalized",
            periodKey: snapshot.periodKey,
            finalizedAt: new Date(snapshot.finalizedAt).toISOString(),
            finalizedByLabel: snapshot.finalizedByLabel ?? null,
            settings: snapshot.settingsSnapshot,
            summary: summarize(rows),
            rows,
            top3: rows.filter((r) => !r.provisional).slice(0, 3),
         });
      }

      let snapshots: any[] = [];
      try {
         snapshots = await prisma.employeeRankingSnapshot.findMany({
            orderBy: { periodStart: "desc" },
            include: { _count: { select: { entries: true } } },
         });
      } catch (err) {
         // Pre-push: tables missing → empty history, not an error.
         if (isMissingTableError(err)) {
            return NextResponse.json({ periods: [] });
         }
         throw err;
      }

      return NextResponse.json({
         periods: snapshots.map((s: any) => ({
            periodKey: s.periodKey,
            periodStart: fmtLocalDate(new Date(s.periodStart)),
            periodEnd: fmtLocalDate(new Date(s.periodEnd)),
            finalizedAt: new Date(s.finalizedAt).toISOString(),
            finalizedByLabel: s.finalizedByLabel ?? null,
            entryCount: Number(s._count?.entries || 0),
         })),
      });
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch ranking history" },
         { status: 500 },
      );
   }
}
