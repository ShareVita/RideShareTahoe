/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import path from 'node:path';

// Execute the actual beforeInteractive script rather than a copy of its logic.
const source = readFileSync(path.join(process.cwd(), 'app/layout.tsx'), 'utf8');
const script = source.match(/<Script id="google-analytics"[^>]*>\s*\{`([\s\S]*?)`\}/)![1];

function run(pathname: string) {
  const appendChild = jest.fn();
  const context = {
    location: {
      origin: 'https://ridesharetahoe.com',
      pathname,
      search: '?token=private',
      hash: '#private',
    },
    document: { createElement: jest.fn(() => ({})), head: { appendChild } },
    dataLayer: [] as unknown[][],
  };
  runInNewContext(script, context);
  return { context, appendChild };
}

it.each(['/unsubscribe', '/unsubscribe/'])(
  'never initializes or loads Google analytics on %s',
  (pathname) => {
    const { context, appendChild } = run(pathname);
    expect(context.dataLayer).toEqual([]);
    expect(context.document.createElement).not.toHaveBeenCalled();
    expect(appendChild).not.toHaveBeenCalled();
  }
);

it('preserves marketing analytics but never configures a query-bearing page location', () => {
  const { context, appendChild } = run('/rides/find');
  const configs = context.dataLayer.filter((entry) => entry[0] === 'config');
  expect(configs).toHaveLength(2);
  expect(configs[0][2]).toEqual({ page_location: 'https://ridesharetahoe.com/rides/find' });
  expect(configs[1][2]).toEqual({ page_location: 'https://ridesharetahoe.com/rides/find' });
  expect(appendChild).toHaveBeenCalledTimes(1);
});
