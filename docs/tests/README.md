# Testing Messages: Quick Summary

## ✅ What I've Created

I've set up a complete integration testing suite for your messaging system with **three different approaches**:

### 1. **Manual Testing** (Recommended to start)

- Create two users in your browser
- Send messages back and forth
- Verify everything works visually
- **No setup required!**

### 2. **Simple Integration Test** (Easiest automated test)

- Uses existing test users
- Tests via API endpoints
- Requires minimal setup

### 3. **Full Integration Test** (Most comprehensive)

- Creates users automatically
- Tests database directly
- Requires Supabase environment variables

---

## 🚀 Recommended: Start with Manual Testing

**This is the fastest way to verify messaging works:**

1. Open `http://localhost:3000` in your browser
2. Sign up as Alice (`alice@test.com`)
3. Sign out and sign up as Bob (`bob@test.com`)
4. Sign in as Alice, go to Community, find Bob, click "Message"
5. Send a message: "Hello Bob! Want to share a ride?"
6. Sign out, sign in as Bob, go to Messages
7. You should see Alice's message
8. Reply: "Hi Alice! Yes, I'd love to!"
9. Sign out, sign in as Alice, go to Messages
10. You should see both messages

✅ **If you can see both messages, messaging is working!**

---

## 🧪 Next Step: Automated Tests

Once manual testing works, you can set up automated tests:

### Option A: Simple Integration Test

**Setup:**

1. Create two test users manually (use the manual testing steps above)
2. Create `.env.test.local`:
   ```env
   TEST_USER_A_EMAIL=alice@test.com
   TEST_USER_A_PASSWORD=TestPassword123!
   TEST_USER_B_EMAIL=bob@test.com
   TEST_USER_B_PASSWORD=TestPassword123!
   RUN_INTEGRATION_TESTS=true
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

**Run:**

```powershell
$env:RUN_INTEGRATION_TESTS="true"; npm test -- messages-simple.integration.test.ts
```

### Option B: Full Integration Test (requires Supabase setup)

**Setup:**

1. Start local Supabase: `npx supabase start`
2. Get your keys: `npx supabase status`
3. Create `.env.test.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<from supabase status>
   RUN_INTEGRATION_TESTS=true
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

**Run:**

```powershell
$env:RUN_INTEGRATION_TESTS="true"; npm test -- route.integration.test.ts
```

> ⚠️ These are **full integration tests** that create users/rides/messages via Supabase. They reach the network and can exceed Jest's default 5s per test, so the suite now increases the timeout to 30s when `RUN_INTEGRATION_TESTS=true`. Make sure your local Supabase instance is running and responding before executing this command.

---

## 📁 Files Created

All documentation and test files are ready:

- **[TESTING_QUICK_START.md](file:///d:/Projects/Repos/tgenz1213/RideShareTahoe/docs/tests/TESTING_QUICK_START.md)** - Step-by-step manual testing guide
- **[INTEGRATION_TESTING.md](file:///d:/Projects/Repos/tgenz1213/RideShareTahoe/docs/tests/INTEGRATION_TESTING.md)** - Comprehensive automated testing guide
- **[route.integration.test.ts](file:///d:/Projects/Repos/tgenz1213/RideShareTahoe/app/api/messages/route.integration.test.ts)** - Full integration test (creates users)
- **[messages-simple.integration.test.ts](file:///d:/Projects/Repos/tgenz1213/RideShareTahoe/app/api/messages/messages-simple.integration.test.ts)** - Simple integration test (uses existing users)
- **[setup-test-users.ts](file:///d:/Projects/Repos/tgenz1213/RideShareTahoe/scripts/setup-test-users.ts)** - Helper script to create test users

---

## ⚠️ Important: PowerShell vs Bash

Since you're using **PowerShell on Windows**, use these commands:

**Set environment variable:**

```powershell
$env:RUN_INTEGRATION_TESTS="true"
```

**Run tests:**

```powershell
$env:RUN_INTEGRATION_TESTS="true"; npm test -- <test-file>
```

**NOT this (Bash syntax):**

```bash
RUN_INTEGRATION_TESTS=true npm test  # ❌ Won't work in PowerShell
```

---

## 🎯 What Gets Tested

The integration tests verify:

✅ User A can send a message to User B  
✅ User B can see the message  
✅ User B can reply  
✅ User A can see the reply  
✅ Messages appear in chronological order  
✅ Conversations are created automatically  
✅ Unauthenticated users cannot send messages  
✅ Users can only see their own conversations  
✅ RLS policies prevent unauthorized access

---

## 🐛 Troubleshooting

### "supabaseKey is required" error

- You need to set up `.env.test.local` with Supabase credentials
- Or use the simple integration test which doesn't need this

### "RUN_INTEGRATION_TESTS is not recognized"

- You're using Bash syntax in PowerShell
- Use: `$env:RUN_INTEGRATION_TESTS="true"` instead

### Tests are skipped

- Make sure `RUN_INTEGRATION_TESTS=true` is in `.env.test.local`
- Or set it in PowerShell: `$env:RUN_INTEGRATION_TESTS="true"`

### Tests time out

- If you see `Exceeded timeout of 5000 ms` when running the full suites, confirm your local Supabase instance is up (`npx supabase start`) and reachable at the URL/key in `.env.test.local`.
- The Jest setup now bumps the timeout to 30 seconds whenever `RUN_INTEGRATION_TESTS=true`, so a test still hanging usually means Supabase is unreachable rather than Jest being too strict.

### Why unit tests don't run integration files

- The main `npm test` command ignores `*.integration.test.*`, so the networking-heavy suites are only exercised via `npm run test:integration` when you explicitly enable `RUN_INTEGRATION_TESTS`. That keeps pull request checks fast while still letting you run the full Supabase-backed flow when needed.

---

## 📚 Full Documentation

For complete details, see:

- [TESTING_QUICK_START.md](file:///d:/Projects/Repos/tgenz1213/RideShareTahoe/docs/tests/TESTING_QUICK_START.md) - Quick reference guide
- [INTEGRATION_TESTING.md](file:///d:/Projects/Repos/tgenz1213/RideShareTahoe/docs/tests/INTEGRATION_TESTING.md) - Detailed testing guide

---

## 💡 My Recommendation

**Start here:**

1. Do the manual testing first (5 minutes)
2. If that works, your messaging system is functional!
3. Then set up automated tests for CI/CD later

The manual test will immediately show you if messaging works, and you can see exactly what users will experience.
