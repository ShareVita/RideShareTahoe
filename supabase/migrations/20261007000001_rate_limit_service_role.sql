-- check_rate_limit rejected every call without a member session, including
-- the service role. Bulk email and the contact form call it with the
-- service-role client, so the fail-closed limiter turned every request into
-- HTTP 429. Same function body; only the authentication guard changes.
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
  -- Members must be signed in. Server code that has no member session (the
  -- admin bulk-email sender, the contact form) calls with the service-role key,
  -- which has no auth.uid(); it is trusted to choose its own key.
  IF auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
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
