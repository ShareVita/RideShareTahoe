import type { NextRequest } from 'next/server';
import { GET as scheduled } from './process-scheduled-emails/route';
import { GET as reengage } from './process-reengage-emails/route';
import { processScheduledEmails, processReengageEmails } from '@/libs/email';

jest.mock('@/libs/email', () => ({
  processScheduledEmails: jest.fn(),
  processReengageEmails: jest.fn(),
}));

describe.each([
  [scheduled, processScheduledEmails, 'SCHEDULED_EMAILS_ENABLED'],
  [reengage, processReengageEmails, 'REENGAGEMENT_EMAILS_ENABLED'],
] as const)('%s scheduler boundary', (handler, processor, flag) => {
  const original = { ...process.env };
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CRON_SECRET_TOKEN;
    process.env.CRON_SECRET = 'local-test-secret';
    delete process.env[flag];
    (processor as jest.Mock).mockResolvedValue({ processed: 0, errors: [] });
  });
  afterAll(() => {
    process.env = { ...original };
  });
  function request(authorization?: string): NextRequest {
    return {
      headers: new Headers({
        cookie: 'member-session',
        ...(authorization ? { authorization } : {}),
      }),
    } as unknown as NextRequest;
  }
  it.each([undefined, 'Bearer wrong', 'local-test-secret'])(
    'rejects member cookies and invalid auth %s',
    async (auth) => {
      process.env[flag] = 'true';
      expect((await handler(request(auth))).status).toBe(401);
      expect(processor).not.toHaveBeenCalled();
    }
  );
  it('fails closed without authorization configuration', async () => {
    delete process.env.CRON_SECRET;
    process.env[flag] = 'true';
    expect((await handler(request('Bearer local-test-secret'))).status).toBe(503);
    expect(processor).not.toHaveBeenCalled();
  });
  it.each([undefined, 'false'])(
    'cannot activate with an existing secret when flag is %s',
    async (value) => {
      if (value !== undefined) process.env[flag] = value;
      expect((await handler(request('Bearer local-test-secret'))).status).toBe(503);
      expect(processor).not.toHaveBeenCalled();
    }
  );
  it('requires both explicit activation and exact scheduler authorization', async () => {
    process.env[flag] = 'true';
    expect((await handler(request('Bearer local-test-secret'))).status).toBe(200);
    expect(processor).toHaveBeenCalledTimes(1);
  });
});
