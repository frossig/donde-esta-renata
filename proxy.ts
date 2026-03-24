import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getRole } from './lib/auth'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Add any public routes here that don't need authentication (e.g. webhooks, health checks)
  if (pathname === '/login' || pathname === '/api/login' || pathname === '/api/logout') {
    return NextResponse.next()
  }

  const role = getRole(request)

  if (!role) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
