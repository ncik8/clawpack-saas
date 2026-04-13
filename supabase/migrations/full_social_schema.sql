-- ============================================================
-- Full Social Media Schema
-- social_connections - auth tokens per platform
-- social_pages - publish targets under each connection
-- scheduled_posts - content and schedule
-- scheduled_post_targets - where each post publishes
-- ============================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.scheduled_post_targets CASCADE;
DROP TABLE IF EXISTS public.scheduled_posts CASCADE;
DROP TABLE IF EXISTS public.social_pages CASCADE;
DROP TABLE IF EXISTS public.social_connections CASCADE;

-- ============================================================
-- social_connections
-- Stores platform auth credentials (one row per user per platform)
-- ============================================================
CREATE TABLE public.social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  platform TEXT NOT NULL, -- 'x', 'linkedin', 'bluesky', 'facebook', 'instagram'
  platform_user_id TEXT,
  platform_username TEXT,
  platform_email TEXT,
  
  access_token TEXT,
  refresh_token TEXT,
  token_secret TEXT, -- for OAuth1 platforms like X
  id_token TEXT,
  
  token_type TEXT,
  scope TEXT,
  expires_at TIMESTAMPTZ,
  
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one connection per user per platform
CREATE UNIQUE INDEX social_connections_user_platform_uidx 
  ON public.social_connections(user_id, platform);

-- Index for fast lookups
CREATE INDEX idx_social_connections_user_id ON public.social_connections(user_id);

-- Platform check constraint
ALTER TABLE public.social_connections
ADD CONSTRAINT social_connections_platform_check
CHECK (platform IN ('x', 'linkedin', 'bluesky', 'facebook', 'instagram'));

-- Enable RLS
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own social connections"
  ON public.social_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social connections"
  ON public.social_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social connections"
  ON public.social_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own social connections"
  ON public.social_connections FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- social_pages
-- Stores publishing destinations under each connection
-- ============================================================
CREATE TABLE public.social_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.social_connections(id) ON DELETE CASCADE,
  
  platform TEXT NOT NULL, -- 'x', 'linkedin', 'bluesky', 'facebook', 'instagram'
  page_id TEXT NOT NULL, -- the platform's page/user ID
  page_name TEXT NOT NULL,
  page_username TEXT,
  page_type TEXT, -- 'profile', 'page', 'organization', 'business_account'
  page_access_token TEXT,
  
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one page per connection
CREATE UNIQUE INDEX social_pages_connection_page_uidx 
  ON public.social_pages(connection_id, page_id);

-- Unique constraint: one default per user per platform
CREATE UNIQUE INDEX social_pages_one_default_per_connection_uidx 
  ON public.social_pages(connection_id) WHERE is_default = TRUE;

-- Indexes for fast lookups
CREATE INDEX idx_social_pages_user_id ON public.social_pages(user_id);
CREATE INDEX idx_social_pages_connection_id ON public.social_pages(connection_id);
CREATE INDEX idx_social_pages_platform ON public.social_pages(user_id, platform);

-- Platform check constraint
ALTER TABLE public.social_pages
ADD CONSTRAINT social_pages_platform_check
CHECK (platform IN ('x', 'linkedin', 'bluesky', 'facebook', 'instagram'));

-- Enable RLS
ALTER TABLE public.social_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own social pages"
  ON public.social_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social pages"
  ON public.social_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social pages"
  ON public.social_pages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own social pages"
  ON public.social_pages FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- scheduled_posts
-- Stores the post content and schedule
-- ============================================================
CREATE TABLE public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  
  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'Asia/Hong_Kong',
  
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'published', 'failed', 'cancelled')),
  
  error_message TEXT,
  published_at TIMESTAMPTZ,
  external_post_id TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_scheduled_posts_user_id ON public.scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_status_scheduled ON public.scheduled_posts(status, scheduled_for);

-- Enable RLS
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own scheduled posts"
  ON public.scheduled_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled posts"
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled posts"
  ON public.scheduled_posts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- scheduled_post_targets
-- Stores where each scheduled post should publish
-- One row per (post, platform, page) combination
-- ============================================================
CREATE TABLE public.scheduled_post_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_post_id UUID NOT NULL REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  platform TEXT NOT NULL, -- 'x', 'linkedin', 'bluesky', 'facebook', 'instagram'
  social_connection_id UUID REFERENCES public.social_connections(id) ON DELETE SET NULL,
  social_page_id UUID REFERENCES public.social_pages(id) ON DELETE SET NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'published', 'failed')),
  
  error_message TEXT,
  external_post_id TEXT,
  
  scheduled_for TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: no duplicate targets for same post
-- For multi-account platforms (FB/IG): uses (scheduled_post_id, platform, social_page_id)
-- For single-account platforms (X/LI/BSky): uses (scheduled_post_id, platform) with NULL social_page_id
-- We use coalesce to treat NULL page_ids as 'none' for indexing purposes
CREATE UNIQUE INDEX scheduled_post_targets_unique_target_uidx
  ON public.scheduled_post_targets(
    scheduled_post_id,
    platform,
    COALESCE(social_page_id, '00000000-0000-0000-0000-000000000000'::UUID)
  );

-- Indexes for fast lookups
CREATE INDEX idx_scheduled_post_targets_status_scheduled ON public.scheduled_post_targets(status, scheduled_for);
CREATE INDEX idx_scheduled_post_targets_post_id ON public.scheduled_post_targets(scheduled_post_id);
CREATE INDEX idx_scheduled_post_targets_user_id ON public.scheduled_post_targets(user_id);

-- Platform check constraint
ALTER TABLE public.scheduled_post_targets
ADD CONSTRAINT scheduled_post_targets_platform_check
CHECK (platform IN ('x', 'linkedin', 'bluesky', 'facebook', 'instagram'));

-- Status check constraint
ALTER TABLE public.scheduled_post_targets
ADD CONSTRAINT scheduled_post_targets_status_check
CHECK (status IN ('pending', 'processing', 'published', 'failed'));

-- Enable RLS
ALTER TABLE public.scheduled_post_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own scheduled post targets"
  ON public.scheduled_post_targets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled post targets"
  ON public.scheduled_post_targets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled post targets"
  ON public.scheduled_post_targets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled post targets"
  ON public.scheduled_post_targets FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Updated-at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_social_connections_updated_at
  BEFORE UPDATE ON public.social_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_social_pages_updated_at
  BEFORE UPDATE ON public.social_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_scheduled_posts_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_scheduled_post_targets_updated_at
  BEFORE UPDATE ON public.scheduled_post_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
