import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
         id: true,
         name: true,
         email: true,
         phoneNumber: true,
         address: true,
         image: true,
         status: true,
         role: { select: { id: true, name: true, permissions: true } },
      },
   });

   if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
   }

   // Phase 1 (S-2): a suspended/inactive account's unexpired token must
   // not keep a working session — /me is the client's session probe.
   if (user.status !== "ACTIVE") {
      return NextResponse.json(
         { error: "Account is not active" },
         { status: 403 },
      );
   }

   return NextResponse.json({
      user: {
         ...user,
         // AUTH-UI-01 fix: never present a role-less account as an
         // administrator. Fall back to the neutral "Staff" label used
         // by the users API.
         role: user.role?.name || "Staff",
         roleDetails: user.role,
      },
   });
}
