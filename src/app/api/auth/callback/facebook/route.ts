
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const debug: any = { step: 'start', state, error };

  try {
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

    debug.oauthState = oauthState;
    debug.step = 'got_oauth_state';

    if (stateError || !oauthState) {
      return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=invalid_state`);
    }

    const platform = oauthState.platform;
    debug.platform = platform;

    await supabase.from('oauth_states').delete().eq('state', state);

    // Exchange code for access token
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
    debug.tokenSuccess = tokenRes.ok;
    debug.hasAccessToken = !!tokens.access_token;

    if (!tokenRes.ok || !tokens.access_token) {
      debug.step = 'token_exchange_failed';
      debug.tokens = tokens;
      return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=token_exchange_failed`);
    }

    const userToken = tokens.access_token;
    debug.step = 'got_user_token';

    // Get user info
    const userRes = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${userToken}&fields=id,name`);
    const userData = await userRes.json();
    debug.user = userData;

    // For Instagram
    if (platform === 'instagram') {
      debug.step = 'processing_instagram';

      // Get ALL pages with access tokens
      const pagesRes = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}&fields=id,name,access_token`
      );
      const pagesData = await pagesRes.json();
      debug.pagesCount = pagesData.data?.length || 0;
      debug.pages = pagesData.data?.map((p: any) => ({ id: p.id, name: p.name }));

      let igAccountId = null;
      let igUsername = null;
      let pageAccessToken = null;

      if (pagesData.data) {
        for (const page of pagesData.data) {
          debug.currentPage = page.name;
          debug.currentPageId = page.id;

          // Check if this page has Instagram linked
          const pageDetailRes = await fetch(
            `https://graph.facebook.com/v18.0/${page.id}?fields=id,name,instagram_business_account&access_token=${page.access_token}`
          );
          const pageDetail = await pageDetailRes.json();
          debug.pageDetail = pageDetail;
          debug.hasIgField = !!pageDetail.instagram_business_account;

          if (pageDetail.instagram_business_account) {
            igAccountId = pageDetail.instagram_business_account.id;
            pageAccessToken = page.access_token;

            // Get IG username
            const igRes = await fetch(
              `https://graph.facebook.com/v18.0/${igAccountId}?fields=username&access_token=${page.access_token}`
            );
            const igData = await igRes.json();
            igUsername = igData.username || 'Instagram';

            debug.foundIgUsername = igUsername;
            debug.foundIgId = igAccountId;
            break;
          }
        }
      }

      debug.igAccountId = igAccountId;
      debug.step = igAccountId ? 'found_ig' : 'no_ig_found';

      if (igAccountId) {
        await supabase.from('social_connections').upsert(
          {
            user_id: oauthState.user_id,
            platform: 'instagram',
            platform_user_id: igAccountId,
            platform_username: igUsername,
            access_token: pageAccessToken,
            refresh_token: tokens.refresh_token || null,
            expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
          },
          { onConflict: 'user_id,platform' }
        );
        debug.step = 'stored';
        return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=instagram`);
      } else {
        debug.step = 'redirecting_no_ig';
        return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=no_instagram_account`);
      }
    }

    // For Facebook
    if (platform === 'facebook') {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}&fields=id,name,access_token`
      );
      const pagesData = await pagesRes.json();

      if (pagesData.data && pagesData.data.length > 0) {
        const firstPage = pagesData.data[0];
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
      return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=facebook`);
    }

    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=unknown_platform`);
  } catch (err: any) {
    debug.error = err.message;
    debug.step = 'error';
    console.error('Callback error:', err);
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=callback_error`);
  }
}
