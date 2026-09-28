import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionValid } from "./lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/dashboard") || pathname.startsWith("/dashboard/login")) {
    return NextResponse.next();
  }
  const ok = await sessionValid(request.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/dashboard/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
