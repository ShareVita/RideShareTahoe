-- Create user_blocks table
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints: ensure unique pairs and prevent self-blocking
  UNIQUE(blocker_id, blocked_id),
  CONSTRAINT different_blocker_blocked CHECK (blocker_id != blocked_id)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON public.user_blocks(blocked_id);

-- Enable RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_blocks table
-- Users can view their own blocks
CREATE POLICY "Users can view their own blocks" ON public.user_blocks
  FOR SELECT TO authenticated USING (
    (select auth.uid()) = blocker_id
    OR
    (select auth.uid()) = blocked_id
  );

-- Users can create (initiate) a block on another user
CREATE POLICY "Users can block other users" ON public.user_blocks
  FOR INSERT TO authenticated WITH CHECK (
    (select auth.uid()) = blocker_id
  );

-- Users can only delete (unblock) blocks they initiated
CREATE POLICY "Users can unblock users they blocked" ON public.user_blocks
  FOR DELETE TO authenticated USING (
    (select auth.uid()) = blocker_id
  );

-- Helper function to check if two users have a block between them (two-way mirror)
CREATE OR REPLACE FUNCTION is_user_blocked(other_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (
      (blocker_id = (select auth.uid()) AND blocked_id = other_user_id)
      OR
      (blocker_id = other_user_id AND blocked_id = (select auth.uid()))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
