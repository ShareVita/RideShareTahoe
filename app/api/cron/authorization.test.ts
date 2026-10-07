import { NextRequest } from 'next/server';
import { GET as scheduled } from './process-scheduled-emails/route';
import { GET as reengage } from './process-reengage-emails/route';
import { GET as deletions, POST as postDeletions } from './process-deletions/route';
import { processScheduledDeletions } from '@/lib/accountDeletion';
import { processScheduledEmails, processReengageEmails } from '@/libs/email';

jest.mock('@/lib/accountDeletion', () => ({ processScheduledDeletions: jest.fn() }));
jest.mock('@/libs/email', () => ({
  processScheduledEmails: jest.fn(),
  processReengageEmails: jest.fn(),
}));

describe.each([
  ['scheduled', scheduled, processScheduledEmails],
  ['reengage', reengage, processReengageEmails],
  ['deletions GET', deletions, processScheduledDeletions],
  ['deletions POST', postDeletions, processScheduledDeletions],
] as const)('%s cron authorization', (_name, handler, processor) => {
  const originalSecret = process.env.CRON_SECRET_TOKEN;
  const originalDeletionFlag = process.env.ACCOUNT_DELETION_ENABLED;
  const originalEmailFlag = process.env.SCHEDULED_EMAILS_ENABLED;
  const originalReengageFlag = process.env.REENGAGEMENT_EMAILS_ENABLED;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET_TOKEN = 'local-scheduler-secret';
    process.env.ACCOUNT_DELETION_ENABLED = 'true';
    process.env.SCHEDULED_EMAILS_ENABLED = 'true';
    process.env.REENGAGEMENT_EMAILS_ENABLED = 'true';
    (processor as jest.Mock).mockResolvedValue({ processed: 0, errors: [] });
  });
  afterAll(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET_TOKEN;
    else process.env.CRON_SECRET_TOKEN = originalSecret;
    if (originalDeletionFlag === undefined) delete process.env.ACCOUNT_DELETION_ENABLED;
    else process.env.ACCOUNT_DELETION_ENABLED = originalDeletionFlag;
    if (originalEmailFlag === undefined) delete process.env.SCHEDULED_EMAILS_ENABLED;
    else process.env.SCHEDULED_EMAILS_ENABLED = originalEmailFlag;
    if (originalReengageFlag === undefined) delete process.env.REENGAGEMENT_EMAILS_ENABLED;
    else process.env.REENGAGEMENT_EMAILS_ENABLED = originalReengageFlag;
  });

  it.each([
    undefined,
    '',
    'Bearer wrong',
    'Bearer local-scheduler-secret-extra',
    'local-scheduler-secret',
    'Basic local-scheduler-secret',
    'Bearer undefined',
  ])('rejects invalid authorization %s before processing', async (authorization) => {
    const request = new NextRequest('http://localhost/api/cron/test', {
      headers: { ...(authorization ? { authorization } : {}), cookie: 'logged-in-user-session' },
    });
    const response = await handler(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(processor).not.toHaveBeenCalled();
  });

  it.each([undefined, ''])('fails closed when the configured secret is %s', async (secret) => {
    if (secret === undefined) delete process.env.CRON_SECRET_TOKEN;
    else process.env.CRON_SECRET_TOKEN = secret;
    const response = await handler(
      new NextRequest('http://localhost/api/cron/test', {
        headers: { authorization: 'Bearer undefined' },
      })
    );
    expect(response.status).toBe(503);
    expect(processor).not.toHaveBeenCalled();
  });

  it('accepts only the exact scheduler bearer secret without a user session', async () => {
    const response = await handler(
      new NextRequest('http://localhost/api/cron/test', {
        headers: { authorization: 'Bearer local-scheduler-secret' },
      })
    );
    expect(response.status).toBe(200);
    expect(processor).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, 'false'])('cannot run while its activation flag is %s', async (flag) => {
    const key =
      _name === 'scheduled'
        ? 'SCHEDULED_EMAILS_ENABLED'
        : _name === 'reengage'
          ? 'REENGAGEMENT_EMAILS_ENABLED'
          : 'ACCOUNT_DELETION_ENABLED';
    if (flag === undefined) delete process.env[key];
    else process.env[key] = flag;
    const response = await handler(
      new NextRequest('http://localhost/api/cron/test', {
        headers: { authorization: 'Bearer local-scheduler-secret' },
      })
    );
    expect(response.status).toBe(503);
    expect(processor).not.toHaveBeenCalled();
  });

  it('does not expose internal failures to the caller', async () => {
    (processor as jest.Mock).mockRejectedValue(new Error('sensitive provider diagnostics'));
    const response = await handler(
      new NextRequest('http://localhost/api/cron/test', {
        headers: { authorization: 'Bearer local-scheduler-secret' },
      })
    );
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('sensitive');
  });
});
