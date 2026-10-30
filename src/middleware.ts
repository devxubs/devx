import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
   const { pathname } = request.nextUrl;
   const token = request.cookies.get("devx_token")?.value;
   const isAuthenticated = Boolean(token);

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
