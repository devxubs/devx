import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@src/lib/auth";
import { getAllProviderStatuses } from "@src/lib/courier/config";

// Courier provider configuration status (Phase 4, D4).
//
// Administrator-only, read-only. Returns per-provider booleans and
// the NAMES of any missing environment variables — secret VALUES
// are never read into this response (lib/courier/config exposes
// them only to server-side provider calls). This is what the
// Settings → System "Courier Providers" card renders; it makes
// "configured vs not configured" visible without a settings
// database, a secrets UI, or any client exposure.

export async function GET(request: NextRequest) {
   const gate = await requireAdmin(request);
   if (gate instanceof NextResponse) return gate;

   return NextResponse.json({
      providers: getAllProviderStatuses(),
      liveBookingEnabled: false,
      note: "Live courier booking stays disabled until merchant credentials are set and the provider contracts are verified (Phase 4, D4/D5).",
   });
}
