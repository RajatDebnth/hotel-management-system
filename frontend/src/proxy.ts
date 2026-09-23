import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedPath = ["/account", "/admin", "/book"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!protectedPath || request.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
