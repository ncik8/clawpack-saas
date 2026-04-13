-- Find all Facebook rows for the duplicated user
SELECT id, user_id, platform, platform_user_id, access_token, created_at
FROM social_connections
WHERE user_id = '32469aa0-5830-4af7-a928-ee58c0195630' AND platform = 'facebook'
ORDER BY created_at DESC;

-- Delete ALL facebook rows for this user (we'll reconnect later)
DELETE FROM social_connections
WHERE user_id = '32469aa0-5830-4af7-a928-ee58c0195630' AND platform = 'facebook';

-- Now add the constraint
ALTER TABLE social_connections
ADD CONSTRAINT social_connections_user_platform_unique UNIQUE (user_id, platform);
