-- Update conversations policy: Remove active booking requirement
DROP POLICY "Users can create conversations with active booking" ON conversations;

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (
    (select auth.uid()) = participant1_id OR (select auth.uid()) = participant2_id
  );

-- 2. Update messages policy: Remove active booking requirement
DROP POLICY "Users can send messages with active booking" ON messages;

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    (select auth.uid()) = sender_id
  );

-- 3. Update profile_socials policy: Allow all authenticated users to view socials
DROP POLICY "Socials viewable by owner or connected users" ON profile_socials;

CREATE POLICY "Socials viewable by owner or all authenticated users" ON profile_socials
  FOR SELECT TO authenticated USING (
    (select auth.uid()) = user_id
    OR
    true
  );

-- Note: The "Banned users cannot insert messages" restrictive policy remains unchanged
-- and will continue to prevent banned users from messaging.
