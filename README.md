# RideShareTahoe 🏔️

A community-driven rideshare platform connecting the Bay Area to Lake Tahoe.

## About

RideShareTahoe connects drivers and passengers traveling between the Bay Area and Lake Tahoe. Our mission is to reduce traffic, share costs, and build a community of outdoor enthusiasts. Whether you're driving up for a ski weekend or need a lift to the lake, RideShareTahoe helps you find trusted travel companions.

## Features

- � **Rideshare Matching** - Connect with drivers and passengers for trips to/from Tahoe
- 📍 **Smart Location Privacy** - Approximate locations keep your exact address safe
- 🔒 **Trust & Safety** - Verified profiles and community ratings
- � **Secure Messaging** - Chat with potential travel buddies without sharing personal info
- 🌲 **Community Focused** - Built for skiers, snowboarders, and Tahoe lovers

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React, Tailwind CSS with DaisyUI
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Infra:** Vercel (Next.js); production deployment requires repository-owner approval
- **Email:** Resend for magic links and transactional notifications

## Prerequisites

- Node.js 22.x
- npm 10+
- Git
- Taskfile CLI (`task`, install instructions at https://taskfile.dev/docs/installation)

## Local development setup (recommended)

1. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/RideShareTahoe.git
   cd RideShareTahoe
   ```

2. **Run the Taskfile dev workflow**

   ```bash
   task dev
   ```

   This performs:
   - `task setup:init` → installs dependencies and initializes Supabase (say `n` when asked about telemetry)
   - `task services:start` → boots the local Supabase services
   - `task setup:env` → copies `.env.example` to `.env.local`, populates Supabase keys via `scripts/populate-env-keys.{ps1,sh}`, and prints guidance for the required `RESEND_API_KEY`
   - `npm run dev` → launches the Next.js dev server

   `task dev` defers `task services:stop`, so Supabase stops automatically once you exit the session.

3. **Edit secrets**

   Update `.env.local` with:
   - Verify Supabase connection values (URL, publishable key, service role key)
   - `RESEND_API_KEY` for sending emails (optional locally)
   - `EMAIL_UNSUBSCRIBE_SECRET`: at least 32 random characters. It signs unsubscribe links, so rotating it invalidates every link in emails already sent (those pages report an invalid link). Rotate only if it leaks, and expect older emails' unsubscribe links to stop working; newer emails carry working links. **Required in production**: without it every marketing email and the unsubscribe page fail.
   - `CRON_SECRET` (Vercel Cron) or `CRON_SECRET_TOKEN` (any other scheduler) for the scheduled jobs; the `/api/cron` routes return 503 when neither is set

4. **Open the app**

   Visit `http://localhost:3000` once `npm run dev` reports the server is ready.

## Environment variables

- The template lives in `.env.example`; it documents the required Supabase/Resend keys and sets `NODE_ENV=development` by default.
- `scripts/populate-env-keys.ps1` / `scripts/populate-env-keys.sh` are invoked by the Taskfile to refresh Supabase publishable and service keys when the local stack starts.
- Production also needs `SUPABASE_SERVICE_ROLE_KEY` (the public ride board reads through it), `APP_URL=https://www.ridesharetahoe.com` and `NEXT_PUBLIC_APP_URL` (the base for links in emails).

## Helpful commands

- `task dev`: full setup, Supabase start, env generation, and `npm run dev`.
- `task setup:env`: ensure `.env.local` exists and remind you to add `RESEND_API_KEY`.
- `task setup:env:supabase:populate`: refresh Supabase keys from `npx supabase status -o env` (Windows uses PowerShell, macOS/Linux run the shell script).
- `task services:start` / `task services:stop`: manually control the local Supabase stack.
- `task db:reset`: reset the database if migrations are out of sync.
- `npm run lint`, `npm run test`, `npm run build`: validation tools the project runs in CI.
- `npm run preview`: build and serve the production Next.js output locally.
- `npm run db:types`: regenerate typed Supabase contracts from the local database after applying migrations. Never use production credentials for local development.

## Deployment and migrations

The live site's responses identify Vercel. The old Cloudflare commands referenced uninstalled adapters and have been removed; use the configured Vercel project for preview deployments and obtain owner approval before production deployment.

CI validates changes without writing the production database. `pr.yml` validates every pull request and the merge queue (its job names are the `main` ruleset's required checks). Production migration application is an explicit **CI Pipeline** workflow dispatch from `main` with `apply_migrations` enabled, after tests, integration tests, and the build pass. It runs in the `supabase-production` GitHub environment: add required reviewers to that environment (it is separate from the Vercel-managed `Production` environment). Review `supabase db push --dry-run` before dispatch; do not use `--include-all` to bypass migration-history disagreements.

Before dispatching the migration job for the October 2026 security migrations, run these read-only checks:

- `npx supabase migration list --linked`: production history must match `supabase/migrations` up to `20260109000001`.
- In the Supabase SQL editor, this must return no rows, or `20261006000001_lifecycle_constraints.sql` fails after the previous migration has already committed:

  ```sql
  SELECT user_id, count(*) FROM account_deletion_requests
  WHERE status IN ('pending', 'processing') GROUP BY user_id HAVING count(*) > 1;
  ```

- Before `20261008000000_write_rules.sql`, this must return no rows. Reconcile duplicate reviews explicitly; the unique index never silently deletes existing reviews:

  ```sql
  SELECT booking_id, reviewer_id, count(*) FROM reviews
  WHERE booking_id IS NOT NULL GROUP BY booking_id, reviewer_id HAVING count(*) > 1;
  ```

Deploy the application before applying these migrations: the public ride board on the current `main` reads tables these migrations close to anonymous visitors.

For database security verification when full Supabase cannot run, `scripts/test-horizontal-security.sh` replays migrations and runs real PostgreSQL RLS/trigger regression checks in a new disposable native database. It is not a substitute for Supabase authentication or browser end-to-end checks.

## Scheduled jobs

`vercel.json` schedules two Vercel Cron jobs (times are UTC):

| Route                                | Schedule    | Does                                                     |
| ------------------------------------ | ----------- | -------------------------------------------------------- |
| `/api/cron/process-deletions`        | daily 11:00 | Deletes accounts whose 30-day deletion window has passed |
| `/api/cron/process-scheduled-emails` | daily 16:00 | Sends due nurture and reminder emails                    |

Authentication is not activation. All deletion entry points additionally require
`ACCOUNT_DELETION_ENABLED=true`; scheduled email processing additionally requires
`SCHEDULED_EMAILS_ENABLED=true`; re-engagement processing independently requires
`REENGAGEMENT_EMAILS_ENABLED=true`. All default to disabled, even if an existing
scheduler secret is already configured. Leave these flags disabled during rollout.

Vercel's scheduled runs send `CRON_SECRET`. Deletion processing has two other entry points:

- the cron routes also accept `CRON_SECRET_TOKEN` (for schedulers other than Vercel);
- an admin can run deletion processing with `POST /api/admin/process-deletions`.

Until the reconciliation below is finished, leave **both** `CRON_SECRET` and `CRON_SECRET_TOKEN` unset and do not call the admin processing endpoint.

**Before enabling deletion processing by any of those paths**, reconcile every open deletion request by hand. Before this release, "cancel deletion" left the request `pending` and only moved its date later, so the first deletion run would delete members who believe they cancelled. No query can prove which rows those are, so this is a manual review, not a script.

1. Run this read-only report in the Supabase SQL editor (it changes nothing):

   ```sql
   SELECT r.id, r.user_id, p.first_name, p.last_name, r.status,
          r.created_at, r.updated_at, r.scheduled_deletion_date,
          r.updated_at > r.created_at + interval '5 seconds' AS changed_after_request,
          r.scheduled_deletion_date > r.created_at + interval '30 days 5 seconds' AS date_pushed_out
   FROM account_deletion_requests r
   LEFT JOIN profiles p ON p.id = r.user_id
   WHERE r.status IN ('pending', 'processing')
   ORDER BY r.created_at;
   ```

   `changed_after_request` or `date_pushed_out` being true suggests the member pressed the old cancel button. Neither is proof: a member who cancelled within seconds shows neither, and other edits can set `updated_at`.

2. Decide each `pending` row yourself (contact the member when unsure). Cancel the ones you confirm one id at a time, only while still `pending`:

   ```sql
   UPDATE account_deletion_requests SET status = 'cancelled'
   WHERE id = '<request id>' AND status = 'pending'
   RETURNING id;
   ```

   It must return exactly one row. If it returns none, the request changed state; re-run the report.

3. Treat every `processing` row separately. A worker may already be deleting the account, and marking the row cancelled does not stop that request. Establish that no worker or Auth deletion remains in flight, check whether the Auth account still exists, and reconcile the exact claim before changing its state. Do not assume a legacy processing row could never have had a worker. Do not enable processing while any processing row is unexplained.

4. Set `ACCOUNT_DELETION_ENABLED=true` only after reconciling all requests, confirming the account-deletion cascade policy, and verifying the deployed schema. Configure scheduler authorization separately. Set `SCHEDULED_EMAILS_ENABLED=true` only after reviewing the queued email backlog and validating unsubscribe links and delivery. Changing Vercel environment variables requires a deployment to take effect.

`/api/cron/process-reengage-emails` is deliberately **not** scheduled. Its indexed latest-login lookup now uses server-ingested, post-rollout evidence; missing legacy history means unknown, not inactive. Login activity recording is best-effort and does not block authentication. Before enabling `REENGAGEMENT_EMAILS_ENABLED`, verify ingestion reliability and the selected audience, and review opt-outs and recent successful-send history. `scripts/setup-deletion-cron.sh` prints instructions for schedulers other than Vercel.

## Verification checklist

```bash
npm run lint
task db:reset   # optional; useful before seeding or migrations
npm run test
```

## Contributing & support

Community contributions are welcome! Make sure the above setup works locally, run the verification commands, describe your changes in the PR, and request a review once automated checks pass.

## License

MIT License
