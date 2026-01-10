-- Database-backed rate limiting for serverless environments
--
-- This migration creates a rate_limits table and RPC function for checking/incrementing
-- rate limits in a way that persists across serverless cold starts and works with
-- horizontal scaling.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(key, endpoint)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_endpoint ON public.rate_limits(key, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits(window_start);

-- RPC function to check and increment rate limit atomically
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

-- RLS - only accessible via RPC (no direct table access)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to rate_limits"
  ON public.rate_limits FOR ALL USING (false);

-- Cleanup function to remove old rate limit entries (call periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits(p_older_than_hours INTEGER DEFAULT 24)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < NOW() - (p_older_than_hours || ' hours')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
