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
    .eq('platform', 'linkedin')
    .single();

  if (stateError || !oauthState) {
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=invalid_state`);
  }

  // Delete used state immediately
  await supabase.from('oauth_states').delete().eq('state', state);

  // Exchange code for tokens (no PKCE, just body params)
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${appUrl}/api/auth/callback/linkedin`,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokenRes.ok || !tokens.access_token) {
    console.error('Token exchange failed:', tokens);
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=token_exchange_failed`);
  }

  // Get LinkedIn user info using the access token
  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const userData = await userRes.json();

  if (!userData.sub) {
    console.error('Failed to get user info:', userData);
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=user_info_failed`);
  }

  // Store tokens
    const insertData = {
      user_id: oauthState.user_id,
      platform: 'linkedin',
      platform_user_id: userData.sub,
      platform_username: userData.name || userData.preferred_username,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
    };
    console.log('LinkedIn upsert data:', JSON.stringify({ ...insertData, access_token: '[HIDDEN]' }));
    const { error: insertErr } = await supabase.from('social_connections').upsert(
      insertData,
      { onConflict: 'user_id,platform' }
    );
    if (insertErr) {
      console.error('LinkedIn upsert error:', JSON.stringify(insertErr));
    }

  return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=linkedin`);
}