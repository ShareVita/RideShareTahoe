-- Run only against a disposable local database after applying migrations:
-- psql -v ON_ERROR_STOP=1 -f supabase/tests/horizontal_security.sql
-- Real PostgreSQL roles, RLS, triggers and constraints; all fixtures roll back.
BEGIN;
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-000000000001', 'owner@example.test', '{}'),
  ('00000000-0000-4000-8000-000000000002', 'admin@example.test', '{}'),
  ('00000000-0000-4000-8000-000000000003', 'other@example.test', '{}'),
  ('00000000-0000-4000-8000-000000000004', 'insert@example.test', '{}');
UPDATE public.profiles SET is_admin = true WHERE id = '00000000-0000-4000-8000-000000000002';
DELETE FROM public.profiles WHERE id = '00000000-0000-4000-8000-000000000004';
INSERT INTO public.conversations (id, participant1_id, participant2_id) VALUES
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000003');
INSERT INTO public.messages (id, conversation_id, sender_id, recipient_id, content) VALUES
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000c1',
   '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'original');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['profiles', 'rides', 'vehicles'] LOOP
    BEGIN
      EXECUTE format('SELECT * FROM public.%I', table_name);
      RAISE EXCEPTION 'FAIL anonymous read allowed: %', table_name;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
  BEGIN
    PERFORM public.search_users('', 0, 10);
    RAISE EXCEPTION 'FAIL anonymous admin search allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.cleanup_old_rate_limits(0);
    RAISE EXCEPTION 'FAIL anonymous rate-limit reset allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS anonymous base-table reads, private-email RPC and rate-limit reset denied';
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000001"}', true);
DO $$
DECLARE affected integer;
BEGIN
  BEGIN
    UPDATE public.profiles SET is_admin = true WHERE id = auth.uid();
    RAISE EXCEPTION 'FAIL owner self-promotion allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.profiles SET is_banned = true WHERE id = auth.uid();
    RAISE EXCEPTION 'FAIL owner ban flag write allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.profiles SET first_name = 'Owner edit', display_lat = 39.123456,
    display_lng = -120.987654, display_lat_offset = 39.123456, display_lng_offset = -120.987654
    WHERE id = auth.uid();
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND first_name = 'Owner edit'
    AND display_lat = 39.12 AND display_lng = -120.99
    AND display_lat_offset IS NULL AND display_lng_offset IS NULL AND is_admin = false
  ) THEN RAISE EXCEPTION 'FAIL owner edit or location sanitization'; END IF;
  UPDATE public.profiles SET first_name = 'Unauthorized edit'
    WHERE id = '00000000-0000-4000-8000-000000000003';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL other profile modified'; END IF;
  UPDATE public.messages SET is_read = true WHERE id = '00000000-0000-4000-8000-0000000000e1';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'FAIL recipient cannot mark message read'; END IF;
  BEGIN
    UPDATE public.messages SET content = 'forged', sender_id = auth.uid()
      WHERE id = '00000000-0000-4000-8000-0000000000e1';
    RAISE EXCEPTION 'FAIL recipient rewrote a received message';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS recipient can mark read but cannot rewrite messages';
  BEGIN
    PERFORM public.cleanup_old_rate_limits(0);
    RAISE EXCEPTION 'FAIL member rate-limit reset allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.search_users('', 0, 10);
    RAISE EXCEPTION 'FAIL member admin search allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS owner edits work; privilege escalation, other-owner writes and admin RPC denied';
END $$;

SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000004"}', true);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.profiles(id, is_admin) VALUES (auth.uid(), true);
    RAISE EXCEPTION 'FAIL privileged INSERT allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.profiles(id, is_banned) VALUES (auth.uid(), true);
    RAISE EXCEPTION 'FAIL banned INSERT allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  INSERT INTO public.profiles(id, first_name, display_lat, display_lng,
    display_lat_offset, display_lng_offset)
    VALUES (auth.uid(), 'New owner', 38.765432, -119.123456, 38.765432, -119.123456);
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
    AND display_lat = 38.77 AND display_lng = -119.12
    AND display_lat_offset IS NULL AND display_lng_offset IS NULL)
    THEN RAISE EXCEPTION 'FAIL INSERT location sanitization'; END IF;
  BEGIN
    INSERT INTO public.profiles(id, is_admin) VALUES (auth.uid(), true)
    ON CONFLICT (id) DO UPDATE SET is_admin = EXCLUDED.is_admin;
    RAISE EXCEPTION 'FAIL upsert escalation allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS INSERT and UPSERT privilege protection, approximate coordinates';
END $$;

SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000002"}', true);
DO $$
BEGIN
  UPDATE public.profiles SET is_banned = true WHERE id = '00000000-0000-4000-8000-000000000001';
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-4000-8000-000000000001'
    AND is_banned = true) THEN RAISE EXCEPTION 'FAIL admin moderation'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.search_users('owner@example.test', 0, 10)
    WHERE email = 'owner@example.test') THEN RAISE EXCEPTION 'FAIL admin email search'; END IF;
  BEGIN
    UPDATE public.profiles SET is_admin = true WHERE id = '00000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'FAIL admin granted admin from a member session';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS authenticated persisted admin moderation and private-email search';
  RAISE NOTICE 'PASS signed-in admin cannot grant admin';
END $$;

SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000001"}', true);
DO $$
BEGIN
  BEGIN
    UPDATE public.profiles SET is_banned = false WHERE id = auth.uid();
    RAISE EXCEPTION 'FAIL self-unban allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS banned owner cannot self-unban';
END $$;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
DO $$
BEGIN
  UPDATE public.profiles SET is_banned = false WHERE id = '00000000-0000-4000-8000-000000000001';
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-4000-8000-000000000001'
    AND is_banned = false) THEN RAISE EXCEPTION 'FAIL service role moderation'; END IF;
  RAISE NOTICE 'PASS trusted service-role moderation';
END $$;

RESET ROLE;
DO $$
BEGIN
  INSERT INTO public.account_deletion_requests(user_id, status)
    VALUES ('00000000-0000-4000-8000-000000000001', 'processing');
  BEGIN
    INSERT INTO public.account_deletion_requests(user_id, status)
      VALUES ('00000000-0000-4000-8000-000000000001', 'pending');
    RAISE EXCEPTION 'FAIL duplicate live deletion request allowed';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  UPDATE public.account_deletion_requests SET status = 'cancelled';
  INSERT INTO public.account_deletion_requests(user_id, status)
    VALUES ('00000000-0000-4000-8000-000000000001', 'pending');
  UPDATE public.user_private_info SET marketing_unsubscribed_at = now()
    WHERE id = '00000000-0000-4000-8000-000000000001';
  RAISE NOTICE 'PASS live deletion uniqueness, replacement after cancellation, durable opt-out column';
END $$;
ROLLBACK;
