import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";

// ── Customer statistics (list upgrade) ─────────────────────────────────
// "Valid orders" follow the existing business rules used by the customer
// analytics helpers: an order counts towards a customer's purchase
// statistics when it is not soft-deleted and not CANCELLED / FAILED.
// (RETURNED is part of the documented rule set but does not exist in the
// OrderStatus enum, so it can never occur in stored data.)
const EXCLUDED_ORDER_STATUSES = ["CANCELLED", "FAILED"] as const;

type CustomerStats = {
   totalOrders: number;
   totalPurchase: number;
   totalPaid: number;
   totalDue: number;
   lastOrderAt: Date | null;
   status: "New" | "Returning";
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Parse an ISO date param; a bare YYYY-MM-DD gets day boundaries applied. */
function parseDateParam(
   raw: string | null,
   boundary: "start" | "end",
): Date | null {
   if (!raw) return null;
   const trimmed = raw.trim();
   if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = new Date(
         `${trimmed}T${boundary === "end" ? "23:59:59.999" : "00:00:00.000"}`,
      );
      return isNaN(d.getTime()) ? null : d;
   }
   const d = new Date(trimmed);
   return isNaN(d.getTime()) ? null : d;
}

type RangeCheck = { op: "eq" | "gt" | "lt" | "between"; v1: number; v2: number | null };

/** Read a generic range filter: {prefix}Op, {prefix}Value, {prefix}Value2. */
function getRangeCheck(
   searchParams: URLSearchParams,
   prefix: string,
): RangeCheck | null {
   const op = searchParams.get(`${prefix}Op`);
   const raw1 = searchParams.get(`${prefix}Value`);
   if (!op || raw1 === null || raw1 === "") return null;
   if (!["eq", "gt", "lt", "between"].includes(op)) return null;
   const v1 = Number(raw1);
   if (Number.isNaN(v1)) return null;
   let v2: number | null = null;
   if (op === "between") {
      const raw2 = searchParams.get(`${prefix}Value2`);
      if (raw2 === null || raw2 === "") return null;
      v2 = Number(raw2);
      if (Number.isNaN(v2)) return null;
   }
   return { op: op as RangeCheck["op"], v1, v2 };
}

function matchesRange(value: number, check: RangeCheck): boolean {
   switch (check.op) {
      case "eq":
         return Math.abs(value - check.v1) < 0.005;
      case "gt":
         return value > check.v1;
      case "lt":
         return value < check.v1;
      case "between": {
         const lo = Math.min(check.v1, check.v2 ?? check.v1);
         const hi = Math.max(check.v1, check.v2 ?? check.v1);
         return value >= lo && value <= hi;
      }
      default:
         return true;
   }
}

const SORTABLE_FIELDS = [
   "name",
   "customId",
   "createdAt",
   "totalOrders",
   "totalPurchase",
   "totalPaid",
   "totalDue",
   "lastOrderAt",
] as const;

