import React from 'react';
import Script from 'next/script';
import AppLayout from '@/components/AppLayout';
import ClientLayout from '@/components/LayoutClient';
import { SupabaseUserProvider } from '@/components/providers/SupabaseUserProvider';
import { QueryProvider } from '@/contexts/QueryProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { createClient } from '@/lib/supabase/server';
import { getSEOTags } from '@/libs/seo';
import './globals.css';

export const metadata = getSEOTags();

/**
 * The root layout of the application.
 * Sets up global providers:
 * - QueryProvider for React Query
 * - SupabaseUserProvider for auth state
 * - ThemeProvider for dark/light mode
 * - ClientLayout and AppLayout for structural wrappers
 */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();

  const [
    {
      data: { session },
    },
    {
      data: { user },
    },
  ] = await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]);

  // Prefer the authoritative user from getUser() when a session exists
  const initialSession = session && user ? { ...session, user } : session;

  if (initialSession) {
    console.debug(`[Root Layout] Server found a session. User: ${initialSession.user.id}`);
  } else {
    console.warn('[Root Layout] Server found NO session. Passing null to provider.');
  }

  return (
    /**
     * The `suppressHydrationWarning` prop is set because the ThemeProvider
     * modifies the `class` attribute on the `<html>` element during client-side hydration,
     * which can cause a mismatch between the server-rendered and client-rendered markup.
     * Suppressing the hydration warning here prevents unnecessary console noise.
     */
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-TGM53SZZX1"
          strategy="beforeInteractive"
        />
        <Script id="google-analytics" strategy="beforeInteractive">
          {`
						globalThis.dataLayer = globalThis.dataLayer || [];
						function gtag(){dataLayer.push(arguments);}
						gtag('js', new Date());
						gtag('config', 'G-TGM53SZZX1');
					`}
        </Script>

        <QueryProvider>
          <SupabaseUserProvider initialSession={initialSession}>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
              <ClientLayout>
                <AppLayout>{children}</AppLayout>
              </ClientLayout>
            </ThemeProvider>
          </SupabaseUserProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
