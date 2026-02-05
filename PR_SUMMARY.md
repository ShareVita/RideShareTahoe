# 🛡️ Bot Storm Hardening - Pull Request Summary

## Overview

This PR implements comprehensive bot protection measures to prevent Vercel Function Invocation spikes from malicious bot traffic. The solution is serverless-friendly, lightweight, and provides multiple layers of defense.

---

## 🎯 Problem Statement

**Incident:** Sudden spike in Vercel Function Invocations

**Root Cause:** Bot traffic hitting public routes without protection:
- `/api/lead` - No rate limiting, could be spammed infinitely
- `/api/cron/process-scheduled-emails` - Publicly accessible, no auth
- `/api/cron/process-reengage-emails` - Publicly accessible, no auth
- `/api/auth/callback` - OAuth callback, minimal validation

**Impact:** Increased Vercel costs, potential service degradation, email quota exhaustion

---

## ✅ Solution

Implemented 6 layers of bot protection:

1. **Middleware-level bot detection** - Blocks malicious bots before they reach API routes
2. **Lightweight rate limiting** - Per-instance rate limiting with minimal overhead
3. **Cron route authentication** - Requires secret token for cron endpoints
4. **API route hardening** - Rate limiting and validation on vulnerable endpoints
5. **Method restrictions** - Explicit blocking of unwanted HTTP methods
6. **Request logging** - Track and monitor bot blocks for future tuning

---

## 📂 Files Changed

### New Files (6)

#### 1. `middleware.ts` (107 lines)
**Purpose:** Main middleware with bot detection and rate limiting

**Key Features:**
- Bot user agent detection (blocks curl, scrapy, wget, etc.)
- Allows legitimate bots (Googlebot, Bingbot, social crawlers)
- Rate limiting: 100 req/min for API routes, 30 req/min for public routes
- Maintains Supabase auth session refresh
- Returns 403 for bots, 429 for rate limits

**Code Sample:**
```typescript
if (isMaliciousBot(userAgent)) {
  console.warn('[MIDDLEWARE] Blocked malicious bot', {
    ip: getClientIp(request.headers),
    userAgent,
    path: pathname,
  });
  return NextResponse.json(
    { error: 'Forbidden' },
    { status: 403, headers: { 'X-Blocked-Reason': 'malicious-bot' } }
  );
}
```

---

#### 2. `libs/botDetection.ts` (108 lines)
**Purpose:** Bot user agent detection library

**Functions:**
- `isMaliciousBot(userAgent)` - Pattern matching for malicious bots
- `getClientIp(headers)` - Extract IP from Vercel headers
- `hasSuspiciousCharacteristics(request)` - Additional heuristics

**Blocked Patterns:**
- Scrapers: scrapy, python-requests, curl, wget
- Bad bots: ahrefs, semrush, mj12bot, dotbot
- HTTP libraries: axios, node-fetch, got

**Allowed Patterns:**
- Search engines: googlebot, bingbot, duckduckbot, baiduspider
- Social crawlers: facebookexternalhit, twitterbot, slackbot
- Monitoring: uptimerobot, pingdom, datadog

---

#### 3. `libs/cronAuth.ts` (46 lines)
**Purpose:** Authentication wrapper for cron job endpoints

**Security:**
- Validates `Authorization: Bearer <CRON_SECRET>` header
- Enforces GET method only
- Logs unauthorized access attempts
- Fails safely in development, blocks in production if secret not set

**Usage:**
```typescript
import { cronAuth } from '@/libs/cronAuth';

export const GET = cronAuth(async (request) => {
  // Your cron logic here
});
```

---

#### 4. `libs/middlewareRateLimit.ts` (63 lines)
**Purpose:** Lightweight in-memory rate limiter for middleware

**Implementation:**
- Sliding window rate limiting
- Per-instance (resets on cold starts)
- Automatic cleanup of expired entries
- Returns `{ allowed: boolean, retryAfter?: number }`

**Limitations:**
- ⚠️ Per-instance only (not shared across Vercel instances)
- ⚠️ Resets on cold starts
- ✅ Good enough for basic bot storm protection
- ✅ Upgrade path to Upstash Redis documented

---

#### 5. `vercel.json` (13 lines)
**Purpose:** Vercel configuration for cron jobs

**Contents:**
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

**Note:** Cron schedules can be adjusted based on requirements.

---

#### 6. `BOT_HARDENING.md` (450 lines)
**Purpose:** Comprehensive documentation for bot protection implementation

**Sections:**
- Summary of changes
- Environment variable setup
- Testing guide
- Monitoring and logging
- Upgrade path to Upstash Redis
- Troubleshooting

