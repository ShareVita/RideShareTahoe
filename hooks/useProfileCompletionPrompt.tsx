'use client';

import { JSX, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';

interface UseProfileCompletionPromptOptions {
  toastMessage?: string;
  closeRedirect?: string | null;
}

interface UseProfileCompletionPromptResult {
  isPromptOpen: boolean;
  showProfileCompletionPrompt: () => void;
  hideProfileCompletionPrompt: () => void;
  profileCompletionModal: JSX.Element;
}

/**
 * Provides a modal prompt that encourages users to finish their profile.
 */
export function useProfileCompletionPrompt(
  options: UseProfileCompletionPromptOptions = {}
): UseProfileCompletionPromptResult {
  const {
    toastMessage = 'Please finish your profile before accessing protected areas.',
    closeRedirect = '/',
  } = options;
  const router = useRouter();
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  const showProfileCompletionPrompt = useCallback(() => {
    setIsPromptOpen(true);
  }, []);

  const hideProfileCompletionPrompt = useCallback(() => {
    setIsPromptOpen(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsPromptOpen(false);
    if (closeRedirect) {
      router.push(closeRedirect);
    }
  }, [closeRedirect, router]);

  const handleCompleteProfile = useCallback(() => {
    setIsPromptOpen(false);
    if (toastMessage) {
      toast(toastMessage);
    }
    router.push('/complete-profile');
  }, [router, toastMessage]);

  const profileCompletionModal = useMemo(
    () => (
      <ProfileCompletionModal
        isOpen={isPromptOpen}
        onClose={handleClose}
        onCompleteProfile={handleCompleteProfile}
      />
    ),
    [handleClose, handleCompleteProfile, isPromptOpen]
  );

  return {
    isPromptOpen,
    showProfileCompletionPrompt,
    hideProfileCompletionPrompt,
    profileCompletionModal,
  };
}
