import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequestWithAuth } from "next-auth/middleware"

export default withAuth(
  function proxy(_req: NextRequestWithAuth) {
    // Add any additional proxy logic here
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect routes that require authentication
        const protectedPaths = ["/account", "/analytics", "/saved-searches", "/reports", "/batch-search"]
        const isProtectedPath = protectedPaths.some((path) => req.nextUrl.pathname.startsWith(path))

        if (isProtectedPath) {
          return !!token
        }

        return true
      },
    },
  },
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
