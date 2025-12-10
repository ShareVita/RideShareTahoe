'use client';

import { usePathname } from 'next/navigation';
import React, { useEffect, useRef } from 'react';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import { useProfileCompletionPrompt } from '@/hooks/useProfileCompletionPrompt';
import { useUserProfile } from '@/hooks/useProfile';

const PUBLIC_PATHS = new Set(['/login', '/signup', '/auth/callback', '/']);
const PUBLIC_PATH_PREFIXES = ['/community'];
const PROFILE_SETUP_PATHS = new Set(['/complete-profile', '/profile/edit']);

export default function ProfileGuard({ children }: { readonly children: React.ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const pathname = usePathname();
  const {
    isPromptOpen,
    profileCompletionModal,
    showProfileCompletionPrompt,
    hideProfileCompletionPrompt,
  } = useProfileCompletionPrompt({ closeRedirect: '/' });

  const showPromptRef = useRef(showProfileCompletionPrompt);
  useEffect(() => {
    showPromptRef.current = showProfileCompletionPrompt;
  }, [showProfileCompletionPrompt]);

  const hidePromptRef = useRef(hideProfileCompletionPrompt);
  useEffect(() => {
    hidePromptRef.current = hideProfileCompletionPrompt;
  }, [hideProfileCompletionPrompt]);

  useEffect(() => {
    // Wait for all loading to finish
    if (authLoading || profileLoading) {
      return;
    }

    // If not logged in, we don't need to check profile (AppLayout/Middleware handles auth protection)
    if (!user) {
      return;
    }

    // Check if current path is public or part of the setup flow
    const isPublicPath = PUBLIC_PATHS.has(pathname);
    const hasPublicPrefix = PUBLIC_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    const isSetupPath = PROFILE_SETUP_PATHS.has(pathname);
    const isProtectedPath = !isPublicPath && !hasPublicPrefix && !isSetupPath;

    if (!isProtectedPath) {
      hidePromptRef.current?.();
      return;
    }

    if (profile?.first_name) {
      hidePromptRef.current?.();
      return;
    }

    showPromptRef.current?.();
  }, [user, profile, authLoading, profileLoading, pathname]);

  // We render children while checking to avoid flash of white content
  // The useEffect will handle the redirect if needed
  if (isPromptOpen) {
    return profileCompletionModal;
  }

  return <>{children}</>;
}
