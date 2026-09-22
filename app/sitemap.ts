import type { MetadataRoute } from 'next';
import config from '@/config';

/**
 * Publicly indexable routes.
 *
 * Only routes that an anonymous visitor can actually reach belong here. A
 * sitemap entry that redirects is reported as an error in Search Console and
 * is never indexed.
 *
 * Today the session gate in lib/supabase/proxy.ts redirects every path except
 * `/`, `/login` and `/auth` to `/login`, so `/` is the only entry that can be
 * listed. The marketing and content routes below are the ones worth opening to
 * anonymous visitors — uncomment each one as it is made publicly reachable:
 *
 *   /our-story, /how-to-use, /faq, /safety, /community-guidelines,
 *   /tahoe-transportation, /rides/find, /privacy-policy, /tos
 */
const PUBLIC_ROUTES = [{ path: '/', changeFrequency: 'daily' as const, priority: 1 }];

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
