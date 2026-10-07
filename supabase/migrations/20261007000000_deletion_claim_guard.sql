-- REST access must obey the same worker/cancellation contract as the API.
CREATE FUNCTION public.protect_deletion_claim()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'service_role'
    OR (session_user = 'postgres' AND current_setting('role') NOT IN ('anon', 'authenticated'))
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending' OR NEW.processed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Only the worker may claim deletion requests' USING ERRCODE = '42501';
    END IF;
    NEW.created_at := now();
    NEW.scheduled_deletion_date := now() + interval '30 days';
  ELSE
    IF OLD.status IS DISTINCT FROM 'pending'
      OR NEW.status IS NULL OR NEW.status NOT IN ('pending', 'cancelled')
      OR NEW.id IS DISTINCT FROM OLD.id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.scheduled_deletion_date IS DISTINCT FROM OLD.scheduled_deletion_date
      OR NEW.processed_at IS DISTINCT FROM OLD.processed_at
    THEN
      RAISE EXCEPTION 'Only pending requests can be cancelled; worker fields are protected'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_deletion_claim() FROM PUBLIC;
CREATE TRIGGER protect_deletion_claim
  BEFORE INSERT OR UPDATE ON public.account_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.protect_deletion_claim();
