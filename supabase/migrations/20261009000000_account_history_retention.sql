-- Hard Auth deletion retains shared history; never run this against production
-- until the retention/cleanup worker and backlog have been reviewed together.
ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
ALTER TABLE public.profiles ADD COLUMN deleted_at timestamptz;
REVOKE DELETE ON public.profiles FROM anon, authenticated;

CREATE FUNCTION public.is_live_account(account_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = account_id);
$$;
REVOKE ALL ON FUNCTION public.is_live_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_live_account(uuid) TO authenticated, service_role;

-- Only nested triggers during this Auth deletion may maintain protected rows.
-- A member can set a custom GUC but cannot forge session_user. SECURITY
-- DEFINER alone does not change session_user.
CREATE FUNCTION public.is_auth_retention_maintenance()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT (session_user = 'supabase_auth_admin' OR
    (session_user = 'postgres' AND current_setting('role') NOT IN ('anon','authenticated')))
    AND pg_trigger_depth() > 1
    AND nullif(current_setting('app.retention_user', true), '') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM auth.users
      WHERE id::text = current_setting('app.retention_user', true));
$$;
REVOKE ALL ON FUNCTION public.is_auth_retention_maintenance() FROM PUBLIC;

DO $$
DECLARE name text; definition text;
BEGIN
  FOREACH name IN ARRAY ARRAY['protect_profile_fields','guard_booking_write','guard_review_write','protect_deletion_claim'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO definition FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = name;
    IF definition IS NULL OR position('auth.role() = ''service_role''' IN definition) = 0 THEN
      RAISE EXCEPTION 'Expected service-role guard in %', name;
    END IF;
    definition := replace(definition, 'auth.role() = ''service_role''',
      '(auth.role() = ''service_role'' OR public.is_auth_retention_maintenance())');
    EXECUTE definition;
  END LOOP;
END $$;

CREATE FUNCTION public.guard_profile_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF public.is_auth_retention_maintenance() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NOT NULL OR NOT public.is_live_account(NEW.id) THEN
      RAISE EXCEPTION 'Profile requires a live Auth account' USING ERRCODE = '42501';
    END IF;
  ELSIF OLD.deleted_at IS NOT NULL OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION 'Deleted profiles are immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_profile_lifecycle() FROM PUBLIC;
CREATE TRIGGER guard_profile_lifecycle BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_lifecycle();

CREATE OR REPLACE FUNCTION public.retain_deleted_account_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM set_config('app.retention_user', OLD.id::text, true);
  UPDATE public.profiles SET first_name = 'Deleted member', last_name = NULL,
    bio = NULL, profile_photo_url = NULL, display_lat = NULL, display_lng = NULL,
    display_lat_offset = NULL, display_lng_offset = NULL, pronouns = NULL,
    city = NULL, state = NULL, preferences = NULL, is_admin = false, is_banned = true,
    deleted_at = now() WHERE id = OLD.id;
  DELETE FROM public.profile_socials WHERE user_id = OLD.id;
  DELETE FROM public.vehicles WHERE owner_id = OLD.id;
  DELETE FROM public.user_blocks WHERE blocker_id = OLD.id;
  DELETE FROM public.reviews_pending WHERE user_id = OLD.id OR other_participant_id = OLD.id;
  UPDATE public.messages SET content = '[Message removed]', subject = NULL WHERE sender_id = OLD.id;
  UPDATE public.reviews SET comment = '[Review text removed by deleted member]', review_text = NULL
    WHERE reviewer_id = OLD.id;
  UPDATE public.reports SET details = NULL WHERE reporter_id = OLD.id;
  UPDATE public.account_deletion_requests SET reason = NULL WHERE user_id = OLD.id;
  -- Confirmed seats and invitations have already reserved availability in the
  -- application. Restore only those on another live poster's future ride.
  UPDATE public.rides r SET available_seats = least(
    coalesce(r.total_seats, r.available_seats + released.seats),
    r.available_seats + released.seats)
  FROM (SELECT ride_id, count(*)::integer AS seats FROM public.trip_bookings
    WHERE passenger_id = OLD.id AND status IN ('confirmed','invited') GROUP BY ride_id) released
  WHERE r.id = released.ride_id AND r.poster_id <> OLD.id AND r.available_seats IS NOT NULL
    AND (r.departure_date + r.departure_time) AT TIME ZONE 'America/Los_Angeles' >= now();
  UPDATE public.trip_bookings b SET
    driver_notes = CASE WHEN driver_id = OLD.id THEN NULL ELSE driver_notes END,
    passenger_notes = CASE WHEN passenger_id = OLD.id THEN NULL ELSE passenger_notes END,
    pickup_location = NULL, pickup_lat = NULL, pickup_lng = NULL,
    status = CASE WHEN b.status IN ('pending','invited','confirmed') AND
      (r.departure_date + r.departure_time) AT TIME ZONE 'America/Los_Angeles' >= now()
      THEN 'cancelled' ELSE b.status END
    FROM public.rides r WHERE b.ride_id = r.id AND OLD.id IN (b.driver_id,b.passenger_id);
  UPDATE public.rides SET start_location = '[Location removed]', end_location = '[Location removed]',
    start_lat = NULL, start_lng = NULL, end_lat = NULL, end_lng = NULL,
    title = NULL, description = NULL, special_instructions = NULL,
    car_type = NULL, driving_arrangement = NULL, music_preference = NULL,
    conversation_preference = NULL, recurring_days = NULL, is_recurring = false,
    status = CASE WHEN status = 'active' THEN 'inactive' ELSE status END WHERE poster_id = OLD.id;
  PERFORM set_config('app.retention_user', '', true);
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.retain_deleted_account_history() FROM PUBLIC;
CREATE TRIGGER retain_deleted_account_history AFTER DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.retain_deleted_account_history();

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','profile_socials','user_private_info','vehicles','rides',
    'conversations','messages','trip_bookings','reviews','reviews_pending','reports',
    'account_deletion_requests','email_events','scheduled_emails','user_activity','user_consents','user_blocks'] LOOP
    EXECUTE format('CREATE POLICY live_account ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.is_live_account())) WITH CHECK ((SELECT public.is_live_account()))', t);
  END LOOP;
END $$;
CREATE POLICY live_storage_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK ((SELECT public.is_live_account()));
CREATE POLICY live_storage_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING ((SELECT public.is_live_account())) WITH CHECK ((SELECT public.is_live_account()));
CREATE POLICY live_storage_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING ((SELECT public.is_live_account()));
CREATE POLICY live_message_recipient ON public.messages AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.is_live_account(recipient_id));
CREATE POLICY live_review_participants ON public.reviews AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.is_live_account(reviewer_id) AND public.is_live_account(reviewee_id));
CREATE POLICY live_conversation_participants ON public.conversations AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.is_live_account(participant1_id) AND public.is_live_account(participant2_id));
CREATE POLICY live_booking_participants ON public.trip_bookings AS RESTRICTIVE FOR ALL TO authenticated
USING (true) WITH CHECK (public.is_live_account(driver_id) AND public.is_live_account(passenger_id));
CREATE POLICY retained_trip_history ON public.rides FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_bookings b WHERE b.ride_id = rides.id
  AND auth.uid() IN (b.driver_id,b.passenger_id)) OR
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.ride_id = rides.id
  AND auth.uid() IN (c.participant1_id,c.participant2_id)));
