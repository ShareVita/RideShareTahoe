-- Storage finalizes a member upload as service_role after writing physical
-- bytes. Fence that privileged publication by row ownership, not JWT identity.
-- DELETE remains available to the cleanup worker after Auth is gone.
CREATE FUNCTION public.lock_live_storage_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE owners uuid[] := ARRAY[NEW.owner]; locked integer;
BEGIN
  IF NEW.bucket_id = 'profile-photos' THEN
    BEGIN
      owners := array_append(owners, split_part(NEW.name, '/', 1)::uuid);
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Profile photo requires a live account prefix' USING ERRCODE = '42501';
    END;
  END IF;
  SELECT coalesce(array_agg(DISTINCT id), ARRAY[]::uuid[]) INTO owners
    FROM unnest(owners) id WHERE id IS NOT NULL;
  PERFORM id FROM auth.users WHERE id = ANY(owners) ORDER BY id FOR KEY SHARE;
  GET DIAGNOSTICS locked = ROW_COUNT;
  IF locked <> cardinality(owners) THEN
    RAISE EXCEPTION 'Storage owner is no longer available' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.lock_live_storage_owner() FROM PUBLIC;
CREATE TRIGGER lock_live_storage_owner BEFORE INSERT OR UPDATE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.lock_live_storage_owner();
