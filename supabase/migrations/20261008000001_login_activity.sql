-- No backfill: legacy activity was recorded only for the first welcome email,
-- so an old legacy login is NOT evidence of current inactivity.
CREATE TABLE public.user_latest_login (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_login_at timestamptz NOT NULL
);
CREATE INDEX user_latest_login_at ON public.user_latest_login (last_login_at, user_id);
ALTER TABLE public.user_latest_login ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_latest_login FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_latest_login TO service_role;

-- user_activity ingestion is server-only (20261008000000_write_rules).
-- Atomic greatest semantics preserve recent activity on out-of-order inserts.
CREATE FUNCTION public.materialize_latest_login()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.event = 'login' AND NEW.at IS NOT NULL THEN
    INSERT INTO public.user_latest_login (user_id, last_login_at)
    VALUES (NEW.user_id, NEW.at)
    ON CONFLICT (user_id) DO UPDATE
      SET last_login_at = greatest(public.user_latest_login.last_login_at, EXCLUDED.last_login_at);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.materialize_latest_login() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER materialize_latest_login AFTER INSERT ON public.user_activity
FOR EACH ROW EXECUTE FUNCTION public.materialize_latest_login();
