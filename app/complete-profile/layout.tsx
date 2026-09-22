import React from 'react';
import { getSEOTags } from '@/libs/seo';

// Signed-in application surface: give it a distinct title, but keep it out of
// search results.
export const metadata = getSEOTags({
  title: 'Complete Your Profile | RideShareTahoe',
  description: 'Finish setting up your RideShareTahoe profile.',
  extraTags: { robots: { index: false, follow: false } },
});

export default function Layout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
