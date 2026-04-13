-- Add unique constraint on social_connections for user_id + platform
-- This enables upsert with onConflict to work correctly
ALTER TABLE social_connections
ADD CONSTRAINT social_connections_user_platform_unique UNIQUE (user_id, platform);
