import type { MetadataRoute } from 'next';
import config from '@/config';

/**
 * robots.txt, served by Next itself.
 *
 * This replaces the `next-sitemap` postbuild step. That step never ran under
 * the Cloudflare build, so the deployed /robots.txt was the app shell, and
 * when it did run its default `siteUrl` was still the boilerplate's domain
 * (shipfa.st).
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = `https://${config.domainName}`;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Signed-in application surfaces: nothing here is useful in search
        // results and some of it is per-user.
        disallow: [
          '/api/',
          '/admin',
          '/auth',
          '/messages',
          '/profile',
          '/complete-profile',
          '/onboarding',
          '/vehicles',
          '/login',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
