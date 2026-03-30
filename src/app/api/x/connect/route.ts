import { NextResponse } from 'next/server';
import { buildOAuthHeader, parseFormEncoded } from '@/lib/x-oauth';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = 'https://api.twitter.com/oauth/request_token';

  const authHeader = buildOAuthHeader({
    method: 'POST',
    url,
    consumerKey: process.env.X_API_KEY!,
    consumerSecret: process.env.X_API_SECRET!,
    callback: process.env.X_CALLBACK_URL!,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json({ error: `Request token failed: ${text}` }, { status: 500 });
  }

  const parsed = parseFormEncoded(text);
  if (!parsed.oauth_token || !parsed.oauth_token_secret) {
    return NextResponse.json(
      { error: `Invalid request token response: ${text}` },
      { status: 500 }
    );
  }

  const { error: dbError } = await supabase
    .from('social_connections')
    .upsert(
      {
        user_id: user.id,
        platform: 'x_oauth1_pending',
        platform_user_id: null,
        platform_username: null,
        access_token: parsed.oauth_token,
        refresh_token: parsed.oauth_token_secret,
        expires_at: null,
      },
      {
        onConflict: 'user_id,platform',
      }
    );

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const redirectUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${encodeURIComponent(parsed.oauth_token)}`;
  return NextResponse.redirect(redirectUrl);
}
