# Magic Link Authentication Fixes

## Problem Summary

Users were receiving magic link emails but getting errors when clicking the links, especially on mobile data and private WiFi networks.

## Root Causes Identified

### 1. Missing Production Redirect URLs in Supabase

The magic link redirect URL is dynamically constructed from the user's browser origin, but Supabase needs to whitelist these URLs. Without proper whitelisting, auth fails with `session_exchange_failed`.

### 2. IP-Based Rate Limiting (Mobile Data Networks)

When users access your site on **mobile data** (using their phone's carrier network like Verizon, AT&T, T-Mobile), mobile carriers use CGNAT (Carrier Grade NAT) where hundreds of users share the same public IP address. The default rate limits (30 requests per 5 min per IP) are too strict - if 30+ people on the same carrier try to sign in within 5 minutes, everyone else on that carrier gets blocked.

**Note:** This is NOT about SMS authentication - you only use email magic links. This is about users browsing your site on their phone using mobile data instead of WiFi.

### 3. Low Email Rate Limit

Only 2 magic link emails per hour per user meant users couldn't retry if they didn't receive the first email.

---

## Changes Made in This PR

### ✅ Code Changes

1. **Added middleware.ts** - Forces all traffic to `www.ridesharetahoe.com` in production
   - Ensures consistent redirect URLs for authentication
   - Prevents www vs non-www URL mismatches

2. **Improved error logging**:
   - Added detailed logging in `/app/api/auth/callback/route.ts`
   - Added redirect URL logging in `/app/login/page.tsx`
   - Logs now include origin, hostname, and partial code for debugging

**Note:** No changes to `supabase/config.toml` - rate limits must be changed in the Supabase Dashboard (see below).

---

## 🚨 REQUIRED: Supabase Dashboard Configuration

**CRITICAL**: You must update your Supabase production project settings for magic links to work correctly.

### Step 1: Go to Supabase Dashboard

1. Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/url-configuration
2. Or: Dashboard → Authentication → URL Configuration

### Step 2: Update Site URL

Set **Site URL** to:

```text
https://www.ridesharetahoe.com
```

### Step 3: Add Redirect URLs

Under **Redirect URLs**, add these exact URLs (one per line):

```text
https://www.ridesharetahoe.com/api/auth/callback
https://www.ridesharetahoe.com/**
```

The wildcard `**` pattern allows all paths under your domain.

### Step 4: Update Rate Limits in Dashboard

**CRITICAL**: Rate limits must be changed in the Supabase Dashboard (the screenshot you provided). The local `config.toml` file does NOT affect production.

Go to: **Dashboard → Settings → Auth Rate Limits** (or similar - varies by Supabase plan)

**Recommended changes based on your screenshot:**

1. **Rate limit for token verifications** (Magic link verifications):
   - Current: `30` requests/5 min per IP → **Increase to `100-150`**
   - Why: Mobile users on carrier networks (CGNAT) share IPs with hundreds of other users

2. **Rate limit for sending emails**:
   - Current: `2` emails/h → **Increase to `5`**
   - Why: Allows users to retry if they don't receive the email

**Optional (if you see high traffic):**

3. **Rate limit for sign-ups and sign-ins** (not visible in your screenshot):
   - If it exists, increase from `30` to `100` requests/5 min per IP
   - Same reason: CGNAT shared IPs on mobile networks

---

## Testing the Fixes

### Before Deploying:

1. **Test locally** with the new middleware:

   ```bash
   npm run dev
   ```

2. **Test magic link flow**:
   - Request magic link
   - Check browser console for redirect URL logs
   - Click link in email
   - Verify successful auth

### After Deploying to Production:

1. **Verify redirect** - Visit `https://ridesharetahoe.com` and confirm it redirects to `https://www.ridesharetahoe.com`

2. **Test magic link** from different networks:
   - Mobile data (different carriers)
   - Private WiFi
   - Public WiFi
   - VPN

3. **Check logs** in Vercel/deployment platform:
   - Look for "Sending magic link" logs with redirect URLs
   - Look for "Session exchange error" logs if failures occur
   - Verify all redirect URLs match what's whitelisted in Supabase

---

## Monitoring

After deployment, monitor for these specific errors in your logs:

- `session_exchange_failed` - Usually means redirect URL not whitelisted
- `no_session` - Usually means cookie issues or rate limiting
- `unexpected_error` - Catch-all for other issues

The enhanced logging will now show:

- Exact redirect URLs being used
- Origin and hostname of requests
- Partial auth codes for debugging
- Whether session/user objects were created

---

## Additional Recommendations

### Short-term:

- Add user-facing error messages that explain what to do (e.g., "Try again in a few minutes" for rate limits)
- Consider adding a retry button on error pages

### Long-term:

- Implement OAuth (Google) as primary auth method
- Use magic links as fallback only
- Consider adding phone number OTP for users on problematic networks
- Set up alerting for auth failure rate spikes

---

## Rollback Plan

If issues occur after deployment:

1. **Quick fix**: Revert the middleware.ts file

   ```bash
   git revert <commit-hash>
   ```

2. **Supabase config**: No rate limit changes were made to config files - all rate limit updates must be done via Supabase Dashboard

3. **Full rollback**: Merge a revert PR
   ```bash
   git revert HEAD
   git push origin main
   ```
