# Integration Testing Guide

This guide explains how to run integration tests for the RideTahoe messaging system.

## Overview

The integration tests verify the complete messaging flow between two users:

1. **User Creation**: Creates two test users (Alice and Bob)
2. **Message Sending**: User A sends a message to User B
3. **Message Receiving**: User B receives and reads the message
4. **Reply Flow**: User B replies to User A
5. **Conversation Verification**: User A sees the reply
6. **Security Testing**: Verifies RLS (Row Level Security) policies
7. **API Testing**: Tests the `/api/messages` endpoints

## Prerequisites

### 1. Running Supabase Instance

You need a running Supabase instance. You can use either:

**Option A: Local Supabase (Recommended for Testing)**

```bash
# Start Supabase locally
npx supabase start
```

**Option B: Remote Supabase**

- Use your staging or development Supabase project
- **DO NOT run integration tests against production!**

### 2. Environment Variables

Create a `.env.test.local` file with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App URL (for API endpoint testing)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Enable integration tests
RUN_INTEGRATION_TESTS=true
```

**Note**: When using local Supabase, you can find these keys by running:

```bash
npx supabase status
```

### 3. Database Schema

Ensure your database has the latest migrations applied:

```bash
# For local Supabase
npx supabase db reset

# For remote Supabase
npx supabase db push
```

## Running the Tests

### Run All Integration Tests

The easiest way to run all integration tests is using the npm script:

```bash
npm run test:integration
```

This script automatically sets `RUN_INTEGRATION_TESTS=true` and runs all files ending in `.integration.test.ts` using `cross-env` for cross-platform compatibility.

### Manual Execution (Alternative)

If you need to run specific files manually:

**PowerShell (Windows):**

```powershell
$env:RUN_INTEGRATION_TESTS="true"; npm test -- route.integration.test.ts
```

**Bash/Zsh (Mac/Linux):**

```bash
RUN_INTEGRATION_TESTS=true npm test -- route.integration.test.ts
```

## Test Structure

The integration test file is organized into several sections:

### 1. Setup: Create Test Users

- Creates User A (Alice) with a profile
- Creates User B (Bob) with a profile
- Verifies profiles are auto-created via database trigger

### 2. Messaging Flow

- **Test 1**: User A sends a message to User B
  - Verifies message creation
  - Verifies conversation creation
- **Test 2**: User B sees the message from User A
  - Verifies User B can fetch conversations
  - Verifies User B can see the message
- **Test 3**: User B replies to User A
  - Verifies reply message creation
  - Verifies message is linked to the same conversation
- **Test 4**: User A sees the reply from User B
  - Verifies User A can see both messages in order

### 3. Review Flow

- **Test 1**: Passenger reviews Driver
  - Creates a Ride (Driver) and Completed Meeting (Passenger -> Driver)
  - Passenger submits a review
  - Verifies review creation with correct rating and roles
- **Test 2**: Fetch Reviews
  - Verifies reviews can be fetched for the Driver

### 3. RLS (Row Level Security) Verification

- **Test 1**: Verifies User A can only see their own messages
- **Test 2**: Verifies unauthenticated users cannot access messages

### 4. API Endpoint Testing

- **Test 1**: Tests `POST /api/messages` endpoint
- **Test 2**: Tests `GET /api/messages` endpoint

## Cleanup

The test automatically cleans up after itself:

- Deletes test messages
- Deletes test conversations
- Deletes test profiles
- Deletes test auth users

This happens in the `afterAll` hook, ensuring no test data remains in your database.

## Troubleshooting

### Tests are Skipped

If you see "0 tests" or all tests are skipped, ensure:

1. `RUN_INTEGRATION_TESTS=true` is set in your environment
2. The environment variable is being read correctly

**PowerShell (Windows):**

```powershell
echo $env:RUN_INTEGRATION_TESTS
```

**CMD (Windows):**

```cmd
echo %RUN_INTEGRATION_TESTS%
```

**Bash/Zsh (Mac/Linux):**

```bash
echo $RUN_INTEGRATION_TESTS
```

### Connection Errors

If you get connection errors:

1. Verify Supabase is running: `npx supabase status`
2. Check your `NEXT_PUBLIC_SUPABASE_URL` matches the status output
3. Ensure your firewall allows connections to port 54321

### Authentication Errors

If you get authentication errors:

1. Verify your `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is correct
2. For admin operations, ensure `SUPABASE_SERVICE_ROLE_KEY` is set
3. Check that email confirmation is disabled for local testing:
   ```bash
   # In supabase/config.toml
   [auth]
   enable_signup = true
   enable_confirmations = false
   ```

### RLS Policy Errors

If messages aren't being created or fetched:

1. Verify RLS policies are enabled: Check the migration file
2. Ensure the policies allow the operations being tested
3. Check that the user IDs match in the policies

### API Endpoint Errors

### API Endpoint Errors

If API endpoint tests fail:

1. Ensure your Next.js dev server is running: `npm run dev`
2. Verify `NEXT_PUBLIC_APP_URL` points to your running server (default: http://localhost:3000)
3. The tests will automatically skip API checks if the server is not reachable.

### Database Connection Issues

If you encounter "Database error saving new user" or connectivity issues:

1. Run the diagnostic script:
   ```bash
   npx tsx scripts/test-db-connection.ts
   ```
   This verifies your local Supabase connection and database triggers independent of the test environment.

## Best Practices

1. **Always use local Supabase for integration tests** to avoid affecting real data
2. **Run integration tests before deploying** to catch issues early
3. **Keep test data isolated** - use unique email domains like `@ridetahoe-test.local`
4. **Monitor test execution time** - integration tests are slower than unit tests
5. **Run in CI/CD** - add to your GitHub Actions or other CI pipeline

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1

      - name: Start Supabase
        run: npx supabase start

      - name: Run integration tests
        run: RUN_INTEGRATION_TESTS=true npm test -- route.integration.test.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}
          NEXT_PUBLIC_APP_URL: http://localhost:3000

      - name: Stop Supabase
        run: npx supabase stop
```

## Additional Resources

- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/local-development#testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)

## Questions?

If you encounter issues not covered in this guide, please:

1. Check the Supabase logs: `npx supabase logs`
2. Review the test output for specific error messages
3. Consult the RideTahoe development team
