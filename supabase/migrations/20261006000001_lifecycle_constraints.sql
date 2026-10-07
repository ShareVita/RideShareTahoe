-- Durable marketing opt-out shared by authenticated preferences and signed
-- unsubscribe links. Private-info RLS keeps it owner/admin-only.
ALTER TABLE public.user_private_info
  ADD COLUMN marketing_unsubscribed_at timestamptz;

ALTER TABLE public.scheduled_emails ADD COLUMN picked_at timestamptz;

-- Only one live request per account, including a worker's in-flight claim.
-- If legacy duplicates exist, index creation intentionally fails rather than
-- silently cancelling user requests; reconcile those before deployment.
CREATE UNIQUE INDEX account_deletion_requests_one_live_per_user
  ON public.account_deletion_requests (user_id)
  WHERE status IN ('pending', 'processing');
