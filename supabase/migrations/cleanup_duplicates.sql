-- Delete ALL rows for this user (you'll reconnect all platforms)
DELETE FROM social_connections
WHERE user_id = '32469aa0-5830-4af7-a928-ee58c0195630';

-- Now add the constraint
ALTER TABLE social_connections
ADD CONSTRAINT social_connections_user_platform_unique UNIQUE (user_id, platform);
