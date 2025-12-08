import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import {
  createClient as createSupabaseClient,
  SupabaseClient,
  User,
  AuthError,
} from '@supabase/supabase-js';

/**
 * Creates a standardized 401 Unauthorized response.
 * Logs the error server-side if provided.
 */
export function createUnauthorizedResponse(error?: unknown) {
  if (error) {
    console.error('Authentication check failed:', error);
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Helper to get authenticated user, falling back to Bearer token if needed.
 * Returns the user, auth error, and a supabase client configured with the user's session/token.
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ user: User | null; authError: AuthError | null; supabase: SupabaseClient }> {
  // First, try to use the cookie-based client
  const supabaseCookieClient = await createClient();
  let supabase = supabaseCookieClient;

  let {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Fallback to Bearer token if no session from cookies
  if ((authError || !user) && request.headers.get('Authorization')) {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (token) {
      // Create a new client with the token to ensure RLS works
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );

      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) {
        user = data.user;
        authError = null;
      } else {
        authError = error;
      }
    }
  }

  return { user, authError, supabase };
}
