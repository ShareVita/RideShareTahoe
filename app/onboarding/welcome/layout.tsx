import React from 'react';
import { getSEOTags } from '@/libs/seo';

// Signed-in application surface: give it a distinct title, but keep it out of
// search results.
export const metadata = getSEOTags({
  title: 'Welcome | RideShareTahoe',
  description: 'Get your RideShareTahoe profile set up.',
  extraTags: { robots: { index: false, follow: false } },
});

export default function Layout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
