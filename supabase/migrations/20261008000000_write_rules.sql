-- Enforce the member write contract even when a caller bypasses Next routes.
-- Server maintenance remains possible with the service role / direct postgres.
CREATE FUNCTION public.guard_booking_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  trip public.rides%ROWTYPE;
BEGIN
  IF auth.role() = 'service_role' OR
     (session_user = 'postgres' AND current_setting('role') NOT IN ('anon', 'authenticated')) THEN
    RETURN NEW;
  END IF;
  SELECT * INTO trip FROM public.rides WHERE id = NEW.ride_id;
  IF NOT FOUND OR NEW.driver_id IS DISTINCT FROM trip.poster_id OR
     actor IS NULL OR actor NOT IN (NEW.driver_id, NEW.passenger_id) THEN
    RAISE EXCEPTION 'Invalid booking participants' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF trip.status IS DISTINCT FROM 'active' OR (trip.available_seats IS NOT NULL AND trip.available_seats <= 0) OR
       NOT ((actor = NEW.passenger_id AND NEW.status = 'pending') OR
            (actor = NEW.driver_id AND NEW.status = 'invited')) OR NEW.confirmed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid initial booking state' USING ERRCODE = '42501';
    END IF;
    IF (actor = NEW.passenger_id AND NEW.driver_notes IS NOT NULL) OR
       (actor = NEW.driver_id AND NEW.passenger_notes IS NOT NULL) THEN
      RAISE EXCEPTION 'Only the author may set booking notes' USING ERRCODE = '42501';
    END IF;
    NEW.created_at := now();
  ELSE
    IF (to_jsonb(NEW) - ARRAY['status','confirmed_at','driver_notes','passenger_notes',
          'pickup_location','pickup_lat','pickup_lng','pickup_time','updated_at']) IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['status','confirmed_at','driver_notes','passenger_notes',
          'pickup_location','pickup_lat','pickup_lng','pickup_time','updated_at']) THEN
      RAISE EXCEPTION 'Booking identity cannot change' USING ERRCODE = '42501';
    END IF;
    IF (actor = NEW.passenger_id AND NEW.driver_notes IS DISTINCT FROM OLD.driver_notes) OR
       (actor = NEW.driver_id AND NEW.passenger_notes IS DISTINCT FROM OLD.passenger_notes) THEN
      RAISE EXCEPTION 'Only the author may edit booking notes' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
      (OLD.status = 'pending' AND actor = NEW.driver_id AND NEW.status IN ('confirmed','cancelled')) OR
      (OLD.status = 'pending' AND actor = NEW.passenger_id AND NEW.status = 'cancelled') OR
      (OLD.status = 'invited' AND actor = NEW.passenger_id AND NEW.status IN ('confirmed','cancelled')) OR
      (OLD.status = 'invited' AND actor = NEW.driver_id AND NEW.status = 'cancelled') OR
      (OLD.status = 'cancelled' AND actor = NEW.passenger_id AND NEW.status = 'pending' AND trip.status = 'active')
    ) THEN
      RAISE EXCEPTION 'Invalid booking transition' USING ERRCODE = '42501';
    END IF;
    -- This timestamp is server-derived, not member-supplied evidence of a trip.
    NEW.confirmed_at := CASE WHEN NEW.status = 'confirmed' THEN
      CASE WHEN OLD.status = 'confirmed' THEN OLD.confirmed_at ELSE now() END
      ELSE NULL END;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_booking_write() FROM PUBLIC;
CREATE TRIGGER guard_booking_write BEFORE INSERT OR UPDATE ON public.trip_bookings
FOR EACH ROW EXECUTE FUNCTION public.guard_booking_write();

-- Do not silently remove legacy duplicates: reconcile before migrating.
CREATE UNIQUE INDEX reviews_one_per_booking ON public.reviews (booking_id, reviewer_id)
WHERE booking_id IS NOT NULL;

CREATE FUNCTION public.guard_review_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  booking public.trip_bookings%ROWTYPE;
  departure timestamp;
  instant timestamptz;
