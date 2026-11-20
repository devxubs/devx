import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";
import {
   fetchCustomerListPage,
   parseCustomerListParams,
} from "@src/lib/customerList";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
} from "@src/lib/audit";

// ── Customer list (Phase B4a, P1-13) ───────────────────────────────────
// The list is paginated IN THE DATABASE: derived-stat filtering,
// segment filtering, sorting (including by the derived stats) and
// pagination all happen in the aggregated SQL built by
// lib/customerList, and the response is bounded by the page size
// (shared parsePagination: default 20, max 100). The old `?all=true`
// / `?export=true` full-population hatch is RETIRED — those params
// are now ignored and the response stays bounded; callers that need
// every matched row walk the pages (the Customers page uses
// lib/fetchAllPages, like the other lists' exports). Behaviour —
// rows, derived stats, segments, totals, sort orders, filter
// semantics, response shape — is identical to the in-memory
// implementation it replaced; see lib/customerList for the map.

export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const { searchParams } = new URL(request.url);

   // Filter facets for the Customer Filters modal: the distinct order
   // source values that actually exist in the data (no invented options).
   if (searchParams.get("facets") === "1") {
      try {
         const grouped = await prisma.order.groupBy({
            by: ["orderSource"],
            where: { isDeleted: false, orderSource: { not: null } },
         });
         const orderSources = grouped
            .map((g) => (g.orderSource || "").trim())
            .filter((s) => s !== "")
            .sort((a, b) => a.localeCompare(b));
         return NextResponse.json({ orderSources });
      } catch {
         return NextResponse.json(
            { error: "Failed to fetch filter options" },
            { status: 500 },
         );
      }
   }

   try {
      const params = parseCustomerListParams(searchParams);
      const result = await fetchCustomerListPage(prisma, params);
      return NextResponse.json(result);
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch customers" },
         { status: 500 },
      );
   }
}

export async function POST(request: NextRequest) {
   const gate = await requirePermission(request, ["customers", "customer", "customer_view_customer"]);
   if (gate instanceof NextResponse) return gate;

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
      const auditCtx = requestAuditContext(request);

      // P2-4: customer creation is audited in the same transaction.
      const customer = await prisma.$transaction(async (tx) => {
         const created = await tx.customer.create({
            data: {
               customId,
               name,
               email: email || null,
               phone: normalizedPhone,
               address: address || null,
            },
         });

         await logAudit(tx, {
            actor: auditActorFromContext(gate),
            action: "CREATE",
            entityType: "CUSTOMER",
            entityId: created.id,
            entityCustomId: created.customId,
            summary: `Customer ${created.customId || created.name} created — ${created.name}`,
            ...auditCtx,
         });

         return created;
      });

      return NextResponse.json(customer, { status: 201 });
   } catch {
      return NextResponse.json(
         { error: "Failed to create customer" },
         { status: 500 },
      );
   }
}
