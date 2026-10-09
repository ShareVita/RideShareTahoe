-- A booking and its capacity must commit or roll back together. Serialize on
-- the parent ride; derive the counter from indexed reservations, never a
-- client's stale available_seats value. Completed trips retain their seats.
CREATE INDEX booking_reserved_capacity ON public.trip_bookings (ride_id)
WHERE status IN ('invited', 'confirmed', 'completed');

CREATE FUNCTION public.derive_ride_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE reserved integer;
BEGIN
  SELECT count(*) INTO reserved FROM public.trip_bookings
    WHERE ride_id = NEW.id AND status IN ('invited','confirmed','completed');
  IF NEW.total_seats < 0 THEN
    RAISE EXCEPTION 'Seat capacity cannot be negative' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND
     (NEW.total_seats IS DISTINCT FROM OLD.total_seats OR NEW.posting_type IS DISTINCT FROM OLD.posting_type) AND
     reserved > 0 AND (NEW.total_seats < reserved OR
       (OLD.posting_type = 'driver' AND OLD.total_seats IS NOT NULL AND
        (NEW.posting_type IS DISTINCT FROM 'driver' OR NEW.total_seats IS NULL))) THEN
    RAISE EXCEPTION 'Seat capacity is below existing reservations' USING ERRCODE = '23514';
  END IF;
  NEW.available_seats := CASE WHEN NEW.posting_type = 'driver' AND NEW.total_seats IS NOT NULL
    THEN greatest(NEW.total_seats - reserved, 0) ELSE NULL END;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.derive_ride_capacity() FROM PUBLIC;
CREATE TRIGGER derive_ride_capacity BEFORE INSERT OR UPDATE OF total_seats, available_seats, posting_type
ON public.rides FOR EACH ROW EXECUTE FUNCTION public.derive_ride_capacity();

CREATE FUNCTION public.account_booking_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  previous_ride uuid;
  next_ride uuid;
  previous_reserved boolean := false;
  next_reserved boolean := false;
  trip public.rides%ROWTYPE;
  reserved integer;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    previous_ride := OLD.ride_id;
    previous_reserved := OLD.status IN ('invited','confirmed','completed');
  END IF;
  IF TG_OP <> 'DELETE' THEN
    next_ride := NEW.ride_id;
    next_reserved := NEW.status IN ('invited','confirmed','completed');
  END IF;
  IF NOT previous_reserved AND NOT next_reserved THEN RETURN NULL; END IF;
  IF previous_reserved = next_reserved AND previous_ride IS NOT DISTINCT FROM next_ride THEN
    RETURN NULL;
  END IF;
  -- Separate READ COMMITTED commands after obtaining the row lock see the
  -- winner's committed bookings, as well as this transaction's own mutation.
  -- NO KEY UPDATE still serializes capacity changes but is compatible with
  -- booking FK KEY SHARE locks; FOR UPDATE would risk lock-upgrade deadlocks.
  FOR trip IN SELECT * FROM public.rides
    WHERE id IN (previous_ride, next_ride) ORDER BY id FOR NO KEY UPDATE LOOP
    SELECT count(*) INTO reserved FROM public.trip_bookings
      WHERE ride_id = trip.id AND status IN ('invited','confirmed','completed');
    IF trip.id = next_ride AND next_reserved AND
       (NOT previous_reserved OR previous_ride IS DISTINCT FROM next_ride) THEN
      IF trip.posting_type = 'driver' AND trip.total_seats IS NOT NULL AND reserved > trip.total_seats THEN
        RAISE EXCEPTION 'No seats available' USING ERRCODE = 'P0001';
      END IF;
      IF auth.role() = 'authenticated' AND trip.status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Ride is no longer active' USING ERRCODE = 'P0001';
      END IF;
    END IF;
    UPDATE public.rides SET available_seats = available_seats WHERE id = trip.id;
  END LOOP;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.account_booking_capacity() FROM PUBLIC;
CREATE TRIGGER account_booking_capacity AFTER INSERT OR UPDATE OR DELETE ON public.trip_bookings
FOR EACH ROW EXECUTE FUNCTION public.account_booking_capacity();

-- Preserve initial-state rules, but report full rides as a capacity conflict.
DO $$ DECLARE definition text; BEGIN
  SELECT pg_get_functiondef('public.guard_booking_write()'::regprocedure) INTO definition;
  IF position('(trip.available_seats IS NOT NULL AND trip.available_seats <= 0) OR' IN definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected booking guard definition';
  END IF;
  definition := replace(definition, '(trip.available_seats IS NOT NULL AND trip.available_seats <= 0) OR', '');
  definition := replace(definition, 'NEW.created_at := now();',
    'IF trip.available_seats IS NOT NULL AND trip.available_seats <= 0 THEN
       RAISE EXCEPTION ''No seats available'' USING ERRCODE = ''P0001'';
     END IF;
     NEW.created_at := now();');
  EXECUTE definition;
END $$;

-- Retention cancels future reservations in the same transaction. Its old
-- explicit increment would now be redundant: the booking trigger owns it.
DO $$ DECLARE definition text; start_at integer; end_at integer; BEGIN
  SELECT pg_get_functiondef('public.retain_deleted_account_history()'::regprocedure) INTO definition;
  start_at := position('  -- Confirmed seats and invitations' IN definition);
  end_at := position('  UPDATE public.trip_bookings b SET' IN definition);
  IF start_at = 0 OR end_at <= start_at THEN RAISE EXCEPTION 'Unexpected retention definition'; END IF;
  definition := substring(definition FROM 1 FOR start_at - 1) || substring(definition FROM end_at);
  EXECUTE definition;
END $$;

-- Reconcile counters without fabricating seats or modifying member activity.
-- Existing overbooked history is preserved at zero availability, never erased.
ALTER TABLE public.rides DISABLE TRIGGER update_rides_updated_at;
UPDATE public.rides r SET available_seats = CASE
  WHEN posting_type = 'driver' AND total_seats IS NOT NULL THEN greatest(total_seats -
    (SELECT count(*)::integer FROM public.trip_bookings b WHERE b.ride_id = r.id
     AND b.status IN ('invited','confirmed','completed')), 0) ELSE NULL END
WHERE available_seats IS DISTINCT FROM CASE
  WHEN posting_type = 'driver' AND total_seats IS NOT NULL THEN greatest(total_seats -
    (SELECT count(*)::integer FROM public.trip_bookings b WHERE b.ride_id = r.id
     AND b.status IN ('invited','confirmed','completed')), 0) ELSE NULL END;
ALTER TABLE public.rides ENABLE TRIGGER update_rides_updated_at;
