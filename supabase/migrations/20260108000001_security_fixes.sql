-- Security fixes for PR #60 review findings
--
-- 1. Add authentication check to check_rate_limit() RPC
-- 2. Add NULL checks to is_user_blocked() function
-- 3. Add missing database indexes for performance

-- Fix #1: Update check_rate_limit() to require authentication
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 20,
  p_window_seconds INTEGER DEFAULT 3600
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_record rate_limits%ROWTYPE;
  v_window_start TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_allowed BOOLEAN;
  v_remaining INTEGER;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Security: Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_window_start := v_now - (p_window_seconds || ' seconds')::INTERVAL;

  -- Lock the row for update to prevent race conditions
  SELECT * INTO v_record
  FROM rate_limits
  WHERE key = p_key AND endpoint = p_endpoint
  FOR UPDATE;

  IF v_record.id IS NULL THEN
    -- No existing record, create new one
    INSERT INTO rate_limits (key, endpoint, request_count, window_start)
    VALUES (p_key, p_endpoint, 1, v_now)
    RETURNING * INTO v_record;

    v_allowed := TRUE;
    v_remaining := p_max_requests - 1;
    v_reset_at := v_now + (p_window_seconds || ' seconds')::INTERVAL;
  ELSIF v_record.window_start < v_window_start THEN
    -- Window has expired, reset the counter
    UPDATE rate_limits
    SET request_count = 1, window_start = v_now
    WHERE id = v_record.id
    RETURNING * INTO v_record;

    v_allowed := TRUE;
    v_remaining := p_max_requests - 1;
    v_reset_at := v_now + (p_window_seconds || ' seconds')::INTERVAL;
  ELSIF v_record.request_count >= p_max_requests THEN
    -- Rate limit exceeded
    v_allowed := FALSE;
    v_remaining := 0;
    v_reset_at := v_record.window_start + (p_window_seconds || ' seconds')::INTERVAL;
  ELSE
    -- Increment the counter
    UPDATE rate_limits
    SET request_count = request_count + 1
    WHERE id = v_record.id
    RETURNING * INTO v_record;

    v_allowed := TRUE;
    v_remaining := p_max_requests - v_record.request_count;
    v_reset_at := v_record.window_start + (p_window_seconds || ' seconds')::INTERVAL;
  END IF;

  RETURN json_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'reset_at', v_reset_at
  );
END;
$$;

-- Fix #2: Update is_user_blocked() to handle NULL values safely
CREATE OR REPLACE FUNCTION is_user_blocked(other_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return FALSE for unauthenticated users or NULL input
  -- This prevents potential bypass attacks
  IF auth.uid() IS NULL OR other_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

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

-- Fix #3: Add missing indexes for performance
-- Index for conversations lookups by participants
CREATE INDEX IF NOT EXISTS idx_conversations_participant1
  ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2
  ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_ride_id
  ON conversations(ride_id);

-- Index for messages by conversation (for efficient thread loading)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at DESC);
