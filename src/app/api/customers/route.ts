import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { generateNextEntityId } from "@src/lib/idGenerator";

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

   try {
      const [customers, total] = await Promise.all([
         prisma.customer.findMany({
            where,
            skip,
            take: limit,
            include: {
               orders: { select: { status: true } },
               _count: { select: { orders: true } },
            },
            orderBy: { createdAt: "desc" },
         }),
         prisma.customer.count({ where }),
      ]);

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
