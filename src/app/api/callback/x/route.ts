import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // User denied access
  if (error) {
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=${error}`);
  }

  if (!code || !state) {
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=missing_params`);
  }

  const supabase = await createClient();

  // Validate state
  const { data: oauthState, error: stateError } = await supabase
    .from('oauth_states')
    .select('*')
    .eq('state', state)
    .eq('platform', 'x')
    .single();

  if (stateError || !oauthState) {
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=invalid_state`);
  }

  // Delete used state immediately
  await supabase.from('oauth_states').delete().eq('state', state);

  // Exchange code for tokens
  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${appUrl}/api/callback/x`,
      code_verifier: oauthState.code_verifier,
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokenRes.ok || !tokens.access_token) {
    console.error('Token exchange failed:', tokens);
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=token_exchange_failed`);
  }

  // Get Twitter user info using the user's access token
  const userRes = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const userData = await userRes.json();

  if (!userData.data) {
    console.error('Failed to get user info:', userData);
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=user_info_failed`);
  }

  // Store tokens
  await supabase.from('social_connections').upsert(
    {
      user_id: oauthState.user_id,
      platform: 'x',
      platform_user_id: userData.data.id,
      platform_username: userData.data.username,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    },
    { onConflict: 'user_id,platform' }
  );

  return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=x`);
}