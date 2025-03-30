import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Optional rate limiting
let ratelimit: any = null;

// Only initialize ratelimit if environment variables are available
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Ratelimit } = require('@upstash/ratelimit');
    const { Redis } = require('@upstash/redis');
    
    // Create a new ratelimiter that allows 10 requests per 10 seconds
    ratelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
    });
  }
} catch (error) {
  // Silently fail and continue without rate limiting
}

/**
 * Middleware to handle authentication state and protected routes
 */
export async function middleware(request: NextRequest) {
  // Rate limiting (only if configured)
  if (ratelimit) {
    try {
      const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
      const { success, limit, reset, remaining } = await ratelimit.limit(
        `ratelimit_${ip}`
      );
  
      if (!success) {
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        });
      }
    } catch (error) {
      // Continue without rate limiting if it fails
    }
  }

  // Update session with refresh token handling
  const response = await updateSession(request);
  
  // Create a Supabase client to get the user
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          return request.cookies.getAll();
        },
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          });
        },
      },
    }
  );
  
  // Get the user - better than using session in middleware
  const { data: { user } } = await supabase.auth.getUser();

  // Check if accessing protected routes
  const isAccessingProtectedRoutes = 
    request.nextUrl.pathname.startsWith('/dashboard') || 
    request.nextUrl.pathname.startsWith('/profile') ||
    (request.nextUrl.pathname.startsWith('/transcripts') && 
     !request.nextUrl.pathname.startsWith('/transcripts/public'));

  // Check if accessing auth routes
  const isAccessingAuthRoutes = 
    request.nextUrl.pathname.startsWith('/login') || 
    request.nextUrl.pathname.startsWith('/register');

  // If accessing the home page and user is authenticated, redirect to dashboard
  if (request.nextUrl.pathname === '/' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If accessing protected routes without user, redirect to login
  if (isAccessingProtectedRoutes && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If accessing auth routes with user, redirect to dashboard
  if (isAccessingAuthRoutes && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Add user info to headers for downstream use
  if (user) {
    response.headers.set('x-user-id', user.id);
    response.headers.set('x-user-email', user.email || '');
  }
  
  return response;
}

/**
 * Configure which routes middleware will run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
    // Include paths that should be protected or have auth redirection
    '/dashboard/:path*',
    '/profile/:path*',
    '/login',
    '/register',
    '/transcripts/:path*',
    '/',
  ],
}; 