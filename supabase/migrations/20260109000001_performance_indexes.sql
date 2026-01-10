-- Performance indexes for PR #60 review findings
--
-- 1. Add composite index for bidirectional block lookups
-- 2. Add index for rate_limits cleanup queries

-- Index for bidirectional block lookups (used by is_user_blocked function)
-- The function queries: (blocker_id = X AND blocked_id = Y) OR (blocker_id = Y AND blocked_id = X)
-- Composite index improves both directions
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_blocked
  ON public.user_blocks(blocker_id, blocked_id);

-- Reverse composite index for the OR condition
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_blocker
  ON public.user_blocks(blocked_id, blocker_id);

-- Index for rate_limits cleanup queries (by window_start)
-- Used by cleanup_old_rate_limits function
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
  ON public.rate_limits(window_start);
