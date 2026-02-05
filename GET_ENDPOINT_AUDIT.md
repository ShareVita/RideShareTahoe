# GET Endpoint Security Audit

**Last Updated:** 2026-02-05
**Purpose:** Identify all GET API endpoints and their bot protection status

---

## 🚨 Critical Vulnerabilities (FIXED)

| Route                | Auth Required   | Rate Limiting           | Caching            | DB Operations         | Status    | Notes                                    |
| -------------------- | --------------- | ----------------------- | ------------------ | --------------------- | --------- | ---------------------------------------- |
| `/api/reviews/stats` | ✅ NOW REQUIRED | ✅ Middleware (100/min) | ✅ 5min revalidate | 2 RPC calls + 1 query | **FIXED** | Was partially public - now requires auth |

---

## 📊 GET Endpoint Protection Matrix

### Community & Discovery Routes

| Route                          | Auth   | Rate Limit                   | Caching | DB Ops                     | Risk        | Recommendation                       |
| ------------------------------ | ------ | ---------------------------- | ------- | -------------------------- | ----------- | ------------------------------------ |
| `/api/community/events`        | ✅ Yes | ⚠️ Middleware only (100/min) | ❌ No   | Query events + profiles    | MEDIUM-HIGH | Consider `revalidate: 60`            |
| `/api/community/places`        | ✅ Yes | ⚠️ Middleware only (100/min) | ❌ No   | Query places + profiles    | MEDIUM-HIGH | Consider `revalidate: 60`            |
| `/api/community/profiles`      | ✅ Yes | ⚠️ Middleware only (100/min) | ❌ No   | Query profiles + filtering | MEDIUM-HIGH | Consider `revalidate: 30` for search |
| `/api/community/vehicles`      | ✅ Yes | ⚠️ Middleware only (100/min) | ❌ No   | Query vehicles             | MEDIUM      | OK (auth required)                   |
| `/api/community/vehicles/[id]` | ✅ Yes | ⚠️ Middleware only (100/min) | ❌ No   | Single vehicle query       | LOW         | OK (auth required)                   |

### Matching & Booking Routes

| Route                      | Auth   | Rate Limit                   | Caching | DB Ops                          | Risk   | Recommendation                             |
| -------------------------- | ------ | ---------------------------- | ------- | ------------------------------- | ------ | ------------------------------------------ |
| `/api/matches`             | ✅ Yes | ⚠️ Middleware only (100/min) | ❌ No   | Profile queries + distance calc | HIGH   | **Add route-specific rate limit (20/min)** |
| `/api/trips/bookings`      | ✅ Yes | ⚠️ Middleware only (100/min) | ❌ No   | Query bookings                  | MEDIUM | OK (auth required)                         |
| `/api/trips/bookings/[id]` | ✅ Yes | ⚠️ Middleware only (100/min) | ❌ No   | Single booking query            | LOW    | OK (auth required)                         |
| `/api/trips/invitations`   | ✅ Yes | ⚠️ Middleware only (100/min) | ❌ No   | Query invitations               | MEDIUM | OK (auth required)                         |

### Review Routes

| Route                  | Auth   | Rate Limit                   | Caching | DB Ops                   | Risk   | Recommendation            |
| ---------------------- | ------ | ---------------------------- | ------- | ------------------------ | ------ | ------------------------- |
| `/api/reviews`         | ✅ Yes | ⚠️ Middleware only (100/min) | ❌ No   | Query reviews + joins    | MEDIUM | Consider `revalidate: 60` |
| `/api/reviews/[id]`    | ✅ Yes | ⚠️ Middleware only (100/min) | ❌ No   | Single review query      | LOW    | OK (auth required)        |
| `/api/reviews/pending` | ✅ Yes | ⚠️ Middleware only (100/min) | ❌ No   | Query bookings + reviews | MEDIUM | OK (auth required)        |
| `/api/reviews/stats`   | ✅ Yes | ✅ Middleware (100/min)      | ✅ 5min | 2 RPCs + 1 query         | LOW    | ✅ FIXED & Cached         |

### Messaging Routes

