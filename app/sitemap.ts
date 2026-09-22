import type { MetadataRoute } from 'next';
import config from '@/config';

/**
 * Publicly indexable routes.
 *
 * Only routes that an anonymous visitor can actually reach belong here. A
 * sitemap entry that redirects is reported as an error in Search Console and
 * is never indexed.
 *
 * This list must stay in sync with PUBLIC_PATHS in lib/supabase/proxy.ts. A
 * route listed here but still gated will 307 to /login, which Search Console
 * reports as an error and never indexes.
 */
const PUBLIC_ROUTES = [
  { path: '/', changeFrequency: 'daily' as const, priority: 1 },
  { path: '/rides/find', changeFrequency: 'daily' as const, priority: 0.9 },
  { path: '/tahoe-transportation', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/how-to-use', changeFrequency: 'monthly' as const, priority: 0.7 },
  { path: '/our-story', changeFrequency: 'monthly' as const, priority: 0.7 },
  { path: '/faq', changeFrequency: 'monthly' as const, priority: 0.6 },
  { path: '/safety', changeFrequency: 'monthly' as const, priority: 0.6 },
  { path: '/community-guidelines', changeFrequency: 'yearly' as const, priority: 0.4 },
  { path: '/privacy-policy', changeFrequency: 'yearly' as const, priority: 0.3 },
  { path: '/tos', changeFrequency: 'yearly' as const, priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = `https://${config.domainName}`;
  const lastModified = new Date();

  return PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
