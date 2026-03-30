import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();

  // Get user from cookie session
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Store user info for callback verification
  await supabase.from('oauth_states').insert({
    user_id: user.id,
    state: user.id, // Use user_id as state for simple mapping
    code_verifier: '',
    platform: 'x',
  });

  // Use Twitter's Sign in with OAuth 1.0a compatible URL
  // oauth_callback must match what we put in Twitter app settings
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/callback/x`;
  
  // Build the Twitter OAuth URL - we'll use the request token approach
  // First, get request token
  const requestTokenRes = await fetch('https://api.twitter.com/oauth/request_token', {
    method: 'POST',
    headers: {
      'Authorization': `OAuth oauth_callback="${encodeURIComponent(callbackUrl)}", oauth_consumer_key="${process.env.TWITTER_CLIENT_ID}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${Math.floor(Date.now() / 1000)}", oauth_nonce="${Math.random().toString(36).substring(2)}", oauth_version="1.0"`,
    },
  });

  const requestBody = await requestTokenRes.text();
  
  if (!requestTokenRes.ok) {
    console.error('Failed to get request token:', requestBody);
    return new Response(`Failed to get request token: ${requestBody}`, { status: 500 });
  }

  // Parse oauth_token from response
  const params = new URLSearchParams(requestBody);
  const oauthToken = params.get('oauth_token');
  const oauthVerifier = params.get('oauth_verifier');

  if (!oauthToken) {
    return new Response(`No oauth_token in response: ${requestBody}`, { status: 500 });
  }

  // Update oauth_states with the token
  await supabase.from('oauth_states').update({
    state: oauthToken,
    code_verifier: oauthVerifier || '',
  }).eq('user_id', user.id).eq('platform', 'x');

  // Redirect to Twitter authorization
  return Response.redirect(`https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`);
}