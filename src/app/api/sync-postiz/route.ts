import { createClient } from '@supabase/supabase-js';
import { syncTokenToPostiz } from '@/lib/postiz-sync';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function POST(request: Request) {
  const { platform } = await request.json();

  // Get user from service role client (we need to look up by any parameter)
  // This endpoint should be called with the user's session
  // For now, we'll get user from authorization header

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get social connection for this user
  const { data: connection } = await supabaseAdmin
    .from('social_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('platform', platform)
    .single();

  if (!connection) {
    return Response.json({ error: 'No connection found' }, { status: 404 });
  }

  // Sync to Postiz
  try {
    const integrationId = await syncTokenToPostiz({
      supabaseUserId: user.id,
      platform: connection.platform,
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token || '',
      platformUserId: connection.platform_user_id || '',
      platformUsername: connection.platform_username || '',
      expiresAt: connection.expires_at || new Date().toISOString(),
    });

    // Store Postiz integration ID
    await supabaseAdmin
      .from('social_connections')
      .update({ postiz_integration_id: integrationId })
      .eq('user_id', user.id)
      .eq('platform', platform);

    return Response.json({ success: true, integrationId });
  } catch (error: any) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
