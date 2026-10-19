import { NextResponse, type NextRequest } from "next/server";
import { isAdminPublic } from "@/server/auth/admin-access";
import { ADMIN_COOKIE, verifySessionToken } from "@/server/auth/admin-session";

// Spec 003 (spec 005 lands on the overview): every admin page and admin API call needs a signed session cookie.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Spec 005 amendment B31: a public demo dashboard needs no session at all.
  const signedIn =
    isAdminPublic() || (await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_PASSWORD));

  if (pathname.startsWith("/api/admin")) {
    if (pathname === "/api/admin/sessions" || signedIn) return NextResponse.next();
    return NextResponse.json(
      { success: false, message: "Sign in to the admin area", code: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  if (pathname === "/admin/login") {
    return signedIn ? NextResponse.redirect(new URL("/admin/overview", request.url)) : NextResponse.next();
  }
  if (!signedIn) return NextResponse.redirect(new URL("/admin/login", request.url));
  if (pathname === "/admin") return NextResponse.redirect(new URL("/admin/overview", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
