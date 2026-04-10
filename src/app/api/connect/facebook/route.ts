import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const state = crypto.randomBytes(16).toString('hex');

  // Clean up any old states for this user+platform
  await supabase
    .from('oauth_states')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', 'facebook');

  await supabase.from('oauth_states').insert({
    user_id: user.id,
    state,
    code_verifier: '',
    platform: 'facebook',
  });

  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_manage_metadata',
    'business_management',
  ].join(',');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.FACEBOOK_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook`,
    scope: scopes,
    state,
  });

  return Response.redirect(`https://www.facebook.com/v18.0/dialog/oauth?${params}`);
}
