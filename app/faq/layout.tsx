import React from 'react';
import { getSEOTags } from '@/libs/seo';

// The page itself is a client component, so its metadata lives here in the
// route's layout.
export const metadata = getSEOTags({
  title: 'RideShareTahoe FAQ: How Tahoe Carpooling Works',
  description:
    'Answers about posting and finding a carpool to Tahoe, splitting gas, and how RideShareTahoe keeps rides reliable.',
  keywords: ['Tahoe carpool FAQ', 'rideshare Tahoe questions'],
  canonicalUrlRelative: '/faq',
});

export default function Layout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
