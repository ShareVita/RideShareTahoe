'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import config from '@/config';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * Renders the signin experience for Supabase auth with Google or magic links.
 */
function LoginContent() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.push('/community');
      }
    };

    checkSession();
  }, [router, supabase.auth]);

  // Handle error messages from OAuth callback
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      let errorMessage: string;

      switch (error) {
        case 'session_exchange_failed':
          errorMessage = 'Failed to establish session. Please try signing in again.';
          break;
        case 'no_session':
          errorMessage = 'Session not created. Please try signing in again.';
          break;
        case 'unexpected_error':
          errorMessage = 'An unexpected error occurred. Please try again.';
          break;
        default:
          errorMessage = `Sign-in error: ${error}`;
      }

      toast.error(errorMessage);
    }
  }, [searchParams]);

  const handleSignup = async (
    e: React.FormEvent | React.MouseEvent,
    options: { type: string; provider?: string }
  ) => {
    e?.preventDefault();

    setIsLoading(true);

    try {
      const { type, provider } = options;
      const redirectURL = globalThis.location.origin + '/api/auth/callback';

      if (type === 'oauth' && provider) {
        // Use Supabase's built-in OAuth but with custom branding
        const { error } = await supabase.auth.signInWithOAuth({
          provider: provider as 'google',
          options: {
            redirectTo: redirectURL,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
              scope: 'openid profile email',
            },
          },
        });

        if (error) {
          console.error('OAuth sign-in error:', error);
          toast.error('Failed to sign in with Google. Please try again.');
        }
      } else if (type === 'magic_link') {
        console.log('Magic link redirect URL:', redirectURL);
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectURL,
          },
        });

        if (error) {
          console.error('Magic link error:', error);
          toast.error('Failed to send magic link. Please try again.');
        } else {
          toast.success('Check your emails!');
          setIsDisabled(true);
        }
      }
    } catch (error) {
      console.error('Unexpected sign-in error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/20 dark:bg-cyan-500 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-500/20 dark:bg-emerald-500/70 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16 text-slate-900 dark:text-white sm:px-8">
        <div className="space-y-3 text-center lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300/80">
            Shared rides
          </p>
          <h1 className="text-3xl font-black leading-tight text-slate-900 dark:text-white sm:text-4xl">
            Sign in to {config.appName} and plan your next Tahoe trip in minutes.
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 sm:text-lg">
            Securely access the RideShare Tahoe community dashboard, keep track of upcoming rides,
            and sync with your travel buddies in real time.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-8 shadow-xl dark:shadow-[0_20px_120px_rgba(15,23,42,0.7)] backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-widest text-slate-500 dark:text-slate-300">
                  Secure access
                </p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Authenticate with confidence
                </h2>
              </div>
              <span className="text-sm text-emerald-600 dark:text-emerald-300">SaaS-grade</span>
            </div>

            <div className="mt-8 space-y-5">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 dark:border-white/20 bg-white dark:bg-white/90 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-300 dark:hover:border-white/40 hover:shadow-lg"
                onClick={(e) => handleSignup(e, { type: 'oauth', provider: 'google' })}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
                    <path
                      fill="#FFC107"
                      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                    />
                    <path
                      fill="#FF3D00"
                      d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                    />
                  </svg>
                )}
                Continue with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-[0.4em] text-slate-400">
                  or
                </div>
              </div>

              <form className="space-y-3" onSubmit={(e) => handleSignup(e, { type: 'magic_link' })}>
                <label
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                  htmlFor="email-input"
                >
                  Email
                </label>
                <input
                  id="email-input"
                  required
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  className="flex w-full items-center justify-center rounded-2xl bg-linear-to-r from-emerald-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:translate-y-0.5 hover:opacity-90 disabled:opacity-60"
                  disabled={isLoading || isDisabled}
                  type="submit"
                >
                  {isLoading && <span className="loading loading-spinner loading-xs" />}
                  Send Magic Link
                </button>
                {isDisabled && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-300">
                    Magic link sent! Check your inbox.
                  </p>
                )}
              </form>
            </div>

            <Link
              href="/"
              className="mt-6 inline-flex items-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 transition hover:text-slate-900 dark:hover:text-white"
            >
              ← Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * The default export for the Login page.
 * Wraps the LoginContent in a Suspense boundary to handle useSearchParams.
 */
export default function Login() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <span className="loading loading-spinner loading-lg text-cyan-500"></span>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
