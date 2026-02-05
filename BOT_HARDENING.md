# Bot Storm Hardening - Implementation Guide

This document describes the bot protection measures implemented to prevent function invocation spikes from malicious bot traffic.

---

## TODO (continue later)

- [ ] **GET audit checklist**: Add to this doc a short table of all GET endpoints (e.g. `/api/community/profiles`, `/api/matches`, …) with how each is protected (auth required / rate limit only / cached). Ensure any public or expensive GET has `revalidate` or protection.
- [ ] **Test instructions**: Add "How to test locally and on preview deploy" (curl examples for cron with `?cron_secret=`, rate limit, auth allowlist).
- [ ] **Upstash**: Run `npm install` after pull; verify `libs/middlewareRateLimit.ts` Upstash path (e.g. `reset` vs `pending` on limit result) against @upstash/ratelimit types once deps are installed.
- [ ] **Optional**: Add `revalidate` or cache headers to any public GET route that does DB reads, if not already auth-protected.

---

## 📋 Summary of Changes

### 🛡️ 1. New Middleware with Bot Detection (`middleware.ts`)

**File:** `/middleware.ts`

**What it does:**

- **Bot Detection**: Blocks malicious bots (scrapers, crawlers) while allowing legitimate search engines
- **Rate Limiting**: Per-instance rate limiting (100 req/min for API routes, 30 req/min for public routes)
- **Supabase Auth**: Maintains session refresh functionality from previous `proxy.ts`

**Key Features:**

- Blocks known bad user agents (scrapy, curl, wget, generic scanners)
- Allows legitimate bots (Googlebot, Bingbot, social media crawlers)
- Returns 403 for blocked bots with `X-Blocked-Reason` header
- Returns 429 for rate limit violations with `Retry-After` header

**Note:** The old `proxy.ts` file can be deleted as it's been replaced by `middleware.ts`.

---

### 🤖 2. Bot Detection Library (`libs/botDetection.ts`)

**File:** `/libs/botDetection.ts`

**Functions:**

- `isMaliciousBot(userAgent)` - Checks if user agent is malicious
- `getClientIp(headers)` - Extracts IP from Vercel headers
- `hasSuspiciousCharacteristics(request)` - Additional heuristics

**Customization:**
Edit the `BLOCKED_USER_AGENTS` and `ALLOWED_BOTS` arrays to adjust bot filtering.

---

### ⏱️ 3. Lightweight Rate Limiter (`libs/middlewareRateLimit.ts`)

**File:** `/libs/middlewareRateLimit.ts`

**Purpose:** Fast, in-memory rate limiting for middleware

**Limitations:**

- ⚠️ **Per-instance only** - Resets on cold starts
- ⚠️ **Not shared across Vercel instances**
- ✅ **Good for basic bot storm protection**
- ✅ **Very low latency overhead**

**For production-grade rate limiting:**

- Consider upgrading to **Upstash Redis** (see Upgrade Path section below)
- The existing `libs/rateLimit.ts` (Supabase-backed) is more persistent but slower

---

### 🔐 4. Cron Route Protection (`libs/cronAuth.ts`)

**File:** `/libs/cronAuth.ts`

**Purpose:** Authenticates cron job endpoints

**Usage:**

```typescript
import { cronAuth } from '@/libs/cronAuth';

export const GET = cronAuth(async (request) => {
  // Your cron logic
});
```

**Security:**

- Requires `Authorization: Bearer <CRON_SECRET>` header
- Enforces GET method only
- Logs unauthorized access attempts

---

### 🚨 5. Protected API Routes

#### a) `/api/lead` - Lead Capture (CRITICAL)

**Changes:**

- ✅ Rate limited: 3 submissions per IP per hour
- ✅ Email validation (regex check)
- ✅ Method restrictions (POST only, blocks GET/PUT/DELETE/PATCH)
- ✅ Logging of rate limit violations

**Why:** This was the most vulnerable route - no protection, could be spammed infinitely.

---

#### b) `/api/cron/process-scheduled-emails` (HIGH RISK)

