#!/usr/bin/env bash
set -euo pipefail
# Native fallback when Docker/Supabase cannot run. Debian setup:
# sudo apt-get update && sudo apt-get install -y postgresql
# sudo pg_ctlcluster 15 main start
# sudo -u postgres bash scripts/test-horizontal-security.sh
# Uses the local Unix socket only; refuses to reuse an existing database.
# Keep the database for schema inspection; remove it manually when finished.
export PGHOST=/var/run/postgresql PGPORT=5432 PGUSER=postgres PGDATABASE=horizontal_security_test
createdb "$PGDATABASE"
psql -X -v ON_ERROR_STOP=1 -f supabase/tests/native-bootstrap.sql
for migration in supabase/migrations/*.sql; do
  # Seed a legacy raw-coordinate row immediately before the privacy backfill.
  if [[ "$migration" == *20261006000000_horizontal_security.sql ]]; then
    psql -X -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO auth.users (id,email,raw_user_meta_data)
  VALUES ('11111111-1111-4111-8111-111111111111','legacy@example.test','{}');
UPDATE public.profiles SET display_lat=39.123456, display_lng=-120.987654,
  display_lat_offset=39.123456, display_lng_offset=-120.987654
  WHERE id='11111111-1111-4111-8111-111111111111';
SQL
  fi
  psql -X -v ON_ERROR_STOP=1 -f "$migration"
done
psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles
    WHERE id='11111111-1111-4111-8111-111111111111'
    AND display_lat=39.12 AND display_lng=-120.99
    AND display_lat_offset IS NULL AND display_lng_offset IS NULL)
  THEN RAISE EXCEPTION 'FAIL legacy coordinate backfill'; END IF;
  RAISE NOTICE 'PASS legacy coordinate backfill';
END $$;
SQL
psql -X -v ON_ERROR_STOP=1 -f supabase/tests/horizontal_security.sql
echo 'PASS native PostgreSQL migrations and horizontal security regression'