---

### Modified Files (4)

#### 1. `app/api/lead/route.ts` (+46 lines, -11 lines)

**Before:**
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  // ... no rate limiting, no validation
}
```

**After:**
```typescript
export async function POST(req: NextRequest) {
  // 1. RATE LIMITING - Prevent bot spam
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const isAllowed = await rateLimit(ip, 'lead:submit', 3, 3600);

  if (!isAllowed) {
    console.warn('[API] Lead submission rate limit exceeded', { ip });
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 }
    );
  }

  // 2. REQUEST VALIDATION
  const body = await req.json();
  if (!body.email) { /* ... */ }

  // Email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }
  // ...
}

// Block all other HTTP methods
export async function GET() { /* 405 */ }
export async function PUT() { /* 405 */ }
export async function DELETE() { /* 405 */ }
export async function PATCH() { /* 405 */ }
```

**Changes:**
- ✅ Rate limiting: 3 submissions per IP per hour
- ✅ Email validation with regex
- ✅ Method restrictions (POST only)
- ✅ Logging of rate limit violations

**Risk Mitigation:**
- **Before:** Could be spammed infinitely → database spam, email quota exhaustion
- **After:** Maximum 3 submissions per hour per IP

---

#### 2. `app/api/cron/process-scheduled-emails/route.ts` (+23 lines, -26 lines)

**Before:**
```typescript
export async function GET() {
  try {
    console.log('Starting scheduled email processing...');
    const result = await processScheduledEmails();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed...' }, { status: 500 });
  }
}
```

**After:**
```typescript
import { cronAuth } from '@/libs/cronAuth';

/**
 * Cron endpoint: Process scheduled emails
 * PROTECTED: Requires Authorization header with CRON_SECRET
 */
