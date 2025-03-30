import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Helper function to create a Supabase client for API routes
 */
function createApiClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          return request.cookies.getAll();
        },
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            request.cookies.set({
              name,
              value,
              ...options,
            });
          });
        },
      },
    }
  );
}

/**
 * Helper function to handle API errors
 */
function handleApiError(error: any, context: string, request: NextRequest) {
  console.error(`Error in ${context}:`, error);
  
  // Log additional context
  const requestHeaders = {
    'x-user-id': request.headers.get('x-user-id'),
    'x-user-email': request.headers.get('x-user-email'),
    'x-forwarded-for': request.headers.get('x-forwarded-for'),
  };
  console.log('Request headers:', requestHeaders);

  // Handle specific error types
  if (error.code === '42501') {
    return NextResponse.json(
      { error: 'Permission denied. Check your RLS policies.' },
      { status: 403 }
    );
  }

  if (error.message?.includes('JWT')) {
    return NextResponse.json(
      { error: 'Invalid or expired authentication token' },
      { status: 401 }
    );
  }

  return NextResponse.json(
    { error: `Failed to ${context}: ${error.message || 'Unknown error'}` },
    { status: 500 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const { transcript, title, userId, language } = await request.json();
    
    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create Supabase client for route handlers (API routes)
    const supabase = createApiClient(request);

    // Get the authenticated user from the session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      return handleApiError(userError, 'authenticate user', request);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to save transcripts' },
        { status: 401 }
      );
    }

    // Verify the user ID matches the authenticated user
    if (user.id !== userId) {
      console.error(`User ID mismatch. Session user: ${user.id}, Request user: ${userId}`);
      return NextResponse.json(
        { error: 'User ID mismatch. You can only create transcripts for your own account.' },
        { status: 403 }
      );
    }

    // Create transcript record
    const { data: transcriptData, error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        title: title || 'New Transcript',
        user_id: userId,
        language: language || 'en-US'
      })
      .select('id')
      .single();
    
    if (transcriptError) {
      return handleApiError(transcriptError, 'create transcript', request);
    }

    // Save transcript content
    const transcriptId = transcriptData.id;
    const { error: contentError } = await supabase
      .from('transcript_contents')
      .insert({
        transcript_id: transcriptId,
        content: transcript
      });
    
    if (contentError) {
      // Try to clean up the transcript record
      await supabase.from('transcripts').delete().eq('id', transcriptId);
      return handleApiError(contentError, 'save transcript content', request);
    }

    return NextResponse.json({
      success: true,
      message: 'Transcript saved successfully',
      transcriptId
    });
  } catch (error) {
    return handleApiError(error, 'process request', request);
  }
} 