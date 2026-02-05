# Production Setup Guide - Bot Hardening

This guide covers the **REQUIRED** environment variables and configuration for production deployment.

---

## 🚨 CRITICAL: Required Environment Variables

### 1. CRON_SECRET (Required)

**Purpose:** Authenticates cron job endpoints to prevent unauthorized access.

**Generate the secret:**

```bash
openssl rand -base64 32
```

**Add to Vercel:**

1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add new variable:
   - **Name:** `CRON_SECRET`
   - **Value:** (paste the generated secret)
   - **Environments:** Production, Preview, Development

**What happens if not set:**

- ❌ Cron routes (`/api/cron/*`) will return **500 Internal Server Error** in production
- ⚠️ Development mode will allow requests with a warning

---

### 2. UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN (Highly Recommended)

**Purpose:** Enables persistent, cross-instance rate limiting using Upstash Redis.

**Why you need this:**

- ✅ Rate limits persist across Vercel serverless instances
- ✅ Rate limits survive cold starts
- ✅ Rate limits work correctly under distributed bot attacks
- ❌ **Without Upstash:** Rate limiting is per-instance only and resets on cold starts (not effective)

**Setup Upstash Redis:**

1. **Create free Upstash account:** https://upstash.com
2. **Create a Redis database:**
   - Go to Console → Create Database
   - Choose any region (closest to your Vercel deployment)
   - Free tier: 10,000 requests/day (sufficient for most apps)

3. **Copy credentials:**
   - Click your database → REST API tab
   - Copy `UPSTASH_REDIS_REST_URL`
   - Copy `UPSTASH_REDIS_REST_TOKEN`

4. **Add to Vercel:**
   - **Name:** `UPSTASH_REDIS_REST_URL`
   - **Value:** (your Upstash URL)
   - **Environments:** Production, Preview, Development

   - **Name:** `UPSTASH_REDIS_REST_TOKEN`
   - **Value:** (your Upstash token)
   - **Environments:** Production, Preview, Development

**What happens if not set:**

- ⚠️ Falls back to in-memory rate limiting (per-instance, resets on cold starts)
- ⚠️ Bot storms with multiple concurrent connections can bypass rate limits
- ⚠️ Not recommended for production

---

### 3. NEXT_PUBLIC_APP_URL (Required for CSRF Protection)

**Purpose:** Validates the origin of POST/PUT/DELETE requests to prevent CSRF attacks.

**Set to your production URL:**

```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**Add to Vercel:**

- **Name:** `NEXT_PUBLIC_APP_URL`
- **Value:** `https://yourdomain.com` (your actual domain)
- **Environments:** Production, Preview, Development

**What happens if not set:**

- ⚠️ CSRF protection will only work in development (localhost allowed by default)
- ⚠️ Production API routes vulnerable to cross-site request forgery

---

## ⚙️ Optional Environment Variables

### USE_GROUPED_RATE_LIMITS (Default: enabled)

**Purpose:** Groups API routes by feature to prevent rate limit bypass via route switching.

**Default behavior:** Enabled (set to `false` to disable)

**When to disable:**

- If you want per-route rate limiting instead of grouped limits
- For testing individual route performance

**To disable:**

```bash
USE_GROUPED_RATE_LIMITS=false
```

---

## 📋 Pre-Deployment Checklist

Before deploying to production, verify:

- [ ] ✅ `CRON_SECRET` is set in Vercel environment variables
- [ ] ✅ `UPSTASH_REDIS_REST_URL` is set
- [ ] ✅ `UPSTASH_REDIS_REST_TOKEN` is set
- [ ] ✅ `NEXT_PUBLIC_APP_URL` is set to your production domain
- [ ] ✅ Existing env vars still configured:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (if used)

---

## 🧪 Testing After Deployment

### 1. Test Cron Authentication

**Valid request (should succeed):**

```bash
curl -X GET "https://yourdomain.com/api/cron/process-scheduled-emails" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Invalid request (should return 401):**

```bash
curl -X GET "https://yourdomain.com/api/cron/process-scheduled-emails"
```

### 2. Test Rate Limiting

**Verify rate limits are working:**

```bash
# Make 101 requests quickly (should trigger rate limit)
for i in {1..101}; do
  curl -s "https://yourdomain.com/api/community/profiles" > /dev/null
  echo "Request $i"
