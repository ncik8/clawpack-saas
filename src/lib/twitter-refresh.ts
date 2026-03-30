import { createClient } from '@/utils/supabase/server';

export async function getValidTwitterToken(userId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: connection } = await supabase
    .from('social_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'x')
    .single();

  if (!connection) return null;

  // Check if token expires in the next 5 minutes
  const expiresAt = new Date(connection.expires_at).getTime();
  const fiveMinutes = 5 * 60 * 1000;

  if (Date.now() < expiresAt - fiveMinutes) {
    // Token is still valid
    return connection.access_token;
  }

  // Token expired or expiring soon — refresh it
  if (!connection.refresh_token) {
    console.error('No refresh token available for user:', userId);
    // Delete the stale connection so UI shows "disconnected"
    await supabase
      .from('social_connections')
      .delete()
      .eq('user_id', userId)
      .eq('platform', 'x');
    return null;
  }

  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
    }),
  });

  const tokens = await res.json();

  if (!res.ok || !tokens.access_token) {
    console.error('Token refresh failed:', tokens);
    // If refresh fails, the connection is dead
    await supabase
      .from('social_connections')
      .update({ access_token: '', refresh_token: '' })
      .eq('user_id', userId)
      .eq('platform', 'x');
    return null;
  }

  // Save new tokens
  // IMPORTANT: Twitter rotates the refresh_token too — save the new one
  await supabase
    .from('social_connections')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq('user_id', userId)
    .eq('platform', 'x');

  return tokens.access_token;
}