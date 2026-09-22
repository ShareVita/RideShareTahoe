import React from 'react';
import { getSEOTags } from '@/libs/seo';

// Signed-in application surface: give it a distinct title, but keep it out of
// search results.
export const metadata = getSEOTags({
  title: 'Post a Ride | RideShareTahoe',
  description: 'Offer seats in your car to or from Lake Tahoe.',
  extraTags: { robots: { index: false, follow: false } },
});

export default function Layout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
