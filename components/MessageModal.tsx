'use client';

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Fragment, FormEvent, useEffect, useRef, useState } from 'react';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: { id: string; first_name: string } | null;
  ridePost: { id: string } | null;
}

/**
 * Modal that lets a user compose a message for a ride recipient.
 */
export default function MessageModal({
  isOpen,
  onClose,
  recipient,
  ridePost,
}: Readonly<MessageModalProps>) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;

    setError(null);
    setSuccessMessage(null);

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError('Please fill in all required fields');
      return;
    }

    if (!recipient) {
      setError('Recipient is required');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: recipient.id,
          ride_post_id: ridePost?.id ?? null,
          content: trimmedMessage,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to send message');
      }

      setSuccessMessage('Message sent successfully!');
      setMessage('');

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        onClose();
        timeoutRef.current = null;
      }, 2000);
    } catch (fetchError) {
      if (fetchError instanceof Error) {
        setError(fetchError.message);
      } else {
        setError('Failed to send message');
      }
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onClose();
  };

  const isSubmitDisabled = sending || !message.trim();

  if (!isOpen) {
    return null;
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleCancel}>
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
                  Send Message
                </DialogTitle>
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    To: {recipient?.first_name ?? 'Guest'}
                  </p>
                </div>

                <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                  {(error || successMessage) && (
                    <p
                      role="alert"
                      className={`text-sm font-semibold ${error ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
                    >
                      {error ?? successMessage}
                    </p>
                  )}

                  <div>
                    <label htmlFor="message" className="sr-only">
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      className="w-full rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                      placeholder="Type your message here..."
                      value={message}
                      onChange={(event) => {
                        setMessage(event.target.value);
                        if (error) {
                          setError(null);
                        }
                        if (successMessage) {
                          setSuccessMessage(null);
                        }
                      }}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      className="rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-slate-600"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                      disabled={isSubmitDisabled}
                    >
                      {sending ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
