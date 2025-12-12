-- Remove role column from profiles table
ALTER TABLE profiles DROP COLUMN IF EXISTS role;

-- Update search_users function to remove role from return type and SELECT
DROP FUNCTION IF EXISTS search_users(TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION search_users(search_term TEXT, page_number INTEGER, page_size INTEGER)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  -- role TEXT, -- Removed
  is_banned BOOLEAN,
  is_admin BOOLEAN,
  profile_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  total_count BIGINT
) AS $$
DECLARE
  total_rows BIGINT;
BEGIN
  -- Get total count first
  SELECT COUNT(*) INTO total_rows
  FROM profiles p
  JOIN user_private_info u ON p.id = u.id
  WHERE 
    search_term IS NULL OR search_term = '' OR
    p.first_name ILIKE '%' || search_term || '%' OR
    p.last_name ILIKE '%' || search_term || '%' OR
    u.email ILIKE '%' || search_term || '%';

  RETURN QUERY
  SELECT 
    p.id, 
    p.first_name, 
    p.last_name, 
    u.email, 
    -- p.role, -- Removed
    p.is_banned, 
    p.is_admin, 
    p.profile_photo_url, 
    p.created_at,
    total_rows
  FROM profiles p
  JOIN user_private_info u ON p.id = u.id
  WHERE 
    search_term IS NULL OR search_term = '' OR
    p.first_name ILIKE '%' || search_term || '%' OR
    p.last_name ILIKE '%' || search_term || '%' OR
    u.email ILIKE '%' || search_term || '%'
  ORDER BY p.created_at DESC
  LIMIT page_size
  OFFSET page_number * page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'auth';