done
```

Expected: Requests 101+ should return 429 Too Many Requests

### 3. Test Bot Detection

**Malicious bot (should be blocked with 403):**

```bash
curl -X GET "https://yourdomain.com/api/community/profiles" \
  -H "User-Agent: curl/7.68.0"
```

**Legitimate browser (should succeed):**

```bash
curl -X GET "https://yourdomain.com/api/community/profiles" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
```

### 4. Test CSRF Protection

**Valid origin (should succeed):**

```bash
curl -X POST "https://yourdomain.com/api/lead" \
  -H "Origin: https://yourdomain.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Invalid origin (should return 403):**

```bash
curl -X POST "https://yourdomain.com/api/lead" \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## 📊 Monitoring After Deployment

### Vercel Logs

Monitor for these patterns:

**Expected during bot attacks:**

```
[MIDDLEWARE] Blocked malicious bot
[MIDDLEWARE] Rate limit exceeded
```

**Unexpected (investigate immediately):**

```
[MIDDLEWARE] Unknown IP - using fingerprint (high frequency)
[CRON] CRON_SECRET not configured
[CRON] Unauthorized cron access attempt
[MIDDLEWARE] Blocked CSRF attempt
```

### Upstash Dashboard

Monitor your Redis usage:

- **Daily requests:** Should be < 10,000 for free tier
- **P99 latency:** Should be < 100ms
- **Error rate:** Should be 0%

---

## 🔄 Rollback Plan

If issues occur after deployment:

1. **Check Vercel logs** for error patterns
2. **Verify env vars** are set correctly
3. **Disable grouped rate limits** temporarily:
   ```bash
   USE_GROUPED_RATE_LIMITS=false
   ```
4. **Revert to previous deployment** in Vercel if needed

---

## 💰 Cost Estimate

### Upstash Redis (Free Tier)

- **10,000 requests/day** = ~300,000 requests/month
- **Price:** FREE
- **Overage:** $0.20 per 100,000 requests

### Vercel Function Invocations

**Before bot hardening:**

- Unlimited bot traffic = 500,000+ invocations/month

**After bot hardening:**

- 50-80% reduction in bot traffic = 100,000-250,000 invocations/month

**Savings:** Keeps you within Hobby Plan limits (100k/month) or significantly reduces Pro Plan costs.

---

## 🆘 Troubleshooting

### Issue: Rate limiting not working

**Symptoms:** Bots bypass rate limits

**Causes:**

1. Upstash not configured → falls back to in-memory
2. Multiple Vercel instances have separate in-memory counters
3. Cold starts reset in-memory counters

**Solution:** Configure Upstash Redis (see above)

---

### Issue: Cron jobs returning 500

**Symptoms:** Scheduled emails not sending

**Cause:** `CRON_SECRET` not set in environment

**Solution:**

1. Generate secret: `openssl rand -base64 32`
2. Add to Vercel environment variables
3. Redeploy

---

### Issue: Legitimate traffic blocked

**Symptoms:** 403 Forbidden for legitimate users

**Causes:**

1. CSRF protection blocking valid origins
2. Bot detection blocking legitimate user agents

**Solution:**

1. Check `NEXT_PUBLIC_APP_URL` is set correctly
2. Check Vercel logs for blocked user agents
3. Update `libs/botDetection.ts` if needed

---

### Issue: High Upstash costs

**Symptoms:** Exceeding free tier limits

**Causes:**

1. High legitimate traffic
2. Bot storm not being blocked effectively

**Solution:**

1. Monitor Vercel logs for bot blocks
2. Tighten bot detection patterns
3. Consider upgrading Upstash plan (~$10/month for 1M requests)

---

## 📚 Additional Resources

- **Bot Hardening Implementation:** See `BOT_HARDENING.md`
- **Code Review & Optimizations:** See `CODE_REVIEW_OPTIMIZATIONS.md`
- **Upstash Documentation:** https://docs.upstash.com/redis
- **Vercel Cron Documentation:** https://vercel.com/docs/cron-jobs

---

## ✅ Summary

**Minimum required for production:**

1. ✅ `CRON_SECRET` - Protects cron endpoints
2. ✅ `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` - Enables effective rate limiting
3. ✅ `NEXT_PUBLIC_APP_URL` - Enables CSRF protection

**Expected results:**

- 50-80% reduction in bot-related function invocations
- Protected cron endpoints
- CSRF protection on all POST/PUT/DELETE requests
- Persistent rate limiting across instances

**Deployment time:** ~10 minutes to set up all env vars
