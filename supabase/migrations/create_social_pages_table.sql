-- Create social_pages table for multi-page support
CREATE TABLE social_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL, -- 'facebook' or 'instagram'
  platform_user_id TEXT NOT NULL,
  platform_username TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, platform_user_id)
);

-- Enable RLS
ALTER TABLE social_pages ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can manage their own pages
CREATE POLICY "Users can manage their own social pages" ON social_pages
  FOR ALL USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_social_pages_user_platform ON social_pages(user_id, platform);
