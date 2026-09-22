import { isPublicPath } from '@/lib/supabase/proxy';
import sitemap from './sitemap';

// A sitemap entry that redirects to /login is reported as an error in Search
// Console and never gets indexed. The sitemap and the session gate's allowlist
// are two separate lists, so this locks them together: adding a route to one
// without the other fails here rather than silently failing in Google.
describe('sitemap', () => {
  it('only lists routes an anonymous visitor can actually reach', () => {
    for (const entry of sitemap()) {
      const path = new URL(entry.url).pathname;
      expect([path, isPublicPath(path)]).toEqual([path, true]);
    }
  });

  it('lists every public content route', () => {
    const listed = new Set(sitemap().map((e) => new URL(e.url).pathname));
    for (const path of [
      '/',
      '/our-story',
      '/faq',
      '/safety',
      '/community-guidelines',
      '/how-to-use',
      '/tahoe-transportation',
      '/rides/find',
      '/privacy-policy',
      '/tos',
    ]) {
      expect([path, listed.has(path)]).toEqual([path, true]);
    }
  });
});
