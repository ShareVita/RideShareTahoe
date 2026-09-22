import config from '@/config';
import { getSEOTags } from '@/libs/seo';
import React from 'react';

export const metadata = getSEOTags({
  title: `Sign-in to ${config.appName}`,
  canonicalUrlRelative: '/login',
  extraTags: { robots: { index: false, follow: false } },
});

export default function Layout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