BEGIN
  IF auth.role() = 'service_role' OR
     (session_user = 'postgres' AND current_setting('role') NOT IN ('anon', 'authenticated')) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - ARRAY['rating','comment','updated_at']) IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['rating','comment','updated_at']) THEN
      RAISE EXCEPTION 'Only review rating and comment may change' USING ERRCODE = '42501';
    END IF;
  ELSE
    SELECT * INTO booking FROM public.trip_bookings WHERE id = NEW.booking_id;
    IF NOT FOUND OR auth.uid() IS DISTINCT FROM NEW.reviewer_id OR
       NEW.reviewer_id NOT IN (booking.driver_id, booking.passenger_id) OR
       NEW.reviewee_id IS DISTINCT FROM (CASE WHEN NEW.reviewer_id = booking.driver_id
         THEN booking.passenger_id ELSE booking.driver_id END) OR
       booking.status NOT IN ('confirmed','completed') THEN
      RAISE EXCEPTION 'Review requires a participating confirmed booking' USING ERRCODE = '42501';
    END IF;
    SELECT departure_date + departure_time INTO departure FROM public.rides WHERE id = booking.ride_id;
    instant := departure AT TIME ZONE 'America/Los_Angeles';
    IF departure IS NULL OR instant >= now() OR
       (instant AT TIME ZONE 'America/Los_Angeles') IS DISTINCT FROM departure THEN
      RAISE EXCEPTION 'Review requires a past Pacific departure' USING ERRCODE = '42501';
    END IF;
    NEW.reviewer_role := CASE WHEN NEW.reviewer_id = booking.driver_id THEN 'driver' ELSE 'passenger' END;
    NEW.reviewed_role := CASE WHEN NEW.reviewer_role = 'driver' THEN 'passenger' ELSE 'driver' END;
    NEW.status := 'active';
    NEW.is_pending := false;
    NEW.created_at := now();
  END IF;
  IF NEW.comment IS NULL OR array_length(regexp_split_to_array(btrim(NEW.comment), '\s+'), 1) < 5 THEN
    RAISE EXCEPTION 'Review comment requires at least five words' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_review_write() FROM PUBLIC;
CREATE TRIGGER guard_review_write BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.guard_review_write();

ALTER POLICY "Reviews are public" ON public.reviews TO authenticated;
REVOKE SELECT ON public.reviews FROM anon;
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = reviewer_id);

CREATE INDEX messages_sender_created_at ON public.messages (sender_id, created_at DESC);
CREATE FUNCTION public.guard_message_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  thread public.conversations%ROWTYPE;
BEGIN
  IF auth.role() = 'service_role' OR
     (session_user = 'postgres' AND current_setting('role') NOT IN ('anon', 'authenticated')) THEN
    RETURN NEW;
  END IF;
  IF NEW.sender_id IS DISTINCT FROM auth.uid() OR NEW.sender_id = NEW.recipient_id OR
     char_length(NEW.content) > 5000 OR NEW.content ~ '^[[:space:]]*$' THEN
    RAISE EXCEPTION 'Invalid message' USING ERRCODE = '23514';
  END IF;
  IF NEW.conversation_id IS NOT NULL THEN
    SELECT * INTO thread FROM public.conversations WHERE id = NEW.conversation_id;
    IF NOT FOUND OR NOT (
      (NEW.sender_id = thread.participant1_id AND NEW.recipient_id = thread.participant2_id) OR
      (NEW.sender_id = thread.participant2_id AND NEW.recipient_id = thread.participant1_id)) OR
      NEW.ride_id IS DISTINCT FROM thread.ride_id THEN
      RAISE EXCEPTION 'Message does not belong to this conversation' USING ERRCODE = '42501';
    END IF;
  END IF;
  -- Serialize checks for a sender; backdated inserts cannot evade the window.
  PERFORM pg_advisory_xact_lock(hashtextextended('message-volume:' || NEW.sender_id::text, 0));
  IF (SELECT count(*) FROM public.messages WHERE sender_id = NEW.sender_id AND
      created_at > now() - interval '1 hour') >= 60 THEN
    RAISE EXCEPTION 'Message volume limit exceeded' USING ERRCODE = '42501';
  END IF;
  NEW.created_at := now();
  NEW.is_read := false;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_message_insert() FROM PUBLIC;
CREATE TRIGGER guard_message_insert BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_message_insert();

-- Conversation identity and all notification/analytics evidence are server-owned.
REVOKE UPDATE ON public.conversations FROM anon, authenticated;
GRANT UPDATE (last_message_at) ON public.conversations TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.email_events, public.user_activity, public.reviews_pending
FROM anon, authenticated;
GRANT DELETE ON public.reviews_pending TO authenticated;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;
