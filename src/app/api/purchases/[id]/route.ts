import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function GET(
   _request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const { id } = await params;
   try {
      const purchase = await prisma.purchase.findFirst({
         where: {
            OR: [{ id }, { customId: id }, { invoice: id }],
         },
         include: {
            supplier: true,
            createdBy: { select: { id: true, name: true, email: true } },
            items: { include: { product: true } },
            attachments: true,
         },
      });

      if (!purchase || purchase.isDeleted) {
         return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
      }

      return NextResponse.json(purchase);
   } catch {
      return NextResponse.json({ error: "Failed to fetch purchase" }, { status: 500 });
   }
}

export async function PUT(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { id } = await params;

   try {
      const body = await request.json();
      const updated = await prisma.purchase.update({
         where: { id },
         data: {
            invoice: body.invoice !== undefined ? String(body.invoice).trim() : undefined,
            supplierId: body.supplierId !== undefined ? body.supplierId : undefined,
            paid: body.paid !== undefined ? parseFloat(body.paid) : undefined,
            due: body.due !== undefined ? parseFloat(body.due) : undefined,
            note: body.note !== undefined ? body.note : undefined,
         },
      });

      return NextResponse.json(updated);
   } catch {
      return NextResponse.json({ error: "Failed to update purchase" }, { status: 500 });
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> },
) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const { id } = await params;

   try {
      const purchase = await prisma.purchase.update({
         where: { id },
         data: { isDeleted: true },
      });

      return NextResponse.json({ message: "Purchase moved to bin", purchase });
   } catch {
      return NextResponse.json({ error: "Failed to delete purchase" }, { status: 500 });
   }
}
