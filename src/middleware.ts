import { NextRequest, NextResponse } from "next/server";
import { verifyHs256Jwt } from "./lib/jwtEdge";

export async function middleware(request: NextRequest) {
   const { pathname } = request.nextUrl;
   const token = request.cookies.get("devx_token")?.value;

   // SEC-04 (B3, audit S-2 / P1-10): verify the cookie token's HS256
   // signature + expiry at the edge (Web Crypto, src/lib/jwtEdge.ts)
   // instead of trusting cookie presence alone. Two modes:
   //  - JWT_SECRET configured (always true in production, where
   //    auth.ts refuses to run without it): the token must verify;
   //    an invalid, malformed or expired token is treated exactly
   //    like a missing cookie below.
   //  - JWT_SECRET unset (development only): auth.ts signs with an
   //    ephemeral per-process secret that this Edge runtime cannot
   //    reproduce, so verification is impossible here and the check
   //    falls back to cookie presence. API routes still verify every
   //    token against the real secret + database on each request,
   //    so this fallback weakens only the page-shell redirect, never
   //    data access.
   let isAuthenticated = Boolean(token);
   const secret = process.env.JWT_SECRET;
   if (token && secret) {
      isAuthenticated = await verifyHs256Jwt(token, secret);
   }

   const isAdminRoute = pathname.startsWith("/admin");
   const isAuthRoute = pathname.startsWith("/auth");

   // Redirect unauthenticated access from admin to login
   if (isAdminRoute && !isAuthenticated) {
      const loginUrl = new URL("/auth", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
   }

   // Redirect authenticated users away from auth page to admin dashboard
   if (isAuthRoute && isAuthenticated) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
   }

   return NextResponse.next();
}

export const config = {
   matcher: [
      /*
       * Match all request paths except for:
       * - api routes
       * - _next/static (static files)
       * - _next/image (image optimization files)
       * - favicon.ico, images, demo assets
       */
      "/admin/:path*",
      "/auth/:path*",
   ],
};