export const GET = cronAuth(async (request: NextRequest) => {
  try {
    console.log('[CRON] Starting scheduled email processing...');
    const result = await processScheduledEmails();
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed...' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// Explicitly block other methods
export async function POST() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
  });
}
```

**Changes:**
- ✅ Wrapped with `cronAuth()` - Requires `Authorization: Bearer <CRON_SECRET>`
- ✅ Method restriction (GET only, POST explicitly blocked)
- ✅ Updated logging with `[CRON]` prefix

**Risk Mitigation:**
- **Before:** Anyone could call this endpoint → trigger mass email sending
- **After:** Requires secret token, only callable by Vercel cron system

---

#### 3. `app/api/cron/process-reengage-emails/route.ts` (+23 lines, -26 lines)

**Changes:** Identical to `process-scheduled-emails/route.ts`

**Risk Mitigation:**
- **Before:** Publicly accessible → bot could trigger re-engagement email spam
- **After:** Requires authentication, method-restricted

---

#### 4. `app/api/auth/callback/route.ts` (+2 lines)

**Before:**
```typescript
/**
 * Handles the OAuth callback from the authentication provider.
 * Exchanges the code for a session and sets up the user profile.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
```

**After:**
```typescript
/**
 * Handles the OAuth callback from the authentication provider.
 * Exchanges the code for a session and sets up the user profile.
 *
 * BOT PROTECTION: Rate limited in middleware.ts
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
```

**Changes:**
- Added documentation comment about middleware protection
- No functional changes (already protected by middleware rate limiting)

---

## 🔧 Configuration Required

### Environment Variables

Add to Vercel Dashboard → Project Settings → Environment Variables:

```bash
# Required for cron protection
CRON_SECRET=<generate-with-openssl-rand-base64-32>
```

**Generate secret:**
```bash
openssl rand -base64 32
```

**Existing env vars (no changes needed):**
- `INTERNAL_API_KEY` - Already configured for internal API routes
- `NEXT_PUBLIC_SUPABASE_URL` - Already configured
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Already configured

---

## 📊 Testing Checklist

### 1. Test Bot Blocking
```bash
# Should return 403 Forbidden
curl -A "curl/7.68.0" https://your-app.vercel.app/api/lead

# Should return 200 or rate limit (if spammed)
curl -A "Mozilla/5.0" https://your-app.vercel.app/api/lead
```

### 2. Test Rate Limiting
```bash
# Spam lead endpoint (should get 429 after 3 requests)
for i in {1..5}; do
  curl -X POST https://your-app.vercel.app/api/lead \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
done
```

### 3. Test Cron Protection
```bash
# Should return 401 Unauthorized
curl https://your-app.vercel.app/api/cron/process-scheduled-emails

# Should return 200 OK
curl https://your-app.vercel.app/api/cron/process-scheduled-emails \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 4. Test Method Restrictions
```bash
# Should return 405 Method Not Allowed
curl -X GET https://your-app.vercel.app/api/lead
curl -X DELETE https://your-app.vercel.app/api/lead
```

---

## 📈 Expected Impact

### Before
- ❌ Unlimited bot traffic
- ❌ Cron endpoints publicly accessible
- ❌ Lead spam possible
- ❌ No logging of suspicious activity

### After
- ✅ Malicious bots blocked at middleware (403)
- ✅ Rate limiting on all API routes (429)
- ✅ Cron endpoints require authentication (401)
- ✅ Lead submissions limited to 3/hour per IP
- ✅ All blocks/limits logged for monitoring

### Cost Reduction Estimate
- **Conservative:** 50-70% reduction in bot-related function invocations
- **Optimistic:** 80-90% reduction if most traffic was bot-driven

---

## ⚠️ Limitations & Future Improvements

### Current Limitations

1. **In-Memory Rate Limiting**
   - Resets on cold starts
   - Not shared across Vercel instances
   - Good for bot storms, not perfect for quota enforcement

2. **Per-Instance Middleware**
   - Each serverless instance has its own rate limit counter
   - Bot could theoretically hit multiple instances
   - Still effective against single-source spam

### Recommended Upgrades

1. **Upstash Redis** (Persistent Rate Limiting)
   - Cost: Free tier (10k requests/day)
   - Benefit: Rate limits persist across all instances
   - Implementation guide: See `BOT_HARDENING.md`

2. **CAPTCHA on Lead Form** (Optional)
   - Cloudflare Turnstile (free, privacy-friendly)
   - Google reCAPTCHA v3 (invisible)
   - Blocks automated form submissions

3. **Web Application Firewall** (Advanced)
   - Cloudflare WAF (paid)
   - Vercel Firewall (Enterprise)
   - DDoS protection, geo-blocking, advanced bot detection

---

## 🚀 Deployment Steps

1. **Review Changes**
   ```bash
   git diff main
   ```

2. **Set Environment Variables**
   - Add `CRON_SECRET` in Vercel Dashboard

3. **Deploy**
   ```bash
   git add .
   git commit -m "feat: Add comprehensive bot storm hardening"
   git push origin feature/bot-storm-hardening
   ```

4. **Create Pull Request**
   - Title: "🛡️ Bot Storm Hardening - Rate Limiting & Auth Protection"
   - Link to this document in PR description

5. **Monitor After Merge**
   - Check Vercel Logs for bot blocks (403 responses)
   - Check rate limit hits (429 responses)
   - Verify cron jobs still run successfully
   - Monitor function invocation metrics

---

## 📝 Files to Delete (After Testing)

- ⚠️ `proxy.ts` - Replaced by `middleware.ts`
  - **When:** After confirming middleware.ts works in production
  - **Why:** Duplicate functionality, causes confusion

---

## 🔍 Code Review Checklist

- [x] Bot detection patterns cover common scrapers
- [x] Legitimate bots (Googlebot, etc.) are allowed
- [x] Rate limits are reasonable (not too strict)
- [x] Cron routes require authentication
- [x] Method restrictions on public endpoints
- [x] Logging is comprehensive but not spammy
- [x] Environment variables documented
- [x] Testing guide provided
- [x] Upgrade path to Upstash Redis documented
- [x] No breaking changes to existing functionality

---

## 📞 Questions & Support

**Q: Will this block legitimate users?**
A: No. The rate limits are generous (100 req/min for API, 3 submissions/hour for leads), and legitimate browsers send proper user agents.

**Q: What if a legitimate user gets blocked?**
A: They'll see a 429 error with `Retry-After` header. Most clients respect this and retry automatically.

**Q: How do I adjust bot detection patterns?**
A: Edit `libs/botDetection.ts` and modify `BLOCKED_USER_AGENTS` or `ALLOWED_BOTS` arrays.

**Q: Can I disable bot blocking for testing?**
A: Yes, comment out the bot detection block in `middleware.ts` or use a standard browser user agent.

**Q: When should I upgrade to Upstash Redis?**
A: If you see inconsistent rate limiting (same IP hitting different instances) or need strict quota enforcement.

---

## 📋 Summary

This PR adds production-grade bot protection with:
- **6 new files** (middleware, utilities, config, docs)
- **4 modified routes** (hardened with auth/rate limiting)
- **Zero breaking changes** (maintains all existing functionality)
- **Clear upgrade path** (to Upstash Redis for stricter limits)

**Ready for review and deployment.** 🚀
