import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new Response('Missing params', { status: 400 });
  }

  const supabase = await createClient();

  // Validate state
  const { data: oauthState, error } = await supabase
    .from('oauth_states')
    .select('*')
    .eq('state', state)
    .single();

  if (error || !oauthState) {
    return new Response('Invalid state', { status: 400 });
  }

  // Delete state immediately
  await supabase.from('oauth_states').delete().eq('state', state);

  // Exchange code for tokens
  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(
        `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/callback/x`,
      code_verifier: oauthState.code_verifier,
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokens.access_token) {
    console.error('Twitter token error:', tokens);
    return new Response(`Token error: ${JSON.stringify(tokens)}`, { status: 400 });
  }

  // Get Twitter user info
  const meRes = await fetch('https://api.twitter.com/2/users/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const twitterUser = await meRes.json();

  // Store tokens in database
  await supabase.from('social_connections').upsert({
    user_id: oauthState.user_id,
    platform: 'x',
    platform_user_id: twitterUser.data?.id,
    platform_username: twitterUser.data?.username,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }, {
    onConflict: 'user_id,platform'
  });

  // Redirect back to connected accounts page (with success param)
  return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connected-accounts?connected=x`);
}
