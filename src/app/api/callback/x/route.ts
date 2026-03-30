import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const oauthToken = url.searchParams.get('oauth_token');
  const oauthVerifier = url.searchParams.get('oauth_verifier');
  const denied = url.searchParams.get('denied');

  // User denied authorization
  if (denied) {
    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connected-accounts?error=denied`);
  }

  if (!oauthToken || !oauthVerifier) {
    return new Response('Missing OAuth params', { status: 400 });
  }

  const supabase = await createClient();

  // Find the oauth_state with this token
  const { data: oauthState, error } = await supabase
    .from('oauth_states')
    .select('*')
    .eq('state', oauthToken)
    .single();

  if (error || !oauthState) {
    return new Response('Invalid OAuth state', { status: 400 });
  }

  // Delete state immediately (one-time use)
  await supabase.from('oauth_states').delete().eq('state', oauthToken);

  // Exchange request token + verifier for access token
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2);

  const tokenRes = await fetch('https://api.twitter.com/oauth/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `OAuth oauth_consumer_key="${process.env.TWITTER_CLIENT_ID}", oauth_token="${oauthToken}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${timestamp}", oauth_nonce="${nonce}", oauth_version="1.0"`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `oauth_verifier=${oauthVerifier}`,
  });

  const responseBody = await tokenRes.text();
  
  if (!tokenRes.ok) {
    console.error('Failed to get access token:', responseBody);
    return new Response(`Token exchange failed: ${responseBody}`, { status: 500 });
  }

  // Parse response - format is: oauth_token=xxx&oauth_token_secret=yyy&user_id=zzz&screen_name=abc
  const params = new URLSearchParams(responseBody);
  const accessToken = params.get('oauth_token');
  const accessTokenSecret = params.get('oauth_token_secret');
  const twitterUserId = params.get('user_id');
  const twitterScreenName = params.get('screen_name');

  if (!accessToken) {
    return new Response(`No access token in response: ${responseBody}`, { status: 500 });
  }

  // Now get user's Twitter info using the access token
  // For OAuth 1.0a, we need to make an authenticated request
  // Using application-only auth for basic user info
  const bearerRes = await fetch('https://api.twitter.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const bearerData = await bearerRes.json();
  const bearerToken = bearerData.access_token;

  // Get Twitter user ID
  const userRes = await fetch('https://api.twitter.com/2/users/me', {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  const twitterUser = await userRes.json();

  // Store the OAuth 1.0a tokens (access token + access token secret)
  // We'll use these for posting later via our proxy
  await supabase.from('social_connections').upsert({
    user_id: oauthState.user_id,
    platform: 'x',
    platform_user_id: twitterUserId || twitterUser.data?.id,
    platform_username: twitterScreenName || twitterUser.data?.username,
    access_token: accessToken,
    refresh_token: accessTokenSecret, // Store secret as refresh_token
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year for OAuth 1.0a
  }, {
    onConflict: 'user_id,platform'
  });

  // Redirect back to connected accounts with success
  return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connected-accounts?connected=x`);
}