#!/usr/bin/env bash
set -euo pipefail

# Instructions only: do not print credentials or enable production jobs.
BASE_URL=${BASE_URL:-https://ridesharetahoe.com}
cat <<EOF
Account deletion scheduler setup (requires owner approval before enabling):

1. Configure a strong CRON_SECRET_TOKEN in the application and scheduler.
2. Schedule daily at 02:00 in your chosen scheduler timezone:
   POST $BASE_URL/api/cron/process-deletions
   Authorization: Bearer \$CRON_SECRET_TOKEN
   GET is also supported for providers that require it. Both methods PROCESS
   deletion requests; neither is a read-only health/status endpoint.
3. For Vercel Cron, configure its CRON_SECRET to the same value as the app's
   CRON_SECRET_TOKEN. Do not assume Vercel reads the custom variable name.
4. Read pending/processing requests via the authenticated admin-only endpoint:
   GET $BASE_URL/api/admin/process-deletions

No cron has been installed and no endpoint has been invoked by this script.
EOF
