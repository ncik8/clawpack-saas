import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Simple state (no PKCE for LinkedIn)
  const state = crypto.randomBytes(8).toString('base64url');

  // Clean up any old states for this user+platform
  await supabase
    .from('oauth_states')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', 'linkedin');

  await supabase.from('oauth_states').insert({
    user_id: user.id,
    state,
    code_verifier: '',
    platform: 'linkedin',
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/linkedin`,
    scope: 'openid profile w_member_social',
    state,
  });

  return Response.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
}