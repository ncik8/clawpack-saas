
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

  // Validate state - could be facebook or instagram
  const { data: oauthState, error: stateError } = await supabase
    .from('oauth_states')
    .select('*')
    .eq('state', state)
    .single();

  if (stateError || !oauthState) {
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=invalid_state`);
  }

  const platform = oauthState.platform;

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

  // Get user info
  const userRes = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${tokens.access_token}&fields=id,name,email`);
  const userData = await userRes.json();

  if (!userData.id) {
    console.error('Failed to get user info:', userData);
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=user_info_failed`);
  }

  // For Facebook - get pages
  if (platform === 'facebook') {
    const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${tokens.access_token}`);
    const pagesData = await pagesRes.json();

    // Store first page access token (or store user token if no pages)
    if (pagesData.data && pagesData.data.length > 0) {
      // Store the first page - for multi-page, would need to show selector
      const firstPage = pagesData.data[0];
      await supabase.from('social_connections').upsert(
        {
          user_id: oauthState.user_id,
          platform: 'facebook',
          platform_user_id: userData.id,
          platform_username: firstPage.name,
          access_token: firstPage.access_token,
          refresh_token: tokens.refresh_token || null,
          expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        },
        { onConflict: 'user_id,platform' }
      );
    } else {
      // No pages - store user token
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
    }
  }

  // For Instagram - get IG business account
  if (platform === 'instagram') {
    // Get pages first to find IG account
    const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${tokens.access_token}`);
    const pagesData = await pagesRes.json();

    let igAccountId = null;

    // Find IG account linked to pages
    if (pagesData.data) {
      for (const page of pagesData.data) {
        const igRes = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${tokens.access_token}`);
        const igData = await igRes.json();
        if (igData.instagram_business_account) {
          igAccountId = igData.instagram_business_account;
          break;
        }
      }
    }

    if (igAccountId) {
      await supabase.from('social_connections').upsert(
        {
          user_id: oauthState.user_id,
          platform: 'instagram',
          platform_user_id: igAccountId,
          platform_username: 'Instagram',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        },
        { onConflict: 'user_id,platform' }
      );
    } else {
      console.error('No Instagram business account found');
      return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=no_instagram_account`);
    }
  }

  return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=${platform}`);
}