**Changes:**

- ✅ Wrapped with `cronAuth()` - Requires `CRON_SECRET`
- ✅ Method restriction (GET only)
- ✅ Blocks POST and other methods

**Before:** Publicly accessible, could be called by anyone to trigger mass emails
**After:** Requires authentication header from Vercel cron system

---

#### c) `/api/cron/process-reengage-emails` (HIGH RISK)

**Changes:**

- ✅ Wrapped with `cronAuth()` - Requires `CRON_SECRET`
- ✅ Method restriction (GET only)
- ✅ Blocks POST and other methods

**Before:** Publicly accessible, could trigger email spam
**After:** Requires authentication header

---

### ⚙️ 6. Vercel Configuration (`vercel.json`)

**File:** `/vercel.json` (new)

**Purpose:** Configures Vercel cron jobs

```json
{
  "crons": [
    {
      "path": "/api/cron/process-scheduled-emails",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/process-reengage-emails",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Note:** Update the `schedule` values to match your desired cron timing.

---

## 🔧 Required Environment Variables

### 1. `CRON_SECRET` (Required for Production)

**Purpose:** Authenticates cron job endpoints

**How to set:**

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to Vercel
vercel env add CRON_SECRET
```

**In Vercel Dashboard:**

1. Go to Project Settings → Environment Variables
2. Add: `CRON_SECRET` = `<your-generated-secret>`
3. Select: Production, Preview, Development (or as needed)

**Note:** If `CRON_SECRET` is not set:

- Development: Cron routes will work with a warning
- Production: Cron routes will return 500 error

---

### 2. `INTERNAL_API_KEY` (Already exists)

**Purpose:** Authenticates internal API routes (emails, etc.)

**Status:** ✅ Already configured in your codebase

---

## 📊 Monitoring and Logging

### What's Logged

All bot blocks and rate limits are logged with:

- IP address
- User agent
- Requested path
- Timestamp

**Example log output:**

```log
[MIDDLEWARE] Blocked malicious bot { ip: '1.2.3.4', userAgent: 'curl/7.68.0', path: '/api/lead' }
[MIDDLEWARE] Rate limit exceeded { ip: '5.6.7.8', path: '/api/cron/process-scheduled-emails', retryAfter: 45 }
[CRON] Unauthorized cron access attempt { ip: '9.10.11.12', path: '/api/cron/process-scheduled-emails' }
[API] Lead submission rate limit exceeded { ip: '13.14.15.16' }
```

### Vercel Logs

Check Vercel Dashboard → Your Project → Logs to monitor:

- Bot blocks (403 responses)
- Rate limit hits (429 responses)
- Unauthorized cron attempts (401 responses)

---

## 🚀 Testing

### Test Bot Blocking

```bash
# Should be blocked (403)
curl -A "curl/7.68.0" https://your-app.vercel.app/api/lead

# Should be allowed (but rate limited)
curl -A "Mozilla/5.0" https://your-app.vercel.app/api/lead
```

### Test Rate Limiting

```bash
# Spam the lead endpoint
for i in {1..10}; do
  curl -X POST https://your-app.vercel.app/api/lead \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
  echo ""
done
```

After 3 requests, you should get:

```json
{
  "error": "Too many submissions. Please try again later."
}
```

### Test Cron Protection

```bash
# Should fail (401 Unauthorized)
curl https://your-app.vercel.app/api/cron/process-scheduled-emails

# Should succeed (with correct secret)
curl https://your-app.vercel.app/api/cron/process-scheduled-emails \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 🔄 Upgrade Path: Upstash Redis

The current in-memory rate limiter works but has limitations. For production-grade rate limiting:

### Why Upgrade?

| Feature                     | In-Memory | Upstash Redis          |
| --------------------------- | --------- | ---------------------- |
| Persistent across instances | ❌ No     | ✅ Yes                 |
| Survives cold starts        | ❌ No     | ✅ Yes                 |
| Shared across regions       | ❌ No     | ✅ Yes                 |
| Latency                     | ~1ms      | ~5-20ms                |
| Cost                        | Free      | Free tier: 10k req/day |

### How to Upgrade

1. **Create Upstash Account**
   - Go to https://upstash.com
   - Create a new Redis database (Global recommended)

2. **Install Package**

   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```

