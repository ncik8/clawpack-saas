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
    .eq('platform', 'instagram');

  await supabase.from('oauth_states').insert({
    user_id: user.id,
    state,
    code_verifier: '',
    platform: 'instagram',
  });

  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_comments',
    'instagram_manage_insights',
  ].join(',');

  // Use standard OAuth dialog - Instagram accounts come through /me/accounts discovery
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/instagram`,
    scope: scopes,
    response_type: 'code',
    state,
  });

  return Response.redirect(`https://www.facebook.com/v18.0/dialog/oauth?${params}`);
}
