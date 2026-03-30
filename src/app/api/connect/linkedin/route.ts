import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Generate PKCE values
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // Generate random state for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');

  // Clean up any old states for this user+platform
  await supabase
    .from('oauth_states')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', 'linkedin');

  await supabase.from('oauth_states').insert({
    user_id: user.id,
    state,
    code_verifier: codeVerifier,
    platform: 'linkedin',
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/linkedin`,
    scope: 'openid profile w_member_social',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return Response.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
}