import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "./lib/session";

// Fast signature check only. Pages and actions re-check the user, their status and area rights on the server.
const OPEN_PATHS = ["/dashboard/login", "/dashboard/invite"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/dashboard") || OPEN_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  const claims = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (claims) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/dashboard/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
