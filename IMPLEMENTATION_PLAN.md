# Implementation Plan - Bot Hardening Optimizations

**Goal:** Fix critical P0 + P1 issues while maintaining stability
**Estimated Time:** 1.5 hours
**Risk Level:** MEDIUM (touching core middleware)

---

## 🎯 Fixes to Implement

### P0-1: Fix Supabase Session Refresh Bypass ⚠️

**Current Code:**

```typescript
if (isAuthRoute || isStaticAsset) {
  const response = NextResponse.next({ request });
  return response; // ❌ Skips session refresh
}
```

**Proposed Fix:**

```typescript
if (isStaticAsset) {
  // Static assets don't need any processing
  return NextResponse.next({ request });
}

if (isAuthRoute) {
  // Auth routes: Skip bot/rate limit, but DO refresh session
  let response = NextResponse.next({ request });

  const supabase = createServerClient(/* ... */);
  await supabase.auth.getSession(); // ✅ Refresh session cookies

  return response;
}

// Continue with bot detection and rate limiting for all other routes
```

**⚠️ CONCERN:**

- Do we actually need session refresh on `/api/auth/callback`?
- That route is **creating** a new session, not refreshing
- But other auth routes might need it

**DECISION NEEDED:**

- **Option A:** Refresh session on ALL auth routes (safest, adds 10ms latency)
- **Option B:** Only refresh on non-callback auth routes (complex, might miss edge cases)
- **Option C:** Skip refresh entirely for auth routes, let routes handle it themselves (risky)

**RECOMMENDATION:** Option A (safest)

**Potential Breakage:** LOW - This should make things MORE reliable, not less

---

### P0-2: Fix Rate Limit Bypass via Route Switching 🚨

**Current Code:**

```typescript
const rateLimitResult = await checkRateLimit(`${ip}:${pathname}`, limit, windowMs);
```

**Proposed Fix - Approach 1: Dual Limits**

```typescript
// Global limit: 200 req/min across ALL API routes
const globalKey = `${ip}:api:global`;
const globalLimit = await checkRateLimit(globalKey, 200, windowMs);

if (!globalLimit.allowed) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
}

// Per-route limit: 100 req/min per route (existing)
const routeKey = `${ip}:${pathname}`;
const routeLimit = await checkRateLimit(routeKey, 100, windowMs);

if (!routeLimit.allowed) {
  return NextResponse.json({ error: 'Too many requests to this route' }, { status: 429 });
}
```

**⚠️ CONCERNS:**

- Doubles rate limit checks = 2x latency (~30ms → ~60ms with Upstash)
- More complex logic
- Global limit might be too restrictive for legitimate users

**Proposed Fix - Approach 2: Global Only**

```typescript
// Simpler: Just use global API limit
const globalKey = isPublicRoute ? `${ip}:public` : `${ip}:api`;
const limit = isPublicRoute ? 30 : 200; // 200/min across ALL API routes

const rateLimitResult = await checkRateLimit(globalKey, limit, windowMs);
```

**⚠️ CONCERNS:**

- Legitimate users might hit 200 req/min if they're using the app heavily
- No per-route granularity

**Proposed Fix - Approach 3: Smart Aggregation (RECOMMENDED)**

```typescript
// Use route groups instead of individual routes
function getRouteGroup(pathname: string): string {
  if (pathname.startsWith('/api/community/')) return 'community';
  if (pathname.startsWith('/api/reviews/')) return 'reviews';
  if (pathname.startsWith('/api/trips/')) return 'trips';
  if (pathname.startsWith('/api/messages')) return 'messages';
  if (pathname.startsWith('/api/matches')) return 'matches';
  return 'other';
}

const routeGroup = getRouteGroup(pathname);
const rateLimitKey = `${ip}:api:${routeGroup}`;

// Limits per group
const groupLimits = {
  community: 100, // Discovery/search
  reviews: 60,
  trips: 80,
  messages: 100,
  matches: 20, // Expensive distance calculations
  other: 100,
};

const limit = groupLimits[routeGroup] || 100;
```

**PROS:**

