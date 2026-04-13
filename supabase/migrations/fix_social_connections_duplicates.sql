-- First, find and remove duplicate rows for social_connections
-- Keep the row with the most recent data, delete others

-- Step 1: Find duplicates
-- SELECT user_id, platform, COUNT(*) FROM social_connections GROUP BY user_id, platform HAVING COUNT(*) > 1;

-- Step 2: Delete duplicates, keeping the one with the most recent/valid data
-- For Facebook duplicates, keep the one with platform_user_id set
DELETE FROM social_connections a
USING social_connections b
WHERE a.user_id = b.user_id
  AND a.platform = b.platform
  AND a.id < b.id
  AND (b.platform_user_id IS NOT NULL OR b.access_token IS NOT NULL);

-- Step 3: Add unique constraint
ALTER TABLE social_connections
ADD CONSTRAINT social_connections_user_platform_unique UNIQUE (user_id, platform);
