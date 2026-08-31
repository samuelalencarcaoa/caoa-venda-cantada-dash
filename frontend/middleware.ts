import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { buildLoginRedirectHref } from "@/lib/auth-routing";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname === "/access-denied" ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(
      new URL(
        buildLoginRedirectHref(`${req.nextUrl.pathname}${req.nextUrl.search}`),
        req.url,
      ),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/relatorios/:path*",
    "/sales-intention/:path*",
    "/configuracoes/:path*",
    // Note: /test-relatorios is intentionally public for testing
  ],
};
