-- Create scheduled_posts table
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  platforms TEXT[] NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  image_url TEXT,
  timezone TEXT DEFAULT 'Asia/Hong_Kong',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status_scheduled ON scheduled_posts(status, scheduled_for);

-- Enable RLS
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own scheduled posts"
  ON scheduled_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled posts"
  ON scheduled_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled posts"
  ON scheduled_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_scheduled_posts_updated_at ON scheduled_posts;
CREATE TRIGGER update_scheduled_posts_updated_at
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