3. **Add Environment Variables**

   ```bash
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_token
   ```

4. **Update `libs/middlewareRateLimit.ts`**

   ```typescript
   import { Ratelimit } from '@upstash/ratelimit';
   import { Redis } from '@upstash/redis';

   const redis = new Redis({
     url: process.env.UPSTASH_REDIS_REST_URL!,
     token: process.env.UPSTASH_REDIS_REST_TOKEN!,
   });

   const ratelimit = new Ratelimit({
     redis,
     limiter: Ratelimit.slidingWindow(100, '1 m'),
   });

   export async function checkRateLimit(identifier: string, limit: number, windowMs: number) {
     const { success, pending } = await ratelimit.limit(identifier);
     await pending; // Wait for response
     return { allowed: success };
   }
   ```

5. **Test and Deploy**

---

## 📝 Files Changed

### New Files

- ✅ `middleware.ts` - Main middleware with bot detection and rate limiting
- ✅ `libs/botDetection.ts` - Bot user agent detection
- ✅ `libs/cronAuth.ts` - Cron authentication wrapper
- ✅ `libs/middlewareRateLimit.ts` - Lightweight rate limiter
- ✅ `vercel.json` - Vercel cron configuration
- ✅ `BOT_HARDENING.md` - This documentation

### Modified Files

- ✅ `app/api/lead/route.ts` - Added rate limiting and validation
- ✅ `app/api/cron/process-scheduled-emails/route.ts` - Added auth protection
- ✅ `app/api/cron/process-reengage-emails/route.ts` - Added auth protection
- ✅ `app/api/auth/callback/route.ts` - Added comment about middleware protection

### Files to Remove

- ⚠️ `proxy.ts` - Replaced by `middleware.ts` (can be deleted after testing)

---

## 🎯 Next Steps

1. **Deploy and Test**

   ```bash
   git add .
   git commit -m "feat: Add bot storm hardening"
   git push
   ```

2. **Set Environment Variables** in Vercel Dashboard:
   - `CRON_SECRET` (required for cron protection)

3. **Monitor Logs** for 24-48 hours:
   - Check for false positives (legitimate users blocked)
   - Check for rate limit violations
   - Adjust bot detection patterns if needed

4. **Consider Upstash Redis** if you see:
   - Rate limits not working consistently
   - Same IP making requests across different instances
   - Need for more granular rate limiting

5. **Optional: Add CAPTCHA** to `/api/lead`:
   - For even stronger protection
   - Consider Cloudflare Turnstile or Google reCAPTCHA

---

## ⚠️ Important Notes

1. **In-Memory Limitations**: The current rate limiter is per-instance. On Vercel, you may have multiple instances running simultaneously. For most use cases, this is sufficient, but for high-traffic apps, upgrade to Upstash Redis.

2. **Cold Starts**: Rate limit counters reset when a serverless function cold starts (hasn't been called in a while). This is acceptable for bot protection but not ideal for strict quota enforcement.

3. **Legitimate Bots**: The middleware allows Googlebot, Bingbot, and other search engines. If you want to block ALL bots (including search engines), edit `libs/botDetection.ts`.

4. **Middleware Performance**: Keep middleware lightweight! Heavy operations (database queries, external API calls) should be in API routes, not middleware.

5. **Cron Schedules**: Update `vercel.json` cron schedules to match your needs. Current defaults:
   - Scheduled emails: Every hour (`0 * * * *`)
   - Re-engagement emails: Every day at 9 AM UTC (`0 9 * * *`)

---

## 📞 Support

If you encounter issues:

1. Check Vercel logs for error messages
2. Verify environment variables are set correctly
3. Test with `curl` to isolate the issue
4. Review the bot detection patterns in `libs/botDetection.ts`

For questions about this implementation, refer to the code comments in each file.
