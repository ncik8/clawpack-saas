-- Add video_url column to scheduled_posts
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS video_url TEXT;
