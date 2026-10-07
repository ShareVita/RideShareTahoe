-- Anonymous discovery uses the server's minimal public ride DTO, not these
-- member tables. Preserve existing blocking and ride visibility predicates.
ALTER POLICY "Profiles are viewable unless blocked" ON public.profiles TO authenticated;
ALTER POLICY "Vehicles are viewable by everyone" ON public.vehicles TO authenticated;
ALTER POLICY "Users can view active rides or their own rides" ON public.rides TO authenticated;
REVOKE SELECT ON public.profiles, public.vehicles, public.rides FROM anon;

-- A definer lookup avoids recursive profiles RLS and reads the persisted admin
-- flag, never user-supplied metadata or the NEW row of a profile write.
CREATE FUNCTION public.is_profile_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND is_admin IS TRUE
  );
$$;
REVOKE ALL ON FUNCTION public.is_profile_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_admin() TO authenticated;

ALTER POLICY "Authenticated users can update profiles" ON public.profiles
  USING ((SELECT auth.uid()) = id OR (SELECT public.is_profile_admin()))
  WITH CHECK ((SELECT auth.uid()) = id OR (SELECT public.is_profile_admin()));

CREATE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  -- Server-side tooling: the service-role key or a direct postgres session.
  trusted boolean :=
    auth.role() = 'service_role'
    OR (session_user = 'postgres' AND current_setting('role') NOT IN ('anon', 'authenticated'));
  -- Signed-in admins may ban and unban from the admin UI, but may not grant or
  -- revoke admin. A stolen admin session or an XSS must not be able to mint
  -- new admins; that stays a service-role operation.
  moderator boolean := public.is_profile_admin();
BEGIN
  IF NOT COALESCE(trusted, false) THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.is_admin IS DISTINCT FROM false OR NEW.is_banned IS DISTINCT FROM false THEN
        RAISE EXCEPTION 'Privileged profile fields cannot be set' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF NEW.id IS DISTINCT FROM OLD.id OR NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
        RAISE EXCEPTION 'Privileged profile fields cannot be changed' USING ERRCODE = '42501';
      END IF;
      IF NEW.is_banned IS DISTINCT FROM OLD.is_banned AND NOT COALESCE(moderator, false) THEN
        RAISE EXCEPTION 'Privileged profile fields cannot be changed' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  -- Public/member locations are approximate (~1 km), not home coordinates.
  -- Offset columns are unused; clear them so they cannot retain raw locations.
  NEW.display_lat := round(NEW.display_lat, 2);
  NEW.display_lng := round(NEW.display_lng, 2);
  NEW.display_lat_offset := NULL;
  NEW.display_lng_offset := NULL;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_fields() FROM PUBLIC;
CREATE TRIGGER protect_profile_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- The backfill is not member activity. Without this, every geocoded member's
-- updated_at (shown as "last online" in the member list) would jump to the
-- migration time.
ALTER TABLE public.profiles DISABLE TRIGGER update_profiles_updated_at;
UPDATE public.profiles
SET display_lat = round(display_lat, 2), display_lng = round(display_lng, 2),
    display_lat_offset = NULL, display_lng_offset = NULL
WHERE display_lat IS DISTINCT FROM round(display_lat, 2)
   OR display_lng IS DISTINCT FROM round(display_lng, 2)
   OR display_lat_offset IS NOT NULL OR display_lng_offset IS NOT NULL;
ALTER TABLE public.profiles ENABLE TRIGGER update_profiles_updated_at;

-- search_users bypasses RLS and returns private email addresses. Both the
-- execution grant and in-function admin guard are required.
CREATE OR REPLACE FUNCTION public.search_users(search_term TEXT, page_number INTEGER, page_size INTEGER)
RETURNS TABLE (
  id UUID, first_name TEXT, last_name TEXT, email TEXT,
  is_banned BOOLEAN, is_admin BOOLEAN, profile_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE, total_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_profile_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.id, p.first_name, p.last_name, u.email, p.is_banned,
           p.is_admin, p.profile_photo_url, p.created_at, count(*) OVER ()
    FROM public.profiles p
    JOIN public.user_private_info u ON p.id = u.id
    WHERE search_term IS NULL OR search_term = ''
       OR p.first_name ILIKE '%' || search_term || '%'
       OR p.last_name ILIKE '%' || search_term || '%'
       OR u.email ILIKE '%' || search_term || '%'
    ORDER BY p.created_at DESC
    LIMIT page_size OFFSET page_number * page_size;
END;
$$;
REVOKE ALL ON FUNCTION public.search_users(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_users(TEXT, INTEGER, INTEGER) TO authenticated;

-- Recipients may only mark a message read. The "update their received
-- messages" policy has no column limit, so without this a recipient could
-- rewrite content or sender_id and fabricate a message from another member.
REVOKE UPDATE ON public.messages FROM anon, authenticated;
GRANT UPDATE (is_read) ON public.messages TO authenticated;

-- cleanup_old_rate_limits is SECURITY DEFINER and was executable by everyone
-- through default function grants, so anyone could call it with
-- p_older_than_hours = 0 and wipe every rate-limit counter. No app code calls
-- it; keep it for service-role maintenance only.
REVOKE ALL ON FUNCTION public.cleanup_old_rate_limits(INTEGER) FROM PUBLIC, anon, authenticated;