- Prevents bypass (bot can't hit 100 different routes)
- Still allows legitimate heavy usage within one feature area
- Single rate limit check (no extra latency)

**CONS:**

- More complex routing logic
- Might need adjustment after monitoring

**DECISION NEEDED:** Which approach?

**RECOMMENDATION:** Approach 3 (Smart Aggregation) - Best balance

**Potential Breakage:** LOW - More restrictive but still reasonable limits

---

### P1-3: Optimize Supabase Client Creation

**Current Code:**

```typescript
// Creates Supabase client on EVERY request
const supabase = createServerClient(/* ... */);
await supabase.auth.getSession();
```

**Proposed Fix:**

```typescript
// Skip Supabase for routes that don't need it
const needsSessionRefresh = !isStaticAsset && !pathname.startsWith('/api/cron/');

if (needsSessionRefresh) {
  const supabase = createServerClient(/* ... */);
  await supabase.auth.getSession();
}
```

**⚠️ CONCERN:**

- Original proxy.ts refreshed session on ALL routes for a reason
- Supabase SSR docs recommend refreshing on every request
- Skipping refresh could cause session expiration issues

**DECISION NEEDED:**

- **Option A:** Keep refreshing on all routes (safe, slower)
- **Option B:** Only refresh on HTML pages and API routes (risky, faster)

**RECOMMENDATION:** Option A for now, monitor performance

**Alternative Optimization:**

```typescript
// Move session refresh AFTER response is sent (background)
// Not possible in middleware - would need edge function
```

**Potential Breakage:** MEDIUM - Could cause session issues if we skip too aggressively

**SHOULD WE SKIP THIS FIX?** YES - Too risky, minimal benefit

---

### P1-4: Fix Overly Broad Bot Detection

**Current Code:**

```typescript
/bot/i,      // ❌ TOO BROAD
/crawler/i,  // ❌ TOO BROAD
/spider/i,   // ❌ TOO BROAD
```

**Proposed Fix:**

```typescript
// Remove overly broad patterns
const BLOCKED_USER_AGENTS = [
  // Specific scrapers
  /scrapy/i,
  /python-requests/i,
  /curl/i,
  /wget/i,
  /ahrefs/i,
  /semrush/i,

  // Specific known bad bots
  /mj12bot/i,
  /dotbot/i,
  /rogerbot/i,
  /exabot/i,
  /facebot/i,
  /ia_archiver/i,

  // HTTP libraries
  /axios/i,
  /node-fetch/i,
  /got/i,

  // ✅ REMOVED: /bot/i, /crawler/i, /spider/i
];
```

**Potential Breakage:** LOW - Might allow some bots through, but won't block legitimate users

**SAFE TO PROCEED:** YES

---

### P1-5: Add Origin Validation for POST/PUT

**Proposed Fix:**

```typescript
// Validate origin for mutating requests
if (isApiRoute && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || '',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Add Vercel preview URLs pattern
  ];

  // Only validate if origin header is present
  // (some clients like mobile apps might not send it)
  if (origin && !allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
    console.warn('[MIDDLEWARE] Blocked request from invalid origin', {
      origin,
      path: pathname,
      method: request.method,
    });

    return NextResponse.json(
      { error: 'Invalid origin' },
      { status: 403, headers: { 'X-Blocked-Reason': 'invalid-origin' } }
    );
  }
}
```

**⚠️ CONCERNS:**

- Could break mobile apps or API clients that don't send origin header
- Vercel preview URLs are dynamic (e.g., `your-app-git-branch-user.vercel.app`)
- Need to handle preview URLs properly

**SAFER APPROACH:**

```typescript
// Only block if origin is present AND suspicious
// Don't block if origin is missing (might be mobile app)
if (origin) {
  const isVercelPreview = origin.includes('.vercel.app');
  const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
  const isProduction = origin === process.env.NEXT_PUBLIC_APP_URL;

  if (!isVercelPreview && !isLocalhost && !isProduction) {
    // Block
  }
}
```

**Potential Breakage:** MEDIUM - Could break legitimate API usage

**SHOULD WE SKIP THIS FIX?** MAYBE - Need to test thoroughly

---

## 🎯 REVISED IMPLEMENTATION PLAN

Based on risk analysis, here's what we SHOULD implement:

### Phase 1: Safe Optimizations (LOW RISK)

1. ✅ **P1-4: Fix bot detection patterns** (remove /bot/i, /crawler/i, /spider/i)
2. ✅ **P0-1: Fix Supabase session refresh** (Option A: refresh on all auth routes)

### Phase 2: Rate Limit Fix (MEDIUM RISK)

3. ✅ **P0-2: Fix rate limit bypass** (Approach 3: Smart route grouping)

### Phase 3: Skip for Now (HIGH RISK)

4. ❌ **P1-3: Optimize Supabase client** - SKIP (too risky, minimal benefit)
5. ❌ **P1-5: Add origin validation** - SKIP (needs testing, could break mobile)

---

## 🛡️ SAFEGUARDS

### 1. Feature Flags

```typescript
// Add env var to control new rate limiting
const USE_GROUPED_RATE_LIMITS = process.env.USE_GROUPED_RATE_LIMITS === 'true';

if (USE_GROUPED_RATE_LIMITS) {
  // New grouped logic
} else {
  // Old per-route logic
}
```

### 2. Gradual Rollout

```typescript
// Only apply to X% of requests
const shouldUseNewLogic = Math.random() < 0.5; // 50% of requests
```

### 3. Comprehensive Logging

```typescript
// Log when switching from old to new behavior
console.log('[MIDDLEWARE] Using grouped rate limits', {
  routeGroup,
  limit,
  oldKey: `${ip}:${pathname}`,
  newKey: `${ip}:api:${routeGroup}`,
});
```

---

## 📊 FINAL RECOMMENDATION

**Implement:** P1-4, P0-1, P0-2 (3 fixes)
**Skip:** P1-3, P1-5 (2 fixes - too risky)

**Changes:**

1. Fix bot detection (remove broad patterns) ✅ LOW RISK
2. Fix Supabase session refresh for auth routes ✅ LOW RISK
3. Implement smart rate limit grouping ⚠️ MEDIUM RISK (add feature flag)

**Total Estimated Time:** 45 minutes (down from 1.5 hours)

**Testing Required:**

- Local testing with curl
- Preview deploy testing
- Monitor for 24 hours before promoting

---

## ❓ QUESTIONS FOR YOU

1. **Rate limit approach:** Do you want Approach 3 (Smart Grouping) or Approach 2 (Global Only)?
2. **Feature flag:** Should we add `USE_GROUPED_RATE_LIMITS` env var for gradual rollout?
3. **Supabase optimization:** Skip it entirely, or implement with caution?
4. **Origin validation:** Skip for now, or implement with lenient checks?

---

## 🚀 READY TO PROCEED?

If you approve this revised plan, I'll implement:

- ✅ Fix bot detection patterns
- ✅ Fix Supabase session refresh
- ✅ Implement smart rate limit grouping (with feature flag)

**Estimated time:** 45 minutes
**Risk level:** LOW-MEDIUM (with feature flag safeguard)

**Your call - proceed with revised plan?**
