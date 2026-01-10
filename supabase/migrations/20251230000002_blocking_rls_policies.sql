-- Note: The is_user_blocked() function must exist (created in 20251230000001_user_blocks.sql)

-- Prevent blocked users from viewing each other's profiles
-- Drop the permissive "Public profiles" policy and replace with stricter version
DROP POLICY "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Profiles are viewable unless blocked" ON profiles
  FOR SELECT USING (
    NOT is_user_blocked(id)
  );

-- 2. Prevent blocked users from viewing each other's social links
-- The new policy from 20251230000000_unrestricted_messaging.sql allows all authenticated users
-- but we need to add a blocking restriction on top
DROP POLICY "Socials viewable by owner or all authenticated users" ON profile_socials;

CREATE POLICY "Socials viewable by owner or authenticated unless blocked" ON profile_socials
  FOR SELECT TO authenticated USING (
    (select auth.uid()) = user_id
    OR
    (NOT is_user_blocked(user_id))
  );

-- 3. Prevent blocked users from viewing conversations together
DROP POLICY "Users can view their conversations" ON conversations;

CREATE POLICY "Users can view their conversations unless blocked" ON conversations
  FOR SELECT USING (
    ((select auth.uid()) = participant1_id OR (select auth.uid()) = participant2_id)
    AND
    NOT is_user_blocked(
      CASE 
        WHEN (select auth.uid()) = participant1_id THEN participant2_id
        ELSE participant1_id
      END
    )
  );

-- 4. Prevent blocked users from creating conversations
DROP POLICY "Users can create conversations" ON conversations;

CREATE POLICY "Users can create conversations if not blocked" ON conversations
  FOR INSERT TO authenticated WITH CHECK (
    ((select auth.uid()) = participant1_id OR (select auth.uid()) = participant2_id)
    AND
    NOT is_user_blocked(
      CASE 
        WHEN (select auth.uid()) = participant1_id THEN participant2_id
        ELSE participant1_id
      END
    )
  );

-- 5. Prevent blocked users from viewing messages
DROP POLICY "Users can view their messages" ON messages;

CREATE POLICY "Users can view their messages unless blocked" ON messages
  FOR SELECT USING (
    ((select auth.uid()) = sender_id OR (select auth.uid()) = recipient_id)
    AND
    NOT is_user_blocked(
      CASE 
        WHEN (select auth.uid()) = sender_id THEN recipient_id
        ELSE sender_id
      END
    )
  );

-- 6. Prevent blocked users from sending messages
DROP POLICY "Users can send messages" ON messages;

CREATE POLICY "Users can send messages if not blocked" ON messages
  FOR INSERT TO authenticated WITH CHECK (
    (select auth.uid()) = sender_id
    AND
    NOT is_user_blocked(recipient_id)
  );

-- 7. Prevent blocked users from updating messages
-- Add a restrictive blocking policy on top of the existing update policy
CREATE POLICY "Users cannot update messages if blocked" ON messages
  AS RESTRICTIVE
  FOR UPDATE USING (
    (select auth.uid()) = recipient_id
    AND
    NOT is_user_blocked(sender_id)
  );
