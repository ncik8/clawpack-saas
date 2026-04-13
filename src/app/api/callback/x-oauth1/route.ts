import { NextRequest, NextResponse } from 'next/server';
import { buildOAuthHeaderUrlEncoded } from '@/lib/x-oauth';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dcyifihwvqxtpypphpef.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function parseFormEncoded(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

export async function GET(request: NextRequest) {
  const oauthToken = request.nextUrl.searchParams.get('oauth_token');
  const oauthVerifier = request.nextUrl.searchParams.get('oauth_verifier');

  if (!oauthToken || !oauthVerifier) {
    return NextResponse.json(
      { error: 'Missing oauth_token or oauth_verifier' },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[x-callback] user:', user.id);
  console.log('[x-callback] looking for pending token:', oauthToken);
  
  // Look for pending token under both old ('x') and new ('x_oauth1_pending') platform values
  const { data: pending, error: pendingError } = await supabaseAdmin
    .from('social_connections')
    .select('*')
    .eq('access_token', oauthToken)
    .in('platform', ['x_oauth1_pending', 'x'])
    .maybeSingle();
  
  console.log('[x-callback] pending query result:', { pending, pendingError });

  if (pendingError || !pending) {
    console.error('[x-callback] pending token not found:', { pendingError, pending });
    return NextResponse.json(
      { error: 'Pending OAuth token not found' },
      { status: 400 }
    );
  }

  if (pending.access_token !== oauthToken) {
    return NextResponse.json(
      { error: 'OAuth token mismatch' },
      { status: 400 }
    );
  }

  const accessUrl = 'https://api.twitter.com/oauth/access_token';
  const bodyParams = {
    oauth_verifier: oauthVerifier,
  };

  const authHeader = buildOAuthHeaderUrlEncoded({
    method: 'POST',
    url: accessUrl,
    consumerKey: process.env.X_API_KEY!,
    consumerSecret: process.env.X_API_SECRET!,
    accessToken: pending.access_token,
    accessTokenSecret: pending.refresh_token,
    bodyParams,
  });

  const res = await fetch(accessUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(bodyParams).toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json(
      { error: `Access token exchange failed: ${text}` },
      { status: 500 }
    );
  }

  const parsed = parseFormEncoded(text);
  console.log('[x-callback] access token response:', {
    hasOauthToken: !!parsed.oauth_token,
    hasOauthSecret: !!parsed.oauth_token_secret,
    hasUserId: !!parsed.user_id,
    hasScreenName: !!parsed.screen_name,
  });

  if (!parsed.oauth_token || !parsed.oauth_token_secret || !parsed.user_id || !parsed.screen_name) {
    return NextResponse.json(
      { error: `Invalid access token response: ${text}` },
      { status: 500 }
    );
  }

  console.log('[x-callback] storing tokens for user:', user.id);

  // Try upsert first, if it fails due to constraint fall back to update
  const { error: upsertError } = await supabaseAdmin
    .from('social_connections')
    .upsert(
      {
        user_id: user.id,
        platform: 'x',
        platform_user_id: parsed.user_id,
        platform_username: parsed.screen_name,
        access_token: parsed.oauth_token,
        refresh_token: parsed.oauth_token_secret,
        expires_at: null,
      },
      {
        onConflict: 'user_id,platform',
      }
    );

  if (upsertError) {
    console.error('[x-callback] upsert failed, trying update:', upsertError);
    // Fall back: try update first, if 0 rows then insert
    const { error: updateErr } = await supabaseAdmin
      .from('social_connections')
      .update({
        platform_user_id: parsed.user_id,
        platform_username: parsed.screen_name,
        access_token: parsed.oauth_token,
        refresh_token: parsed.oauth_token_secret,
        expires_at: null,
      })
      .eq('user_id', user.id)
      .eq('platform', 'x');

    if (updateErr) {
      console.error('[x-callback] update also failed:', updateErr);
      return NextResponse.json(
        { error: `Failed to save tokens: ${upsertError.message}` },
        { status: 500 }
      );
    }
  }

  await supabaseAdmin
    .from('social_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', 'x');

  return NextResponse.redirect(new URL('/dashboard/connected-accounts?connected=x', request.url));
}
