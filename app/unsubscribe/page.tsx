'use client';

import { useState } from 'react';

export default function UnsubscribePage() {
  const [status, setStatus] = useState<'ready' | 'saving' | 'done' | 'error'>('ready');
  const unsubscribe = async () => {
    setStatus('saving');
    try {
      const token = new URLSearchParams(window.location.search).get('token') || '';
      const response = await fetch(`/api/email/unsubscribe?token=${encodeURIComponent(token)}`, {
        method: 'POST',
      });
      setStatus(response.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  };
  return (
    <section className="mx-auto max-w-lg px-6 py-16" aria-label="Email preferences">
      <h1 className="text-2xl font-bold mb-4">Email preferences</h1>
      <p className="mb-6">
        Stop receiving RideShareTahoe community updates and promotional emails. You’ll still receive
        account, trip and message notifications.
      </p>
      {status === 'done' ? (
        <p role="status">You’ve unsubscribed from promotional emails.</p>
      ) : (
        <>
          {status === 'error' && (
            <p role="alert" className="mb-4 text-red-600">
              This link could not be saved. Check your email link and try again, or contact support.
            </p>
          )}
          <button
            onClick={unsubscribe}
            disabled={status === 'saving'}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
          >
            {status === 'saving' ? 'Saving…' : 'Unsubscribe from promotional emails'}
          </button>
        </>
      )}
    </section>
  );
}
