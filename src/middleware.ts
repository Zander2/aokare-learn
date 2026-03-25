import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/courses",
]

function isPublicRoute(pathname: string): boolean {
  // Exact matches
  if (publicRoutes.includes(pathname)) return true

  // Course detail pages: /courses/[slug]
  if (/^\/courses\/[^/]+$/.test(pathname)) return true

  // Auth API routes
  if (pathname.startsWith("/api/auth")) return true

  // Public API: GET /api/courses is public (handled in the route itself)
  if (pathname.startsWith("/api/courses")) return true

  return false
}

export default auth((req) => {
  const { pathname } = req.nextUrl

  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Check if user is authenticated
  if (!req.auth?.user) {
    // API routes (except /api/auth/*) should receive a JSON 401, not an HTML redirect
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Protect /admin/* routes — admin only
  if (pathname.startsWith("/admin")) {
    if (req.auth.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|uploads/).*)",
  ],
}
