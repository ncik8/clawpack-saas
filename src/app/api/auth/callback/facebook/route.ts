import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  try {
    if (error) {
      console.log('OAuth error:', error);
      return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=${error}`);
    }

    if (!code || !state) {
      console.log('Missing code or state');
      return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=missing_params`);
    }

    const supabase = await createClient();

    const { data: oauthState, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .single();

    if (stateError || !oauthState) {
      console.log('Invalid state:', stateError);
      return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=invalid_state`);
    }

    const platform = oauthState.platform;
    console.log('OAuth callback for platform:', platform);

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
    console.log('Token exchange response:', JSON.stringify(tokens));

    if (!tokenRes.ok || !tokens.access_token) {
      console.error('Token exchange failed:', tokens);
      return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=token_exchange_failed`);
    }

    const userToken = tokens.access_token;

    // Get user info
    const userRes = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${userToken}&fields=id,name`);
    const userData = await userRes.json();
    console.log('User data:', JSON.stringify(userData));

    // For Instagram - store ALL pages that have IG linked
    if (platform === 'instagram') {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}&fields=id,name,access_token,instagram_business_account`
      );
      const pagesData = await pagesRes.json();
      console.log('Instagram pages response:', JSON.stringify(pagesData));

      // Find all pages with Instagram linked
      const pagesWithIg = pagesData.data?.filter((p: any) => p.instagram_business_account) || [];
      console.log('Pages with IG:', pagesWithIg.length);

      // If no pages have IG linked, try to get IG accounts via multiple approaches
      if (pagesWithIg.length === 0) {
        console.log('No pages with IG linked, trying alternate endpoints...');
        
        // Approach 1: Try /me/identities which returns all connected identities including Instagram
        try {
          const identitiesRes = await fetch(
            `https://graph.facebook.com/v18.0/me/identities?access_token=${userToken}`
          );
          const identitiesData = await identitiesRes.json();
          console.log('Identities response:', JSON.stringify(identitiesData));
          
          if (identitiesData.data) {
            const igIdentities = identitiesData.data.filter((i: any) => i.type === 'INSTAGRAM');
            if (igIdentities.length > 0) {
              console.log('Found IG via identities:', igIdentities.length);
              for (const ig of igIdentities) {
                const igId = ig.id;
                const igUsername = ig.username || igId;
                
                await supabase
                  .from('social_connections')
                  .delete()
                  .eq('user_id', oauthState.user_id)
                  .eq('platform', 'instagram')
                  .eq('platform_user_id', igId);

                await supabase.from('social_connections').insert({
                  user_id: oauthState.user_id,
                  platform: 'instagram',
                  platform_user_id: igId,
                  platform_username: igUsername,
                  access_token: userToken,
                  refresh_token: tokens.refresh_token || null,
                  expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
                });
              }
              return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=instagram&count=${igIdentities.length}`);
            }
          }
        } catch (e) {
          console.log('Identities approach failed:', e);
        }
        
        // Approach 2: Try /me/accounts with instagram_business_accounts field
        try {
          const accountsRes = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}&fields=id,name,access_token,instagram_business_account`
          );
          const accountsData = await accountsRes.json();
          console.log('Accounts response:', JSON.stringify(accountsData));
          
          const igAccounts = accountsData.data?.filter((p: any) => p.instagram_business_account) || [];
          if (igAccounts.length > 0) {
            for (const page of igAccounts) {
              const igAccountId = page.instagram_business_account.id;
              const igInfoRes = await fetch(
                `https://graph.facebook.com/v18.0/${igAccountId}?fields=username,name&access_token=${userToken}`
              );
              const igInfo = await igInfoRes.json();
              
              await supabase
                .from('social_connections')
                .delete()
                .eq('user_id', oauthState.user_id)
                .eq('platform', 'instagram')
                .eq('platform_user_id', igAccountId);

              await supabase.from('social_connections').insert({
                user_id: oauthState.user_id,
                platform: 'instagram',
                platform_user_id: igAccountId,
                platform_username: igInfo.username || igInfo.name || igAccountId,
                access_token: page.access_token || userToken,
                refresh_token: tokens.refresh_token || null,
                expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
              });
            }
            return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=instagram&count=${igAccounts.length}`);
          }
        } catch (e) {
          console.log('Accounts approach failed:', e);
        }
        
        // Approach 3: For business OAuth, the IG accounts might be in the granted_scopes
        // Try to get them via the Instagram Graph API directly
        try {
          const igRes = await fetch(
            `https://graph.facebook.com/v18.0/${userData.id}?fields=instagram_business_accounts&access_token=${userToken}`
          );
          const igData = await igRes.json();
          console.log('IG direct response:', JSON.stringify(igData));
          
          if (igData.instagram_business_accounts?.data?.length > 0) {
            for (const igAccount of igData.instagram_business_accounts.data) {
              const igInfoRes = await fetch(
                `https://graph.facebook.com/v18.0/${igAccount.id}?fields=username,name&access_token=${userToken}`
              );
              const igInfo = await igInfoRes.json();
              
              await supabase
                .from('social_connections')
                .delete()
                .eq('user_id', oauthState.user_id)
                .eq('platform', 'instagram')
                .eq('platform_user_id', igAccount.id);

              await supabase.from('social_connections').insert({
                user_id: oauthState.user_id,
                platform: 'instagram',
                platform_user_id: igAccount.id,
                platform_username: igInfo.username || igAccount.name || igAccount.id,
                access_token: userToken,
                refresh_token: tokens.refresh_token || null,
                expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
              });
            }
            return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=instagram&count=${igData.instagram_business_accounts.data.length}`);
          }
        } catch (e) {
          console.log('IG direct approach failed:', e);
        }
        
        return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=no_instagram_account`);
      }

      // Store EACH page with IG as a separate connection
      for (const page of pagesWithIg) {
        const igAccountId = page.instagram_business_account.id;

        // Get IG username
        const igRes = await fetch(
          `https://graph.facebook.com/v18.0/${igAccountId}?fields=username&access_token=${page.access_token}`
        );
        const igData = await igRes.json();
        const igUsername = igData.username || page.name;

        console.log('Storing IG connection:', { igAccountId, igUsername });

        // Delete existing and insert new
        await supabase
          .from('social_connections')
          .delete()
          .eq('user_id', oauthState.user_id)
          .eq('platform', 'instagram')
          .eq('platform_user_id', igAccountId);

        const { error: insertError } = await supabase.from('social_connections').insert({
          user_id: oauthState.user_id,
          platform: 'instagram',
          platform_user_id: igAccountId,
          platform_username: igUsername,
          access_token: page.access_token,
          refresh_token: tokens.refresh_token || null,
          expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        });

        if (insertError) {
          console.error('IG insert error:', insertError);
        }
      }

      return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=instagram&count=${pagesWithIg.length}`);
    }

    // For Facebook - store ALL pages user selected
    if (platform === 'facebook') {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}&fields=id,name,access_token`
      );
      const pagesData = await pagesRes.json();
      console.log('Facebook pages response:', JSON.stringify(pagesData));

      if (pagesData.data && pagesData.data.length > 0) {
        console.log('Storing', pagesData.data.length, 'Facebook pages');
        
        // Store EACH page as a separate connection
        for (const page of pagesData.data) {
          console.log('Storing FB page:', page.id, page.name);
          
          // Delete existing and insert new
          await supabase
            .from('social_connections')
            .delete()
            .eq('user_id', oauthState.user_id)
            .eq('platform', 'facebook')
            .eq('platform_user_id', page.id);

          const { error: insertError } = await supabase.from('social_connections').insert({
            user_id: oauthState.user_id,
            platform: 'facebook',
            platform_user_id: page.id,
            platform_username: page.name,
            access_token: page.access_token,
            refresh_token: tokens.refresh_token || null,
            expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
          });

          if (insertError) {
            console.error('FB insert error:', insertError);
          }
        }
      } else {
        console.log('No FB pages, storing user token instead');
        await supabase
          .from('social_connections')
          .delete()
          .eq('user_id', oauthState.user_id)
          .eq('platform', 'facebook');
          
        await supabase.from('social_connections').insert({
          user_id: oauthState.user_id,
          platform: 'facebook',
          platform_user_id: userData.id,
          platform_username: userData.name,
          access_token: userToken,
          refresh_token: tokens.refresh_token || null,
          expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        });
      }
      return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=facebook&count=${pagesData.data?.length || 0}`);
    }

    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=unknown_platform`);
  } catch (err: any) {
    console.error('Callback error:', err);
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=callback_error`);
  }
}
