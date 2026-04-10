import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  exchangeCodeForUserToken,
  getAllPages,
  getInstagramProfile,
  getMe,
} from '@/lib/meta';

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const redirectUri = `${appUrl}/api/auth/callback/instagram`;

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorReason = url.searchParams.get('error_reason');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    console.error('[INSTAGRAM CALLBACK] OAuth error', { error, errorReason, errorDescription });
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=${error}`);
  }

  if (!code || !state) {
    console.error('[INSTAGRAM CALLBACK] Missing code or state');
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=missing_params`);
  }

  // Verify state in database
  const supabase = await createClient();
  const { data: oauthState, error: stateError } = await supabase
    .from('oauth_states')
    .select('*')
    .eq('state', state)
    .eq('platform', 'instagram')
    .single();

  if (stateError || !oauthState) {
    console.error('[INSTAGRAM CALLBACK] Invalid state');
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

    // Get all pages and their Instagram links
    const pages = await getAllPages(userAccessToken);

    console.log('[INSTAGRAM CALLBACK] Raw pages discovered', {
      userId: me.id,
      pageCount: pages.length,
      pages: pages.map((p) => ({
        id: p.id,
        name: p.name,
        tasks: p.tasks,
        hasPageAccessToken: !!p.access_token,
        instagram_business_account: p.instagram_business_account || null,
      })),
    });

    // Extract only pages with Instagram business accounts
    const instagramConnections = [];

    for (const page of pages) {
      if (!page.instagram_business_account?.id || !page.access_token) {
        continue;
      }

      // Validate IG account by fetching profile
      const igProfile = await getInstagramProfile(
        page.instagram_business_account.id,
        page.access_token
      );

      if (igProfile.error) {
        console.error('[INSTAGRAM CALLBACK] IG validation failed', {
          pageId: page.id,
          pageName: page.name,
          igId: page.instagram_business_account.id,
          error: igProfile.error,
        });
        continue;
      }

      instagramConnections.push({
        platform: 'instagram',
        linkedPageId: page.id,
        linkedPageName: page.name,
        instagramUserId: igProfile.id,
        username: igProfile.username || page.instagram_business_account.username || null,
        name: igProfile.name || null,
        biography: igProfile.biography || null,
        followersCount: igProfile.followers_count ?? null,
        followsCount: igProfile.follows_count ?? null,
        mediaCount: igProfile.media_count ?? null,
        profilePictureUrl:
          igProfile.profile_picture_url ||
          page.instagram_business_account.profile_picture_url ||
          null,
        pageAccessToken: page.access_token,
      });
    }

    console.log('[INSTAGRAM CALLBACK] IG accounts connected', {
      count: instagramConnections.length,
      accounts: instagramConnections.map((ig) => ({
        instagramUserId: ig.instagramUserId,
        username: ig.username,
        linkedPageId: ig.linkedPageId,
        linkedPageName: ig.linkedPageName,
      })),
    });

    // Save each Instagram account
    let savedCount = 0;
    for (const ig of instagramConnections) {
      await supabase
        .from('social_connections')
        .delete()
        .eq('user_id', oauthState.user_id)
        .eq('platform', 'instagram')
        .eq('platform_user_id', ig.instagramUserId);

      const { error: insertError } = await supabase.from('social_connections').insert({
        user_id: oauthState.user_id,
        platform: 'instagram',
        platform_user_id: ig.instagramUserId,
        platform_username: ig.username,
        access_token: ig.pageAccessToken,
        refresh_token: tokenData.refresh_token || null,
        expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
      });

      if (!insertError) savedCount++;
    }

    if (savedCount > 0) {
      return Response.redirect(`${appUrl}/dashboard/connected-accounts?connected=instagram&count=${savedCount}`);
    } else {
      console.log('[INSTAGRAM CALLBACK] No Instagram accounts found');
      return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=no_instagram_account`);
    }
  } catch (err: any) {
    console.error('[INSTAGRAM CALLBACK] Fatal error', err);
    return Response.redirect(`${appUrl}/dashboard/connected-accounts?error=callback_error`);
  }
}
