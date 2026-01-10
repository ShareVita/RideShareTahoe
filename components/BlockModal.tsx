'use client';

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';
import { toast } from 'react-hot-toast';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  isCurrentlyBlocked: boolean;
  onBlockStateChanged?: () => void;
}

/**
 * Modal for blocking/unblocking a user.
 * Prevents the blocked user from messaging, viewing profile, or seeing socials.
 */
export default function BlockModal({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  isCurrentlyBlocked,
  onBlockStateChanged,
}: Readonly<BlockModalProps>) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const endpoint = isCurrentlyBlocked ? '/api/users/unblock' : '/api/users/block';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_id: targetUserId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || `Failed to ${isCurrentlyBlocked ? 'unblock' : 'block'} user`
        );
      }

      toast.success(
        isCurrentlyBlocked
          ? `${targetUserName} has been unblocked`
          : `${targetUserName} has been blocked`
      );

      onBlockStateChanged?.();
      onClose();
    } catch (error) {
      console.error('Error blocking/unblocking user:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${isCurrentlyBlocked ? 'unblock' : 'block'} user`
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  // Prevent closing modal during operation
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle
                  as="h3"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  {isCurrentlyBlocked ? 'Unblock User?' : 'Block User?'}
                </DialogTitle>

                <div className="mt-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {isCurrentlyBlocked ? (
                      <>
                        You will be able to message and see {targetUserName}&apos;s profile again.
                        They will be able to message you.
                      </>
                    ) : (
                      <>
                        <strong>{targetUserName}</strong> will not be able to message you, view your
                        profile, or see your social links. You also won&apos;t see their posts or
                        profile.
                      </>
                    )}
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                      isCurrentlyBlocked
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {isLoading ? 'Processing...' : isCurrentlyBlocked ? 'Unblock' : 'Block User'}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
