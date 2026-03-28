-- Create postiz_users table for storing Postiz auth tokens per Supabase user
CREATE TABLE IF NOT EXISTS postiz_users (
  supabase_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  postiz_auth_token TEXT NOT NULL,
  token_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE postiz_users ENABLE ROW LEVEL SECURITY;

-- Policy: users can only access their own Postiz token
CREATE POLICY "user_owns_postiz_token"
ON postiz_users
FOR SELECT
USING (auth.uid() = supabase_user_id);

-- Policy: users can insert their own Postiz token
CREATE POLICY "user_inserts_postiz_token"
ON postiz_users
FOR INSERT
WITH CHECK (auth.uid() = supabase_user_id);

-- Policy: users can update their own Postiz token
CREATE POLICY "user_updates_postiz_token"
ON postiz_users
FOR UPDATE
USING (auth.uid() = supabase_user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_postiz_users_updated
ON postiz_users(token_updated_at);
