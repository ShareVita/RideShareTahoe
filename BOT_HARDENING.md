# Bot Storm Hardening - Implementation Guide

This document describes the bot protection measures implemented to prevent function invocation spikes from malicious bot traffic.

---

## TODO (continue later)

- [x] **GET audit checklist**: ✅ DONE - See `GET_ENDPOINT_AUDIT.md` for comprehensive endpoint security audit
- [x] **Critical security fix**: ✅ DONE - Fixed `/api/reviews/stats` (now requires auth + caching)
- [x] **Test instructions**: ✅ DONE - Added comprehensive testing section with local, preview, and production tests
- [x] **Upstash**: ✅ DONE - Already implemented in `libs/middlewareRateLimit.ts` (uses @upstash/ratelimit when env vars set)
- [ ] **Optional HIGH PRIORITY**: Add route-specific rate limiting to `/api/matches` (expensive distance calculations)
- [ ] **Optional MEDIUM PRIORITY**: Add `revalidate` caching to discovery routes (community/events, community/places, community/profiles)

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

### Local Testing (Development)

#### 1. Test Bot Detection Middleware

```bash
# Test 1: Malicious bot should be blocked (403)
curl -v -A "curl/7.68.0" http://localhost:3000/api/lead

# Expected Response:
# HTTP/1.1 403 Forbidden
# X-Blocked-Reason: malicious-bot
# {"error":"Forbidden"}

# Test 2: Legitimate browser should pass
curl -v -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" \
  http://localhost:3000/api/lead

# Expected: Should reach the route (not blocked at middleware)
```

#### 2. Test Auth Route Allowlist

```bash
# Test: Auth routes should NEVER be blocked by middleware
curl -v -A "curl/7.68.0" "http://localhost:3000/api/auth/callback?code=test"

# Expected: Should NOT return 403 (auth routes are allowlisted)
# May return auth error, but not bot-blocked
```

#### 3. Test Rate Limiting (In-Memory)

```bash
# Test: Spam API endpoint to trigger rate limit
for i in {1..150}; do
  echo "Request $i:"
  curl -s -o /dev/null -w "%{http_code}\n" \
    -A "Mozilla/5.0" \
    http://localhost:3000/api/community/profiles
  sleep 0.1
done

# Expected: After ~100 requests in 1 minute, should return:
# HTTP/1.1 429 Too Many Requests
# {"error":"Too many requests. Please slow down.","retryAfter":XX}
```

#### 4. Test Lead Form Rate Limiting

```bash
# Test: Submit lead form multiple times
for i in {1..5}; do
  echo "Submission $i:"
  curl -X POST http://localhost:3000/api/lead \
    -H "Content-Type: application/json" \
    -d '{"email":"test'$i'@example.com"}' | jq
done

# Expected: After 3 requests, should return:
# HTTP/1.1 429 Too Many Requests
# {"error":"Too many submissions. Please try again later."}
```

#### 5. Test Cron Authentication (Local)

```bash
# Set your CRON_SECRET in .env.local first
# CRON_SECRET=test-secret-local

# Test 1: No auth - should fail (401)
curl -v http://localhost:3000/api/cron/process-scheduled-emails

# Expected:
# HTTP/1.1 401 Unauthorized
# {"error":"Unauthorized"}

# Test 2: With Bearer token - should succeed
curl -v http://localhost:3000/api/cron/process-scheduled-emails \
  -H "Authorization: Bearer test-secret-local"

# Expected:
# HTTP/1.1 200 OK
# {"success":true,"message":"Scheduled emails processed successfully",...}

# Test 3: With query param fallback - should succeed
curl -v "http://localhost:3000/api/cron/process-scheduled-emails?cron_secret=test-secret-local"

# Expected:
# HTTP/1.1 200 OK
```

#### 6. Test Unknown IP Handling

```bash
# Test: Verify unknown IPs don't block everyone
# In middleware.ts, you should see logs like:
# [MIDDLEWARE] Rate limit skipped - unknown IP { path: '/api/...' }

# Check your local dev server logs while making requests
npm run dev

# Make requests and watch for the log message
curl http://localhost:3000/api/community/events
```

---

### Preview Deploy Testing (Vercel)

After pushing to your branch, get the preview deploy URL from Vercel or GitHub PR checks.

```bash
# Set your preview URL
PREVIEW_URL="https://your-app-git-feature-bot-storm-hardening-youruser.vercel.app"
```

#### 1. Test Bot Blocking on Preview

```bash
# Test: curl user agent should be blocked
curl -v -A "curl/7.68.0" "$PREVIEW_URL/api/lead"

# Expected:
# HTTP/2 403
# x-blocked-reason: malicious-bot
# {"error":"Forbidden"}

# Verify in Vercel Logs:
# Go to Vercel Dashboard → Deployments → Your Preview → Logs
# Should see: [MIDDLEWARE] Blocked malicious bot
```

#### 2. Test Real Browser Request

```bash
# Test: Browser user agent should pass middleware
curl -v -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0" \
  "$PREVIEW_URL/api/community/profiles"

# Expected: Should pass middleware (may require auth)
# Should NOT see 403 with X-Blocked-Reason
```

#### 3. Test Rate Limiting on Preview (Upstash)

```bash
# If UPSTASH_* env vars are set, test persistent rate limiting
# Run this from DIFFERENT machines/IPs if possible

# Machine 1:
for i in {1..60}; do
  curl -s -o /dev/null -w "Machine1 Request $i: %{http_code}\n" \
    "$PREVIEW_URL/api/community/events"
  sleep 0.5
done

# Machine 2 (simultaneously):
for i in {1..60}; do
  curl -s -o /dev/null -w "Machine2 Request $i: %{http_code}\n" \
    "$PREVIEW_URL/api/community/events"
  sleep 0.5
done

# With Upstash: Rate limits should be shared across requests
# Without Upstash: Each serverless instance has its own counter
```

