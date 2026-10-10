'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import config from '@/config';
import { withNextPath } from '@/lib/authRedirect';
import type { User } from '@supabase/supabase-js';

/**
 * Represents the resolved authentication state returned from `useProtectedRoute`.
 */
interface ProtectedRouteResult {
  /**
   * The authenticated Supabase user object, or null if not authenticated.
   */
  user: User | null;
  /**
   * True if the authentication state is still being resolved, false otherwise.
   */
  isLoading: boolean;
}

/**
 * Redirects unauthenticated visitors to the login page and exposes the auth state.
 *
 * @returns The resolved user and whether the auth state is still loading.
 */
export const useProtectedRoute = (): ProtectedRouteResult => {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const isLoading: boolean = useMemo(() => {
    // We are loading if the user context is still resolving
    if (userLoading) {
      return true;
    }
    // We are considered loading if the context is resolved but we have no user,
    // as we are waiting for the redirect to complete.
    if (!user) {
      return true;
    }
    // Auth is complete, and a user is present.
    return false;
  }, [user, userLoading]);

  useEffect(() => {
    // Only run redirection logic when userLoading is false and no user is present.
    // userLoading being false means the auth state is resolved.
    if (!userLoading && !user) {
      router.push(
        withNextPath(config.auth.loginUrl, window.location.pathname + window.location.search)
      );
    }
    // This effect handles only the side-effect (redirection) and avoids setting state.
  }, [user, userLoading, router]);

  return { user, isLoading };
};
