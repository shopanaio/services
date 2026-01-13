import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware that captures the current pathname and stores it in request headers.
 * This allows server components (like layout.tsx) to access the pathname
 * for rendering registered domain layouts.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  // Store pathname for layout.tsx to use when resolving domain layouts
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes
     * - public files with extensions
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api|.*\\.[\\w]+$).*)",
  ],
};
