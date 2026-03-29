import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

export async function GET() {
  const supabase = await createClient();

  // Get user from cookie session
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Generate state and PKCE
  const state = crypto.randomBytes(32).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // Store state in database
  await supabase.from('oauth_states').insert({
    user_id: user.id,
    state,
    code_verifier: codeVerifier,
    platform: 'x',
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TWITTER_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/callback/x`,
    scope: 'tweet.read users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return Response.redirect(`https://twitter.com/i/oauth2/authorize?${params}`);
}
