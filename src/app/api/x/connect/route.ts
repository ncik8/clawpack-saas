import { NextResponse } from 'next/server';
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

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = 'https://api.twitter.com/oauth/request_token';

  const authHeader = buildOAuthHeaderUrlEncoded({
    method: 'POST',
    url,
    consumerKey: process.env.X_API_KEY!,
    consumerSecret: process.env.X_API_SECRET!,
    accessToken: '',
    accessTokenSecret: '',
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

  const oauthToken = parsed.oauth_token;
  const oauthSecret = parsed.oauth_token_secret;

  console.log('[x-connect] user:', user.id);
  console.log('[x-connect] token:', oauthToken);
  console.log('[x-connect] secret:', oauthSecret);

  // Clean up old pending tokens for this user (both platforms)
  await supabaseAdmin
    .from('social_connections')
    .delete()
    .eq('user_id', user.id)
    .in('platform', ['x_oauth1_pending', 'x']);

  // Insert pending token with explicit columns
  const insertResult = await supabaseAdmin
    .from('social_connections')
    .insert({
      user_id: user.id,
      platform: 'x_oauth1_pending',
      platform_user_id: null,
      platform_username: null,
      access_token: oauthToken,
      refresh_token: oauthSecret,
      expires_at: null,
    })
    .select();

  console.log('[x-connect] insert result:', JSON.stringify(insertResult));

  if (insertResult.error) {
    console.error('[x-connect] insert failed:', insertResult.error);
    return NextResponse.json(
      { error: `Failed to store pending token: ${insertResult.error.message}` },
      { status: 500 }
    );
  }

  // Verify it was stored
  const { data: verify } = await supabaseAdmin
    .from('social_connections')
    .select('id, platform, access_token')
    .eq('user_id', user.id)
    .eq('platform', 'x_oauth1_pending')
    .maybeSingle();

  console.log('[x-connect] verify after insert:', verify);

  const redirectUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${encodeURIComponent(oauthToken)}`;
  return NextResponse.redirect(redirectUrl);
}