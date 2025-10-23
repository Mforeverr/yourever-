import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/joinwaitlist',
  '/demo',
  '/welcome',
]

// API routes that are public
const publicApiRoutes = [
  '/api/auth',
  '/api/health',
  '/api/docs',
]

// Auth routes that should redirect to workspace if already authenticated
const authRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
]

function isPublicRoute(pathname: string): boolean {
  // Check static public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return true
  }

  // Check public API routes
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return true
  }

  // Check for static assets
  if (pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/api/auth') ||
      pathname.includes('.')) {
    return true
  }

  return false
}

function isAuthRoute(pathname: string): boolean {
  return authRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
}

async function createAuthMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.nextUrl.origin

  try {
    // Get session from the request
    const session = await auth.api.getSession({
      headers: Object.fromEntries(request.headers.entries()),
    })

    const isAuthenticated = !!session?.user

    // If route is public, allow access
    if (isPublicRoute(pathname)) {
      // If authenticated user tries to access auth routes, redirect to workspace
      if (isAuthenticated && isAuthRoute(pathname)) {
        const url = new URL('/workspace-hub', origin)
        return NextResponse.redirect(url)
      }
      return NextResponse.next()
    }

    // For protected routes, check authentication
    if (!isAuthenticated) {
      // Store the attempted URL for redirect after login
      const loginUrl = new URL('/login', origin)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Handle short URL redirects
    const shortUrlPattern = /^\/([ptc])\/([^\/]+)$/
    const shortMatch = pathname.match(shortUrlPattern)

    if (shortMatch && isAuthenticated) {
      const [, type, id] = shortMatch
      const redirectUrl = new URL(`/api/shortlinks/resolve/${type}/${id}`, origin)
      return NextResponse.redirect(redirectUrl)
    }

    // For authenticated users accessing protected routes, allow access
    return NextResponse.next()

  } catch (error) {
    console.error('Middleware auth error:', error)

    // If we can't verify auth status and route is not public, redirect to login
    if (!isPublicRoute(pathname)) {
      const loginUrl = new URL('/login', origin)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  }
}

export default createAuthMiddleware

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}