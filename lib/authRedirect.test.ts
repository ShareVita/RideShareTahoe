import { safeNextPath, withNextPath } from './authRedirect';

it.each([
  null,
  '',
  '//evil.test',
  '/\\evil.test',
  '\\evil.test',
  'https://evil.test',
  'javascript:alert(1)',
  '/%2f%2fevil.test',
  '/%5cevil.test',
  '/%255cevil.test',
  '/login',
  '/login?next=/messages',
  '/LOGIN/',
  '/auth/callback',
  '/api/auth/callback?code=x',
  '/foo/../login',
  '/%6cogin',
  '/%256cogin',
  '/messages\r\n',
  '/messages%0a',
  '/messages\t',
  '/%',
])('rejects unsafe next %s', (next) => {
  expect(safeNextPath(next)).toBeNull();
  expect(withNextPath('/profile/edit', next)).toBe('/profile/edit');
});

it.each([
  '/messages?thread=42&view=unread',
  '/rides/post?from=South%20Lake%20Tahoe',
  '/community?url=https%3A%2F%2Fexample.test',
  '/profile/member#bio',
  '/',
])('preserves internal path and query %s', (next) => {
  expect(safeNextPath(next)).toBe(next);
  expect(
    new URL(withNextPath('/profile/edit', next), 'https://example.test').searchParams.get('next')
  ).toBe(next);
});
