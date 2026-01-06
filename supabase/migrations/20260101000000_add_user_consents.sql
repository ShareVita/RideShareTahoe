-- Table to track user consent to legal documents
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('tos', 'privacy_policy', 'community_guidelines')),
  document_version TEXT NOT NULL DEFAULT '1.0',
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ip_address TEXT DEFAULT (current_setting('request.headers', true)::json->>'x-real-ip'),
  user_agent TEXT,

  -- Prevent duplicate consent records for same doc version
  UNIQUE(user_id, document_type, document_version)
);

-- Index for quick lookups
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);

-- Enable RLS
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own consents
CREATE POLICY "Users can view own consents" ON user_consents
  FOR SELECT USING ((select auth.uid()) = user_id);

-- Users can insert their own consents
CREATE POLICY "Users can insert own consents" ON user_consents
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Admins can view all consents (for legal/audit purposes)
CREATE POLICY "Admins can view all consents" ON user_consents
  FOR SELECT USING (
    (select is_admin from profiles where id = (select auth.uid())) = true
  );
