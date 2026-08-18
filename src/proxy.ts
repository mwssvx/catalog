import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);
const STUDIO_COOKIE = "catalog_studio";

function stripLocale(pathname: string) {
  if (pathname === "/ky" || pathname.startsWith("/ky/")) {
    const rest = pathname.slice(3);
    return rest ? rest : "/";
  }
  return pathname;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const path = stripLocale(pathname);

  if (path.startsWith("/studio") && path !== "/studio/login") {
    if (request.cookies.get(STUDIO_COOKIE)?.value !== "1") {
      const loginPath = pathname.startsWith("/ky")
        ? "/ky/studio/login"
        : "/studio/login";
      const login = new URL(loginPath, request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
