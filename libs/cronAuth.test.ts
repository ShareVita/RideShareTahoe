import type { NextRequest } from 'next/server';
import { rejectUnauthorizedCron } from './cronAuth';

function requestWith(authorization?: string): NextRequest {
  return {
    headers: new Headers(authorization ? { authorization } : {}),
  } as unknown as NextRequest;
}

describe('rejectUnauthorizedCron', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it('fails closed when no scheduler secret is configured', () => {
    delete process.env.CRON_SECRET;
    delete process.env.CRON_SECRET_TOKEN;
    expect(rejectUnauthorizedCron(requestWith('Bearer anything'))?.status).toBe(503);
  });

  it("accepts Vercel Cron's CRON_SECRET", () => {
    process.env.CRON_SECRET = 'vercel-cron-secret';
    delete process.env.CRON_SECRET_TOKEN;
    expect(rejectUnauthorizedCron(requestWith('Bearer vercel-cron-secret'))).toBeNull();
  });

  it('accepts CRON_SECRET_TOKEN for other schedulers', () => {
    delete process.env.CRON_SECRET;
    process.env.CRON_SECRET_TOKEN = 'scheduler-token';
    expect(rejectUnauthorizedCron(requestWith('Bearer scheduler-token'))).toBeNull();
  });

  it.each([undefined, 'Bearer wrong', 'vercel-cron-secret', 'Bearer vercel-cron-secret2'])(
    'rejects %p',
    (authorization) => {
      process.env.CRON_SECRET = 'vercel-cron-secret';
      expect(rejectUnauthorizedCron(requestWith(authorization))?.status).toBe(401);
    }
  );
});
