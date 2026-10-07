/** @jest-environment node */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Deliberately uses only the named LOCAL Docker Postgres, never environment DB
// credentials. Migration and disposable fixtures are rolled back together.
it('materializes greatest login at ingestion, keeps legacy activity unknown, and rejects member spoofing', () => {
  const migration = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261008000001_login_activity.sql'),
    'utf8'
  );
  const writeRules = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261008000000_write_rules.sql'),
    'utf8'
  );
  const sql = String.raw`
    BEGIN;
    SELECT to_regprocedure('public.guard_booking_write()') IS NULL AS needs_rules \gset
    \if :needs_rules
    ${writeRules}
    \endif
    INSERT INTO auth.users (id) VALUES
      ('10000000-0000-4000-8000-000000000001'),
      ('10000000-0000-4000-8000-000000000002');
    INSERT INTO public.user_activity (user_id, event, at)
      VALUES ('10000000-0000-4000-8000-000000000002', 'login', '2025-01-01');
    SELECT to_regclass('public.user_latest_login') IS NULL AS needs_login \gset
    \if :needs_login
    ${migration}
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM public.user_latest_login WHERE user_id = '10000000-0000-4000-8000-000000000002') THEN
        RAISE EXCEPTION 'Legacy login must remain unknown';
      END IF;
    END $$;
    \endif
    SET LOCAL ROLE service_role;
    INSERT INTO public.user_activity (user_id, event, at) VALUES
      ('10000000-0000-4000-8000-000000000001', 'login', '2026-10-01'),
      ('10000000-0000-4000-8000-000000000001', 'login', '2026-10-19'),
      ('10000000-0000-4000-8000-000000000001', 'login', '2026-10-03'),
      ('10000000-0000-4000-8000-000000000001', 'message', '2026-10-20');
    DO $$ BEGIN
      IF (SELECT last_login_at FROM public.user_latest_login WHERE user_id = '10000000-0000-4000-8000-000000000001')
          IS DISTINCT FROM '2026-10-19'::timestamptz THEN
        RAISE EXCEPTION 'Out-of-order ingestion lost latest login';
      END IF;
    END $$;
    RESET ROLE;
    SET LOCAL ROLE authenticated;
    DO $$ BEGIN
      BEGIN
        INSERT INTO public.user_activity (user_id, event, at) VALUES
          ('10000000-0000-4000-8000-000000000001', 'login', '2000-01-01');
        RAISE EXCEPTION 'Member spoofed ingestion';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
      BEGIN
        UPDATE public.user_latest_login SET last_login_at = '2000-01-01';
        RAISE EXCEPTION 'Member spoofed materialized login';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
      BEGIN
        PERFORM * FROM public.user_latest_login;
        RAISE EXCEPTION 'Member read privileged lookup';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
      IF has_function_privilege('authenticated', 'public.materialize_latest_login()', 'EXECUTE') OR
         has_function_privilege('anon', 'public.materialize_latest_login()', 'EXECUTE') THEN
        RAISE EXCEPTION 'Member can execute privileged function';
      END IF;
    END $$;
    RESET ROLE;
    ROLLBACK;
  `;
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      'supabase_db_RideShareTahoe',
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { input: sql, encoding: 'utf8', timeout: 30000 }
  );
}, 40000);
