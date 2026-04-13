import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  exchangeCodeForUserToken,
  getAllPages,
  getMe,
} from '@/lib/meta';

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const redirectUri = `${appUrl}/api/auth/callback/facebook`;

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorReason = url.searchParams.get('error_reason');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    console.error('[FACEBOOK CALLBACK] OAuth error', { error, errorReason, errorDescription });
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=${error}`);
  }

  if (!code || !state) {
    console.error('[FACEBOOK CALLBACK] Missing code or state');
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=missing_params`);
  }

  // Verify state in database
  const supabase = await createClient();
  const { data: oauthState, error: stateError } = await supabase
    .from('oauth_states')
    .select('*')
    .eq('state', state)
    .eq('platform', 'facebook')
    .single();

  if (stateError || !oauthState) {
    console.error('[FACEBOOK CALLBACK] Invalid state');
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=invalid_state`);
  }

  // Clean up state
  await supabase.from('oauth_states').delete().eq('state', state);

  try {
    // Exchange code for token
    const tokenData = await exchangeCodeForUserToken(code, redirectUri);
    const userAccessToken = tokenData.access_token;

    // Get user info
    const me = await getMe(userAccessToken);
    if (me.error) {
      throw new Error(`Failed to get user: ${me.error.message}`);
    }

    // Get all pages with Instagram links
    const pages = await getAllPages(userAccessToken);

    console.log('[FACEBOOK CALLBACK] Pages discovered', {
      userId: me.id,
      pageCount: pages.length,
      pages: pages.map((p) => ({
        id: p.id,
        name: p.name,
        hasIg: !!p.instagram_business_account,
      })),
    });

    // Step 1: Save/update Facebook connection in social_connections
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .upsert(
        {
          user_id: oauthState.user_id,
          platform: 'facebook',
          platform_user_id: me.id,
          platform_username: me.name,
          access_token: userAccessToken,
          refresh_token: tokenData.refresh_token || null,
          expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
        },
        { onConflict: 'user_id,platform' }
      )
      .select()
      .single();

    if (connError || !connection) {
      console.error('[FACEBOOK CALLBACK] Failed to save connection:', connError);
      throw new Error('Failed to save Facebook connection');
    }

    console.log('[FACEBOOK CALLBACK] Connection saved, id:', connection.id);

    // Step 2: Save each Facebook Page to social_pages
    let savedCount = 0;
    
    // First, deactivate all existing Facebook pages for this connection
    await supabase
      .from('social_pages')
      .update({ is_active: false })
      .eq('connection_id', connection.id)
      .eq('platform', 'facebook');

    for (const page of pages) {
      // Determine if this should be the default page (first one)
      const isDefault = savedCount === 0;
      
      const { error: pageError } = await supabase
        .from('social_pages')
        .upsert(
          {
            user_id: oauthState.user_id,
            connection_id: connection.id,
            platform: 'facebook',
            page_id: page.id,
            page_name: page.name,
            page_access_token: page.access_token || userAccessToken,
            is_default: isDefault,
            is_active: true,
          },
          { onConflict: 'connection_id,page_id' }
        );

      if (!pageError) savedCount++;
    }

    // If no pages, save user as fallback
    if (savedCount === 0) {
      await supabase
        .from('social_pages')
        .upsert(
          {
            user_id: oauthState.user_id,
            connection_id: connection.id,
            platform: 'facebook',
            page_id: me.id,
            page_name: me.name,
            page_access_token: userAccessToken,
            is_default: true,
            is_active: true,
          },
          { onConflict: 'connection_id,page_id' }
        );
      savedCount = 1;
    }

    console.log('[FACEBOOK CALLBACK] Saved', savedCount, 'Facebook pages');
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=facebook&count=${savedCount}`);
  } catch (err: any) {
    console.error('[FACEBOOK CALLBACK] Fatal error', err);
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=callback_error`);
  }
}