| Route                 | Auth   | Rate Limit                   | Caching | DB Ops                    | Risk   | Recommendation                       |
| --------------------- | ------ | ---------------------------- | ------- | ------------------------- | ------ | ------------------------------------ |
| `/api/messages` (GET) | ✅ Yes | ⚠️ Middleware only (100/min) | ❌ No   | Query messages + profiles | MEDIUM | OK (auth + conversation_id required) |

### Profile Routes

| Route             | Auth   | Rate Limit                   | Caching | DB Ops                  | Risk | Recommendation                    |
| ----------------- | ------ | ---------------------------- | ------- | ----------------------- | ---- | --------------------------------- |
| `/api/profile/me` | ✅ Yes | ⚠️ Middleware only (100/min) | ❌ No   | Query profile + socials | LOW  | OK (personal data, auth required) |

### Admin Routes

| Route                          | Auth   | Rate Limit                  | Caching | DB Ops             | Risk   | Recommendation                 |
| ------------------------------ | ------ | --------------------------- | ------- | ------------------ | ------ | ------------------------------ |
| `/api/admin/email-events`      | ✅ Yes | ✅ strictRateLimit (10/min) | ❌ No   | Query email events | LOW    | ✅ Good protection             |
| `/api/admin/send-bulk-email`   | ✅ Yes | ✅ strictRateLimit (10/min) | ❌ No   | Send emails        | LOW    | ✅ Good protection             |
| `/api/admin/process-deletions` | ✅ Yes | ⚠️ Middleware only          | ❌ No   | Delete operations  | MEDIUM | Consider additional protection |

---

## 🛡️ Protection Summary

### Legend

- ✅ **Protected** - Has appropriate protection
- ⚠️ **Middleware Only** - Basic 100 req/min IP-based rate limiting
- ❌ **No** - Missing protection
- 🔧 **Needs Attention** - Requires additional hardening

### Risk Levels

- **HIGH** - Expensive operations (distance calc, complex queries), could cause significant load
- **MEDIUM-HIGH** - Public discovery/search endpoints, could be scraped
- **MEDIUM** - Authenticated queries with joins, moderate load
- **LOW** - Simple queries, auth required, low risk

---

## 🎯 Priority Actions

### Immediate (Before Merge)

1. ✅ **DONE:** Fixed `/api/reviews/stats` - Now requires auth + added caching

### High Priority (Next)

2. **Add route-specific rate limiting** to `/api/matches`:

   ```typescript
   import { checkSupabaseRateLimit } from '@/libs/rateLimit';

   // Limit expensive match searches to 20 per hour per user
   const rateLimitResult = await checkSupabaseRateLimit(supabase, user.id, 'matches:search', {
     maxRequests: 20,
     windowSeconds: 3600,
   });
   ```

### Medium Priority (Optional)

3. **Add caching** to public discovery routes:
   - `/api/community/events` - `export const revalidate = 60;`
   - `/api/community/places` - `export const revalidate = 60;`
   - `/api/community/profiles` - `export const revalidate = 30;`
   - `/api/reviews` - `export const revalidate = 60;`

4. **Monitor** these endpoints in production:
   - Track request counts per route
   - Alert on unusual spikes (>500 req/min)
   - Monitor database query performance

---

## 📈 Monitoring Queries

### Vercel Analytics

```bash
# Check function invocations by route
# Vercel Dashboard → Analytics → Functions
# Filter by: /api/community/*, /api/matches, /api/reviews/*
```

### Supabase Dashboard

```sql
-- Top queries by execution time
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%reviews%' OR query LIKE '%profiles%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## ✅ Testing Checklist

- [x] Verified `/api/reviews/stats` now requires auth
- [x] Confirmed caching headers set on `/api/reviews/stats`
- [ ] Test `/api/matches` under load (10+ concurrent requests)
- [ ] Monitor middleware rate limit hits in production logs
- [ ] Verify Upstash Redis rate limiting when env vars configured
- [ ] Check Vercel function invocation metrics after 24h

---

## 📚 References

- **Middleware Rate Limiting:** `middleware.ts` - 100 req/min per IP
- **Route Rate Limiting:** `libs/rateLimit.ts` - Supabase-backed, persistent
- **Upstash Rate Limiting:** `libs/middlewareRateLimit.ts` - When env vars set
- **Caching:** Next.js `revalidate` config + Cache-Control headers
