
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  console.log('=== FB/IG Callback ===');
  console.log('State:', state);

  if (error) {
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=${error}`);
  }

  if (!code || !state) {
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=missing_params`);
  }

  const supabase = await createClient();

  const { data: oauthState, error: stateError } = await supabase
    .from('oauth_states')
    .select('*')
    .eq('state', state)
    .single();

  if (stateError || !oauthState) {
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=invalid_state`);
  }

  const platform = oauthState.platform;
  console.log('Platform:', platform);

  await supabase.from('oauth_states').delete().eq('state', state);

  // Exchange code for user access token
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
  console.log('Tokens obtained');

  if (!tokenRes.ok || !tokens.access_token) {
    console.error('Token exchange failed:', tokens);
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=token_exchange_failed`);
  }

  const userToken = tokens.access_token;

  // Get user info
  const userRes = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${userToken}&fields=id,name`);
  const userData = await userRes.json();
  console.log('User:', userData.name);

  // For Instagram - find page WITH Instagram linked
  if (platform === 'instagram') {
    console.log('Looking for Instagram account...');

    // Get all pages with their access tokens
    const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}&fields=id,name,access_token`);
    const pagesData = await pagesRes.json();
    console.log('Pages found:', pagesData.data?.length || 0);

    let igAccountId = null;
    let igUsername = null;
    let pageAccessToken = null;

    // Find page with Instagram linked
    if (pagesData.data) {
      for (const page of pagesData.data) {
        console.log(`Checking page ${page.name}...`);
        const pageDetailRes = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}?fields=id,name,instagram_business_account&access_token=${page.access_token}`
        );
        const pageDetail = await pageDetailRes.json();
        console.log(`  IG account:`, pageDetail.instagram_business_account);

        if (pageDetail.instagram_business_account) {
          igAccountId = pageDetail.instagram_business_account.id;
          pageAccessToken = page.access_token;
          // Get IG username
          const igRes = await fetch(
            `https://graph.facebook.com/v18.0/${igAccountId}?fields=username&access_token=${page.access_token}`
          );
          const igData = await igRes.json();
          igUsername = igData.username || 'Instagram';
          console.log(`  Found IG: @${igUsername}`);
          break;
        }
      }
    }

    if (igAccountId) {
      console.log('Storing Instagram connection with page token');
      await supabase.from('social_connections').upsert(
        {
          user_id: oauthState.user_id,
          platform: 'instagram',
          platform_user_id: igAccountId,
          platform_username: igUsername,
          access_token: pageAccessToken, // Use PAGE token, not user token
          refresh_token: tokens.refresh_token || null,
          expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        },
        { onConflict: 'user_id,platform' }
      );
      console.log('Instagram connected!');
    } else {
      console.error('No Instagram business account found on any page');
      return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=no_instagram_account`);
    }
  }

  // For Facebook - get first page or user token
  if (platform === 'facebook') {
    console.log('Processing Facebook...');
    const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}&fields=id,name,access_token`);
    const pagesData = await pagesRes.json();

    if (pagesData.data && pagesData.data.length > 0) {
      const firstPage = pagesData.data[0];
      console.log('Storing first page:', firstPage.name);
      await supabase.from('social_connections').upsert(
        {
          user_id: oauthState.user_id,
          platform: 'facebook',
          platform_user_id: firstPage.id,
          platform_username: firstPage.name,
          access_token: firstPage.access_token,
          refresh_token: tokens.refresh_token || null,
          expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        },
        { onConflict: 'user_id,platform' }
      );
    } else {
      console.log('No pages, storing user token');
      await supabase.from('social_connections').upsert(
        {
          user_id: oauthState.user_id,
          platform: 'facebook',
          platform_user_id: userData.id,
          platform_username: userData.name,
          access_token: userToken,
          refresh_token: tokens.refresh_token || null,
          expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        },
        { onConflict: 'user_id,platform' }
      );
    }
  }

  return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=${platform}`);
}
