import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@src/lib/auth";
import {
   peekNextEntityId,
   type EntityType,
} from "@src/lib/idGenerator";

const ENTITY_TYPES: readonly string[] = [
   "USER",
   "CUSTOMER",
   "SUPPLIER",
   "ORDER",
   "PURCHASE",
   "PRODUCT",
   "CATEGORY",
   "UNIT",
   "EXPENSE",
   "ASSET",
   "ROLE",
   "BILLING",
   "WAREHOUSE",
   "SUPPLIER_PAYMENT",
   "PURCHASE_RETURN",
];

/**
 * OBS-B1: the create forms preview the ID a new record will carry.
 * The preview must come from the same EntitySequence the create
 * endpoints consume — the previous client-side guess (latest row's
 * ID + 1) disagreed with the server assignment whenever rows were
 * seeded or deleted. Read-only: peeking never consumes a number.
 */
export async function GET(request: NextRequest) {
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   const type = request.nextUrl.searchParams.get("type") || "";
   if (!ENTITY_TYPES.includes(type)) {
      return NextResponse.json(
         { error: "Unknown entity type" },
         { status: 400 },
      );
   }

   try {
      const next = await peekNextEntityId(type as EntityType);
      return NextResponse.json({
         type,
         nextId: next.customId,
         seq: next.seq,
         prefix: next.prefix,
      });
   } catch {
      return NextResponse.json(
         { error: "Failed to peek the next ID" },
         { status: 500 },
      );
   }
}
