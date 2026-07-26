import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Non-admins get bounced out of /admin back to their own dashboard.
    // (The JWT already carries isAdmin — see the jwt callback in lib/auth.js —
    // so this is a cheap check with no extra DB round trip.)
    if (pathname.startsWith("/admin") && !token?.isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Just confirms a session exists; the role check above handles /admin.
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};