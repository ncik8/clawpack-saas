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

    // Step 1: Save/update Instagram connection in social_connections
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .upsert(
        {
          user_id: oauthState.user_id,
          platform: 'instagram',
          platform_user_id: userData.id,
          platform_username: userData.name,
          access_token: userToken,
          refresh_token: tokens.refresh_token || null,
          expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        },
        { onConflict: 'user_id,platform' }
      )
      .select()
      .single();

    if (connError || !connection) {
      console.error('Failed to save Instagram connection:', connError);
      throw new Error('Failed to save Instagram connection');
    }

    // Step 2: Save Instagram accounts to social_pages
    let savedCount = 0;

    // First, deactivate all existing Instagram pages for this connection
    await supabase
      .from('social_pages')
      .update({ is_active: false })
      .eq('connection_id', connection.id)
      .eq('platform', 'instagram');

    // Try to get Instagram business accounts
    try {
      const igDirectRes = await fetch(
        `https://graph.facebook.com/v18.0/${userData.id}/instagram_business_accounts?access_token=${userToken}&fields=id,username,name`
      );
      const igDirectData = await igDirectRes.json();
      console.log('Instagram business accounts response:', JSON.stringify(igDirectData));
      
      if (igDirectData.data && igDirectData.data.length > 0) {
        for (const igAccount of igDirectData.data) {
          const igUsername = igAccount.username || igAccount.name || igAccount.id;
          const isDefault = savedCount === 0;
          
          await supabase.from('social_pages').upsert(
            {
              user_id: oauthState.user_id,
              connection_id: connection.id,
              platform: 'instagram',
              page_id: igAccount.id,
              page_name: igUsername,
              page_username: igUsername,
              is_default: isDefault,
              is_active: true,
            },
            { onConflict: 'connection_id,page_id' }
          );
          savedCount++;
          console.log('Saved IG account:', igUsername);
        }
      }
    } catch (e) {
      console.log('Instagram business accounts endpoint failed:', e);
    }

    // If no IG accounts found, try via pages
    if (savedCount === 0) {
      const igAccountsRes = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}&fields=id,name,access_token,instagram_business_account`
      );
      const igAccountsData = await igAccountsRes.json();

      if (igAccountsData.data && igAccountsData.data.length > 0) {
        for (const page of igAccountsData.data) {
          if (page.instagram_business_account) {
            const igAccountId = page.instagram_business_account.id;
            
            const igRes = await fetch(
              `https://graph.facebook.com/v18.0/${igAccountId}?fields=username,name&access_token=${page.access_token || userToken}`
            );
            const igData = await igRes.json();
            const igUsername = igData.username || page.name;
            const isDefault = savedCount === 0;

            await supabase.from('social_pages').upsert(
              {
                user_id: oauthState.user_id,
                connection_id: connection.id,
                platform: 'instagram',
                page_id: igAccountId,
                page_name: igUsername,
                page_username: igUsername,
                is_default: isDefault,
                is_active: true,
              },
              { onConflict: 'connection_id,page_id' }
            );
            savedCount++;
          }
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
