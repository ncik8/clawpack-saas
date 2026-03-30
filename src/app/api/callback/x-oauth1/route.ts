import { NextRequest, NextResponse } from 'next/server';
import { buildOAuthHeader, parseFormEncoded } from '@/lib/x-oauth';
import { getSupabaseServerClient } from '@/lib/supabase-server';

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

  const { data: pending, error: pendingError } = await supabase
    .from('social_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('platform', 'x_oauth1_pending')
    .single();

  if (pendingError || !pending) {
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

  const authHeader = buildOAuthHeader({
    method: 'POST',
    url: accessUrl,
    consumerKey: process.env.X_API_KEY!,
    consumerSecret: process.env.X_API_SECRET!,
    token: {
      key: pending.access_token,
      secret: pending.refresh_token,
    },
    verifier: oauthVerifier,
  });

  const res = await fetch(accessUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json(
      { error: `Access token exchange failed: ${text}` },
      { status: 500 }
    );
  }

  const parsed = parseFormEncoded(text);

  if (!parsed.oauth_token || !parsed.oauth_token_secret || !parsed.user_id || !parsed.screen_name) {
    return NextResponse.json(
      { error: `Invalid access token response: ${text}` },
      { status: 500 }
    );
  }

  const { error: upsertError } = await supabase
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
    return NextResponse.json(
      { error: upsertError.message },
      { status: 500 }
    );
  }

  await supabase
    .from('social_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', 'x_oauth1_pending');

  return NextResponse.redirect(new URL('/dashboard/connected-accounts?connected=x', request.url));
}
