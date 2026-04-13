import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

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

    if (stateError || !oauthState) {
      return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=invalid_state`);
    }

    await supabase.from('oauth_states').delete().eq('state', state);

    // Exchange code for access token
    const tokenRes = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${appUrl}/api/auth/callback/instagram-standalone`,
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok || !tokens.access_token) {
      console.error('Token exchange failed:', tokens);
      return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=token_exchange_failed`);
    }

    const userToken = tokens.access_token;

    // Get user info
    const userRes = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${userToken}&fields=id,name`);
    const userData = await userRes.json();

    console.log('Instagram-standalone OAuth for user:', userData.id);

    // First try: Get Instagram business accounts directly via dedicated endpoint
    let savedCount = 0;
    
    try {
      const igDirectRes = await fetch(
        `https://graph.facebook.com/v18.0/${userData.id}/instagram_business_accounts?access_token=${userToken}&fields=id,username,name`
      );
      const igDirectData = await igDirectRes.json();
      console.log('Instagram business accounts response:', JSON.stringify(igDirectData));
      
      if (igDirectData.data && igDirectData.data.length > 0) {
        for (const igAccount of igDirectData.data) {
          const igUsername = igAccount.username || igAccount.name || igAccount.id;
          
          await supabase.from('social_pages').upsert(
            {
              user_id: oauthState.user_id,
              platform: 'instagram',
              platform_user_id: igAccount.id,
              platform_username: igUsername,
              access_token: userToken,
              refresh_token: tokens.refresh_token || null,
              expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
            },
            { onConflict: 'user_id,platform,platform_user_id' }
          );
          savedCount++;
          console.log('Saved IG via direct endpoint:', igUsername);
        }
        
        if (savedCount > 0) {
          return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=instagram&count=${savedCount}`);
        }
      }
    } catch (e) {
      console.log('Instagram business accounts endpoint failed:', e);
    }

    // Second try: Get via /me/accounts
    const igAccountsRes = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}&fields=id,name,access_token,instagram_business_account`,
    );
    const igAccountsData = await igAccountsRes.json();

    console.log('IG Accounts via pages response:', JSON.stringify(igAccountsData));

    if (igAccountsData.data && igAccountsData.data.length > 0) {
      for (const page of igAccountsData.data) {
        // Check if page has instagram_business_account linked - ONLY save actual IG accounts
        if (page.instagram_business_account) {
          const igAccountId = page.instagram_business_account.id;
          
          // Get IG username
          const igRes = await fetch(
            `https://graph.facebook.com/v18.0/${igAccountId}?fields=username,name&access_token=${page.access_token || userToken}`
          );
          const igData = await igRes.json();
          const igUsername = igData.username || page.name;

          console.log('Storing IG via page link:', igAccountId, igUsername);

          await supabase.from('social_pages').upsert(
            {
              user_id: oauthState.user_id,
              platform: 'instagram',
              platform_user_id: igAccountId,
              platform_username: igUsername,
              access_token: page.access_token || userToken,
              refresh_token: tokens.refresh_token || null,
              expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
            },
            { onConflict: 'user_id,platform,platform_user_id' }
          );
          savedCount++;
        }
        // DO NOT save Facebook Pages as Instagram accounts!
      }
    }

    // If no IG accounts found via pages, try to get them directly from the user's Instagram business accounts
    if (savedCount === 0) {
      // Try Instagram Graph API endpoint for business accounts
      const directIgRes = await fetch(
        `https://graph.facebook.com/v18.0/${userData.id}?fields=instagram_business_accounts&access_token=${userToken}`
      );
      const directIgData = await directIgRes.json();
      
      console.log('Direct IG business accounts:', JSON.stringify(directIgData));

      if (directIgData.instagram_business_accounts?.data?.length > 0) {
        for (const igAccount of directIgData.instagram_business_accounts.data) {
          // Get IG username
          const igRes = await fetch(
            `https://graph.facebook.com/v18.0/${igAccount.id}?fields=username,name&access_token=${userToken}`
          );
          const igData = await igRes.json();

          console.log('Storing direct IG business account:', igAccount.id, igData.username);

          await supabase.from('social_pages').upsert(
            {
              user_id: oauthState.user_id,
              platform: 'instagram',
              platform_user_id: igAccount.id,
              platform_username: igData.username || igAccount.id,
              access_token: userToken,
              refresh_token: tokens.refresh_token || null,
              expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
            },
            { onConflict: 'user_id,platform,platform_user_id' }
          );
          savedCount++;
        }
      }
    }

    console.log('Total IG accounts saved:', savedCount);
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=instagram&count=${savedCount}`);

  } catch (err: any) {
    console.error('Callback error:', err);
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=callback_error`);
  }
}