#### 4. Test Cron on Preview

```bash
# Get CRON_SECRET from Vercel env vars
CRON_SECRET="your-production-cron-secret"

# Test: Unauthorized request
curl -v "$PREVIEW_URL/api/cron/process-scheduled-emails"

# Expected: 401 Unauthorized

# Test: Authorized with Bearer token
curl -v "$PREVIEW_URL/api/cron/process-scheduled-emails" \
  -H "Authorization: Bearer $CRON_SECRET"

# Expected: 200 OK (emails processed)

# Test: Authorized with query param
curl -v "$PREVIEW_URL/api/cron/process-scheduled-emails?cron_secret=$CRON_SECRET"

# Expected: 200 OK
```

#### 5. Test Critical Security Fix: /api/reviews/stats

```bash
# Test: Should now require authentication
curl -v "$PREVIEW_URL/api/reviews/stats?userId=some-uuid"

# Expected:
# HTTP/2 401 Unauthorized
# {"error":"Unauthorized"} or similar

# Before fix: Would return review stats without auth (SECURITY ISSUE)
# After fix: Requires authentication
```

#### 6. Test Caching Headers

```bash
# Test: Review stats should have caching headers
curl -v "$PREVIEW_URL/api/reviews/stats" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Expected Response Headers:
# Cache-Control: public, s-maxage=300, stale-while-revalidate=600
# (Data cached for 5 minutes)
```

---

### Production Testing (After Merge)

```bash
PROD_URL="https://your-app.vercel.app"
```

#### 1. Monitor Function Invocations

```bash
# In Vercel Dashboard:
# 1. Go to Analytics → Functions
# 2. Compare invocations before/after deploy
# 3. Look for reduction in:
#    - /api/lead invocations (bot spam blocked)
#    - /api/cron/* invocations (only Vercel cron triggers)
#    - /api/reviews/stats (now cached)
```

#### 2. Monitor Error Rates

```bash
# Check for increases in:
# - 403 responses (bot blocks) - EXPECTED
# - 429 responses (rate limits) - EXPECTED
# - 401 responses (cron unauthorized) - EXPECTED if misconfigured

# Check for UNEXPECTED increases in:
# - 500 errors (application errors)
# - Auth failures on /api/auth/* (should not increase)
```

#### 3. Smoke Test Critical Paths

```bash
# Test: Login flow still works (auth routes not blocked)
# 1. Open browser to $PROD_URL/login
# 2. Click "Sign in with Google" (or your OAuth provider)
# 3. Verify you can complete OAuth flow
# 4. Verify you land on /community or /profile/edit

# If login is broken:
# - Check middleware.ts allowlist includes /api/auth/*
# - Check Vercel logs for 403 on /api/auth/callback
```

#### 4. Test Upstash Redis (If Configured)

```bash
# Test: Rate limits should persist across serverless instances
# Run this test multiple times, minutes apart

for i in {1..110}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    "$PROD_URL/api/community/profiles"
  sleep 0.5
done

# Expected:
# - Requests 1-100: HTTP 200 OK
# - Requests 101+: HTTP 429 Too Many Requests
# - Wait 60 seconds, try again: Should reset to 200 OK
```

---

### Troubleshooting

#### Issue: Login/OAuth is broken

```bash
# Check: Are auth routes being blocked?
curl -v -I "$PROD_URL/api/auth/callback"

# Should NOT see:
# HTTP/2 403
# X-Blocked-Reason: malicious-bot

# Fix: Verify middleware.ts line ~24:
# const isAuthRoute = pathname.startsWith('/api/auth/');
```

#### Issue: All users getting rate limited

```bash
# Check: Are IPs resolving to "unknown"?
# Look in Vercel logs for:
# [MIDDLEWARE] Rate limit skipped - unknown IP

# If many "unknown" messages:
# - Check if request.ip is available in your Vercel environment
# - Check x-forwarded-for and x-real-ip headers
```

#### Issue: Cron jobs not running

```bash
# Check: Is CRON_SECRET set in Vercel?
# Vercel Dashboard → Settings → Environment Variables

# Check: Are cron jobs configured in vercel.json?
cat vercel.json

# Check: Manually trigger cron with query param:
curl "$PROD_URL/api/cron/process-scheduled-emails?cron_secret=$CRON_SECRET"
```

#### Issue: Rate limiting not working across instances

```bash
# Check: Are UPSTASH_* env vars set?
# Vercel Dashboard → Settings → Environment Variables

# If not set:
# - Rate limiting is in-memory (per-instance)
# - This is expected behavior without Upstash
# - See "Upgrade Path: Upstash Redis" section
```

---

### Test Results Checklist

- [ ] Bot blocking works (curl blocked, browsers allowed)
- [ ] Auth routes are NOT blocked (/api/auth/\*)
- [ ] Static assets are NOT blocked (/\_next/\*, favicon)
- [ ] Rate limiting triggers after 100 req/min per IP
- [ ] Lead form limits to 3 submissions/hour per IP
- [ ] Cron routes require CRON_SECRET (Bearer or query param)
- [ ] /api/reviews/stats requires authentication
- [ ] /api/reviews/stats returns caching headers
- [ ] Login/OAuth flow still works end-to-end
- [ ] Unknown IPs don't block all users (logs show skip message)
- [ ] Upstash Redis works (if env vars configured)
- [ ] Function invocations reduced in Vercel Analytics

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
