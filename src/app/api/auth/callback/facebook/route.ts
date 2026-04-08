
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
    .eq('platform', 'facebook')
    .single();

  if (stateError || !oauthState) {
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=invalid_state`);
  }

  // Delete used state immediately
  await supabase.from('oauth_states').delete().eq('state', state);

  // Exchange code for tokens
  const tokenRes = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${appUrl}/api/auth/callback/facebook`,
      client_id: process.env.FACEBOOK_APP_ID!,
      client_secret: process.env.FACEBOOK_APP_SECRET!,
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokenRes.ok || !tokens.access_token) {
    console.error('Token exchange failed:', tokens);
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=token_exchange_failed`);
  }

  // Get Facebook user info
  const userRes = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${tokens.access_token}&fields=id,name,email`);
  const userData = await userRes.json();

  if (!userData.id) {
    console.error('Failed to get user info:', userData);
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=user_info_failed`);
  }

  // Store tokens
  await supabase.from('social_connections').upsert(
    {
      user_id: oauthState.user_id,
      platform: 'facebook',
      platform_user_id: userData.id,
      platform_username: userData.name,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
    },
    { onConflict: 'user_id,platform' }
  );

  return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=facebook`);
}
