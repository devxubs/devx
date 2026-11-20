import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";
import { parsePagination } from "@src/lib/pagination";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
} from "@src/lib/audit";

export async function GET(request: NextRequest) {
   // R-1 fix (Final Review): the staff list exposes every employee's
   // email, phone, salary and status, so a bare login is not enough —
   // require the same `users` permission family as user management
   // (POST below, users/[id]). Roles without it receive 403;
   // unauthenticated requests still receive 401 from the guard.
   const gate = await requirePermission(request, [
      "users",
      "user",
      "user_view",
      "user_view_user",
   ]);
   if (gate instanceof NextResponse) return gate;

   const { searchParams } = new URL(request.url);
   const search = searchParams.get("search")?.trim() || "";
   const role = searchParams.get("role")?.trim() || "";
   const status = searchParams.get("status")?.trim() || "";

   const where: any = {};

   if (search) {
      where.OR = [
         { name: { contains: search } },
         { email: { contains: search } },
         { phoneNumber: { contains: search } },
         { customId: { contains: search } },
      ];
   }

   if (role && role !== "All") {
      where.role = { name: role };
   }

   if (status && status !== "All") {
      where.status = status.toUpperCase();
   }

   try {
      // P4-2: the list is paginated by default — the shared
      // parsePagination bounds (default 20, max 100) always apply
      // and the response is { users, total, page, limit }. The
      // previous bare-array response loaded the whole staff table
      // unbounded. Consumers that render the full set (the User
      // page, the employee/actor option lists) walk the bounded
      // pages via lib/fetchAllPages and see the same rows.
      const { page, limit, skip } = parsePagination(searchParams, 20);
      const [users, total] = await Promise.all([
         prisma.user.findMany({
            where,
            include: { role: true },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
         }),
         prisma.user.count({ where }),
      ]);

      // Strip sensitive passwordHash and flatten role to string
      const safeUsers = users.map(({ passwordHash, role, ...rest }) => ({
         ...rest,
         role: role?.name || "Staff",
         roleDetails: role,
      }));

      return NextResponse.json({ users: safeUsers, total, page, limit });
   } catch {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   // SEC-01 fix: creating accounts (incl. assigning roles) is an
   // administrator / user-management operation, not something any
   // signed-in account may do.
   const gate = await requirePermission(request, [
      "users",
      "user",
      "user_create",
   ]);
   if (gate instanceof NextResponse) return gate;

   try {
      const body = await request.json();
      const { name, email, password, phoneNumber, address, salary, roleId, status, image } = body;

      if (!email) {
         return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }

      // P4-13: the same minimum password length the register route
      // enforces (6) — user creation previously accepted any
      // password, including a 1-character one.
      if (password !== undefined && password !== null && password !== "" && String(password).length < 6) {
         return NextResponse.json(
            { error: "Password must be at least 6 characters" },
            { status: 400 },
         );
      }

      // P4-13: normalise (trim + lowercase) BEFORE the duplicate
      // check and storage — the check previously used the raw
      // input while storage normalised, so "A@x.com" after
      // "a@x.com" slipped past the check and died on the unique
      // index as a 500 instead of the intended 409.
      const normalizedEmail = String(email).trim().toLowerCase();
      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingUser) {
         return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }

      const passwordHash = password ? await hashPassword(password) : undefined;
      const { customId } = await generateNextEntityId("USER");
      const auditCtx = requestAuditContext(request);

      // P2-4: user CREATE joins the audited mutations (PUT
      // privileged ops and LOGIN were already logged) — creation and
      // audit row share one transaction, the expense-create pattern.
      const newUser = await prisma.$transaction(async (tx) => {
         const created = await tx.user.create({
            data: {
               customId,
               name: name || undefined,
               email: normalizedEmail,
               phoneNumber: phoneNumber || undefined,
               address: address || undefined,
               salary: salary || undefined,
               passwordHash,
               roleId: roleId || undefined,
               status: status ? (status.toUpperCase() as any) : "ACTIVE",
               image: image || undefined,
            },
            include: { role: true },
         });

         await logAudit(tx, {
            actor: auditActorFromContext(gate),
            action: "CREATE",
            entityType: "USER",
            entityId: created.id,
            entityCustomId: created.customId,
            summary: `User ${created.name || created.email} created`,
            ...auditCtx,
         });

         return created;
      });

      const { passwordHash: _, role: roleRel, ...rest } = newUser;
      const safeUser = {
         ...rest,
         role: roleRel?.name || "Staff",
         roleDetails: roleRel,
      };
      return NextResponse.json(safeUser, { status: 201 });
   } catch (error: any) {
      // P4-13: a race past the duplicate check hits the unique
      // index — that is a 409, not a 500.
      if (error?.code === "P2002") {
         return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
   }
}
