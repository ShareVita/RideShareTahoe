#!/usr/bin/env bash
set -euo pipefail

# Instructions only: do not print credentials or enable production jobs.
# Use www: the apex domain redirects, and clients drop Authorization on a
# cross-host redirect, so the scheduler would get 401.
BASE_URL=${BASE_URL:-https://www.ridesharetahoe.com}
cat <<EOF
Account deletion scheduler setup (requires owner approval before enabling):

1. Configure a strong CRON_SECRET_TOKEN in the application and scheduler.
2. Schedule daily at 02:00 in your chosen scheduler timezone:
   POST $BASE_URL/api/cron/process-deletions
   Authorization: Bearer \$CRON_SECRET_TOKEN
   GET is also supported for providers that require it. Both methods PROCESS
   deletion requests; neither is a read-only health/status endpoint.
3. On Vercel, vercel.json already schedules this route. Vercel Cron sends
   CRON_SECRET, which the route accepts directly; set it in the project's
   Production environment. CRON_SECRET_TOKEN is for any other scheduler.
4. Read pending/processing requests via the authenticated admin-only endpoint:
   GET $BASE_URL/api/admin/process-deletions

No cron has been installed and no endpoint has been invoked by this script.
EOF
