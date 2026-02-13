-- Run this in Supabase SQL Editor to verify emails are being sent

-- Recent email events (last 24 hours)
SELECT
  email_type,
  user_id,
  status,
  created_at,
  error_message
FROM email_events
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- Email stats by type
SELECT
  email_type,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM email_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY email_type
ORDER BY total_sent DESC;

-- Check if welcome emails are still being sent
SELECT
  user_id,
  created_at
FROM email_events
WHERE email_type = 'welcome'
AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 5;
