import { createClient } from '@supabase/supabase-js';

// Use service role — this runs without a user session
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Verify cron secret so this can't be called publicly
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find all tokens expiring in the next 30 minutes
  const thirtyMinutes = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { data: expiring } = await supabase
    .from('social_connections')
    .select('*')
    .eq('platform', 'x')
    .lt('expires_at', thirtyMinutes)
    .not('refresh_token', 'is', null)
    .neq('refresh_token', '');

  if (!expiring || expiring.length === 0) {
    return Response.json({ refreshed: 0 });
  }

  let refreshed = 0;
  let failed = 0;

  for (const connection of expiring) {
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

    if (res.ok && tokens.access_token) {
      await supabase
        .from('social_connections')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq('id', connection.id);
      refreshed++;
    } else {
      console.error(`Refresh failed for user ${connection.user_id}:`, tokens);
      failed++;
    }
  }

  return Response.json({ refreshed, failed, total: expiring.length });
}