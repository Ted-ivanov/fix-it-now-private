import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    // Optimistic check only: every admin page and action verifies the session again on the server.
    if (pathname !== "/admin/login" && !getSessionCookie(request)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  return intl(request);
}

export const config = {
  // Skip API routes, Next internals and files with an extension (images, favicon, robots.txt…).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
