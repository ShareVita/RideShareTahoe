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
   - Optional `RESEND_API_KEY` for sending emails
   - Optional `CRON_SECRET_TOKEN` for the deletion cron job (`scripts/setup-deletion-cron.sh` explains how to use this)

4. **Open the app**

   Visit `http://localhost:3000` once `npm run dev` reports the server is ready.

## Environment variables

- The template lives in `.env.example`; it documents the required Supabase/Resend keys and sets `NODE_ENV=development` by default.
- `scripts/populate-env-keys.ps1` / `scripts/populate-env-keys.sh` are invoked by the Taskfile to refresh Supabase publishable and service keys when the local stack starts.
- Optional placeholders for Stripe/OpenAI remain commented for historical reference, but we rely solely on Supabase and Resend for now.

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

CI validates changes without writing the production database. Production migration application is an explicit **CI Pipeline** workflow dispatch with `apply_migrations` enabled, after tests, integration tests, and the build pass. Configure the GitHub `production` environment with required reviewers. Review `supabase db push --dry-run` before dispatch; do not use `--include-all` to bypass migration-history disagreements.

For database security verification when full Supabase cannot run, `scripts/test-horizontal-security.sh` replays migrations and runs real PostgreSQL RLS/trigger regression checks in a new disposable native database. It is not a substitute for Supabase authentication or browser end-to-end checks.

## Cron job helper

- `scripts/setup-deletion-cron.sh` guides you through configuring the `CRON_SECRET_TOKEN` and adding the secure endpoint to your scheduler (cron, GitHub Actions, Vercel Cron, etc.).

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