export async function GET(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { searchParams } = new URL(request.url);
   const isExportAll = searchParams.get("all") === "true" || searchParams.get("export") === "true";
   const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
   const limit = isExportAll ? 10000 : Math.min(parseInt(searchParams.get("limit") || "20"), 100);
   const search = searchParams.get("search")?.trim() || "";
   const skip = isExportAll ? 0 : (page - 1) * limit;

   const where: any = { isDeleted: false };
   if (search) {
      where.OR = [
         { name: { contains: search } },
         { phone: { contains: search } },
         { email: { contains: search } },
         { customId: { contains: search } },
      ];
   }

   // Registration (customer createdAt) range — applied in the DB query.
   const regFrom = parseDateParam(searchParams.get("regFrom"), "start");
   const regTo = parseDateParam(searchParams.get("regTo"), "end");
   if (regFrom || regTo) {
      where.createdAt = {
         ...(regFrom ? { gte: regFrom } : {}),
         ...(regTo ? { lte: regTo } : {}),
      };
   }

   // Statistic / last-order filters — applied after stats are merged.
   const statusParam = searchParams.get("status");
   const rangeChecks: { field: keyof CustomerStats; check: RangeCheck }[] = [];
   const rangeParamMap: { prefix: string; field: "totalOrders" | "totalPurchase" | "totalPaid" | "totalDue" }[] = [
      { prefix: "orders", field: "totalOrders" },
      { prefix: "purchase", field: "totalPurchase" },
      { prefix: "paid", field: "totalPaid" },
      { prefix: "due", field: "totalDue" },
   ];
   for (const { prefix, field } of rangeParamMap) {
      const check = getRangeCheck(searchParams, prefix);
      if (check) rangeChecks.push({ field, check });
   }
   const neverOrdered = searchParams.get("neverOrdered") === "1";
   const lastFrom = parseDateParam(searchParams.get("lastFrom"), "start");
   const lastTo = parseDateParam(searchParams.get("lastTo"), "end");

   const sortByParam = searchParams.get("sortBy") || "";
   const sortBy = (SORTABLE_FIELDS as readonly string[]).includes(sortByParam)
      ? sortByParam
      : "createdAt";
   const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

   try {
      // Fetch every customer matching the DB-level filters (search +
      // registration range). Statistics are merged in memory below, so
      // pagination happens after all filters, keeping `total` accurate.
      const matched = await prisma.customer.findMany({
         where,
         include: {
            orders: { select: { status: true } },
            _count: { select: { orders: true } },
         },
         orderBy: { createdAt: "desc" },
      });

      // One grouped aggregate for the whole matched set — no per-customer
      // queries (avoids N+1).
      const statsByCustomer = new Map<string, CustomerStats>();
      if (matched.length > 0) {
         const grouped = await prisma.order.groupBy({
            by: ["customerId"],
            where: {
               customerId: { in: matched.map((c) => c.id) },
               isDeleted: false,
               status: { notIn: [...EXCLUDED_ORDER_STATUSES] },
            },
            _count: { _all: true },
            _sum: { total: true, advancePayment: true, dueAmount: true },
            _max: { createdAt: true },
         });
         for (const g of grouped) {
            if (!g.customerId) continue;
            const totalOrders = g._count._all;
            statsByCustomer.set(g.customerId, {
               totalOrders,
               totalPurchase: round2(Number(g._sum.total ?? 0)),
               totalPaid: round2(Number(g._sum.advancePayment ?? 0)),
               totalDue: round2(Number(g._sum.dueAmount ?? 0)),
               lastOrderAt: g._max.createdAt ?? null,
               status: totalOrders > 1 ? "Returning" : "New",
            });
         }
      }

      const emptyStats: CustomerStats = {
         totalOrders: 0,
         totalPurchase: 0,
         totalPaid: 0,
         totalDue: 0,
         lastOrderAt: null,
         status: "New",
      };

      let enriched = matched.map((c) => ({
         ...c,
         stats: statsByCustomer.get(c.id) ?? { ...emptyStats },
      }));

      // ── In-memory filters (AND logic, combined with search above) ──
      if (statusParam === "new" || statusParam === "returning") {
         enriched = enriched.filter(
            (c) => c.stats.status.toLowerCase() === statusParam,
         );
      }
      for (const { field, check } of rangeChecks) {
         enriched = enriched.filter((c) =>
            matchesRange(Number(c.stats[field] ?? 0), check),
         );
      }
      if (neverOrdered) {
         enriched = enriched.filter((c) => c.stats.lastOrderAt === null);
      } else if (lastFrom || lastTo) {
         enriched = enriched.filter((c) => {
            const d = c.stats.lastOrderAt;
            if (!d) return false;
            if (lastFrom && d < lastFrom) return false;
            if (lastTo && d > lastTo) return false;
            return true;
         });
      }

      // ── Sorting (null lastOrderAt always sorts last) ──
      const dirMul = sortDir === "asc" ? 1 : -1;
      enriched.sort((a, b) => {
         switch (sortBy) {
            case "name":
               return dirMul * a.name.localeCompare(b.name);
            case "customId":
               return (
                  dirMul *
                  (a.customId || "").localeCompare(b.customId || "", undefined, {
                     numeric: true,
                  })
               );
            case "createdAt":
               return dirMul * (a.createdAt.getTime() - b.createdAt.getTime());
            case "lastOrderAt": {
               const av = a.stats.lastOrderAt?.getTime() ?? null;
               const bv = b.stats.lastOrderAt?.getTime() ?? null;
               if (av === null && bv === null) return 0;
               if (av === null) return 1;
               if (bv === null) return -1;
               return dirMul * (av - bv);
            }
            case "totalOrders":
            case "totalPurchase":
            case "totalPaid":
            case "totalDue":
               return dirMul * (a.stats[sortBy] - b.stats[sortBy]);
            default:
               return 0;
         }
      });

      const total = enriched.length;
      const customers = isExportAll
         ? enriched.slice(0, limit)
         : enriched.slice(skip, skip + limit);

      return NextResponse.json({ customers, total, page, limit });
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch customers" },
         { status: 500 },
      );
   }
}

export async function POST(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const body = await request.json();
      const { name, email, phone, address } = body;

      if (!name) {
         return NextResponse.json(
            { error: "Customer name is required" },
            { status: 400 },
         );
      }

      // CUS-01 fix: validate phone format and prevent duplicate
      // customer records for the same phone number. Existing records
      // are never merged or deleted automatically — the caller gets
      // the existing record's identity back and can use it instead.
      const normalizedPhone = phone ? String(phone).replace(/[\s-]/g, "") : null;
      if (normalizedPhone && !/^\+?[0-9]{7,15}$/.test(normalizedPhone)) {
         return NextResponse.json(
            { error: "Invalid phone number format" },
            { status: 400 },
         );
      }

      if (normalizedPhone) {
         const duplicate = await prisma.customer.findFirst({
            where: { phone: normalizedPhone, isDeleted: false },
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

      const { customId } = await generateNextEntityId("CUSTOMER");

      const customer = await prisma.customer.create({
         data: {
            customId,
            name,
            email: email || null,
            phone: normalizedPhone,
            address: address || null,
         },
      });

      return NextResponse.json(customer, { status: 201 });
   } catch {
      return NextResponse.json(
         { error: "Failed to create customer" },
         { status: 500 },
      );
   }
}
