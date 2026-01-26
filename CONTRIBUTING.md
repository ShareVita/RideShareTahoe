# CONTRIBUTING to RideShareTahoe 🐾

Thanks for contributing to **RideShareTahoe**! This document covers the expectations, workflow, and quality checks we follow so contributions stay reliable and secure.

## Development environment

- Follow the **Local development setup** steps in `README.md`, which rely on Node.js 22.x, `npm`, Docker Desktop, and the Taskfile workflow (`task dev`).
- The Taskfile scripts wire together `npx supabase start`, `.env.local` population, and `npm run dev`, so you can focus on building instead of wiring infrastructure.
- If your setup is not working, make sure you ran `task dev` at least once!

## Verification commands

Run these before opening a PR to keep CI green:

```bash
npm run lint
npm run test
npm run build
```

Apply new database migrations to your local database when migration files change:

```bash
npx supabase migration up
```

## Code standards & expectations

- **TypeScript-first:** All new logic should be typed without using `any` unless there is a strong, documented reason. Prefer interfaces, discriminated unions, and `Record` where appropriate.
- **Hooks & composition:** Use React hooks (`useMemo`, `useCallback`, custom hooks) to keep components modular. Avoid class components and deep prop drilling.
- **API routes:** Implement server logic with Next.js Route Handlers under `app/api/`.
- **Security:** Validate external inputs, avoid inline SQL, sanitize data before rendering, and document any assumptions in TSDoc.
- **Comments:** Use TSDoc-style comments for exported helpers and components. Only explain _why_ something exists, not _what_ it does if that's obvious.

## Workflow

1. **Branching**

- Never commit directly to `main`. Create descriptive branches (e.g., `feat/add-location-filter`).
- Keep your branch up to date with `main` to reduce merge conflicts.
- Use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) conventions for pull request titles.

2. **Committing**

- Make focused commits with clear intent, ideally one change per commit.
- Follow Conventional Commits for clarity (e.g., `fix: prevent null profile crash`).

3. **Pull requests**

- Target `main` and describe:
  - What changed
  - Why the change is needed (reference issues or goals)
  - How to test (include steps or screenshots when relevant)
- Wait for at least one maintainer review before merging.
- Testing the preview deployment before merge is encouraged.
- Production deployments are restricted to the repository owner after approval.

4. **Database Changes**

- All changes to the database must be captured in migration files (`npx supabase migration new <description_of_changes>`).
- Never use the dashboard to make changes to the database.

## Support resources

- `README.md` has the latest setup instructions, Taskfile workflow, and cron guidance (`scripts/setup-deletion-cron.sh`).
- Reach out to the maintainers for questions about policy, architecture, or credentials.
