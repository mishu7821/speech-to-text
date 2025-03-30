import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Update the session by refreshing the auth token and setting cookies
 * 
 * @param request NextRequest object
 * @returns NextResponse with updated cookies
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Create a response object that we'll modify and then return
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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

  // This will refresh the session if it's expired
  await supabase.auth.getUser();

  return response;
} 