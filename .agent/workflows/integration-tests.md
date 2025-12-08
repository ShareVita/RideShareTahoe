---
description: How to run integration tests in CI
---

# Running Integration Tests in CI

To run the integration tests in a CI environment (like GitHub Actions), you need to ensure the Supabase instance is running and the environment variables are set.

## Prerequisites

1.  **Supabase CLI**: The CI runner must have the Supabase CLI installed.
2.  **Supabase Instance**: You must start a local Supabase instance or connect to a staging instance.

## Steps

1.  **Install Dependencies**:

    ```bash
    npm ci
    ```

2.  **Start Supabase (if using local)**:

    ```bash
    npx supabase start -x studio,migra,deno-relay,pgadmin-schema-diff,imgproxy
    ```

    _Note: Excluding unnecessary services speeds up startup._

3.  **Set Environment Variables**:
    You must set `RUN_INTEGRATION_TESTS=true`.
    You also need the Supabase URL and Keys.

    ```bash
    export RUN_INTEGRATION_TESTS=true
    export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
    export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<your-publishable-key>"
    export SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
    ```

    _Tip: You can get the keys from `npx supabase status` output._

4.  **Run Tests**:
    ```bash
    npm test -- route.integration.test.ts
    ```

## GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Setup Supabase
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Start Supabase
        run: supabase start -x studio,migra,deno-relay,pgadmin-schema-diff,imgproxy

      - name: Run Integration Tests
        run: |
          # Get keys and export them
          eval $(supabase status -o env)

          # Run the test
          RUN_INTEGRATION_TESTS=true npm test -- route.integration.test.ts
```
