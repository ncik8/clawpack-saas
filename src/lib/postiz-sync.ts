import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function getPostizToken(supabaseUserId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('postiz_users')
    .select('postiz_auth_token')
    .eq('supabase_user_id', supabaseUserId)
    .single();
  
  if (error || !data) return null;
  return data.postiz_auth_token;
}

export async function syncTokenToPostiz(params: {
  supabaseUserId: string;
  platform: string;
  accessToken: string;
  refreshToken: string;
  platformUserId: string;
  platformUsername: string;
  expiresAt: string;
}) {
  // Get Postiz auth token for this user
  const postizToken = await getPostizToken(params.supabaseUserId);
  
  if (!postizToken) {
    throw new Error('Postiz user not provisioned - run provisioning first');
  }

  // Map platform to Postiz identifier
  const providerMap: Record<string, string> = {
    'x': 'x',
    'linkedin': 'linkedin-oauth2',
    'linkedin-page': 'linkedin',
  };
  const providerIdentifier = providerMap[params.platform] || params.platform;

  // Use Postiz API to connect the integration
  const res = await fetch(`${POSTIZ_URL}/api/integrations/social/${providerIdentifier}/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${postizToken}`,
    },
    body: JSON.stringify({
      token: params.accessToken,
      refreshToken: params.refreshToken,
      expiresIn: params.expiresAt,
      internalId: params.platformUserId,
      username: params.platformUsername,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to sync: ${error}`);
  }

  return await res.json();
}

export async function getPostizIntegrationId(supabaseUserId: string, platform: string) {
  const postizToken = await getPostizToken(supabaseUserId);
  
  if (!postizToken) {
    return null;
  }

  const providerMap: Record<string, string> = {
    'x': 'x',
    'linkedin': 'linkedin-oauth2',
    'linkedin-page': 'linkedin',
  };
  const providerIdentifier = providerMap[platform] || platform;

  // Get integrations from Postiz
  const res = await fetch(`${POSTIZ_URL}/api/integrations/list`, {
    headers: {
      'Authorization': `Bearer ${postizToken}`,
    },
  });

  if (!res.ok) {
    return null;
  }

  const integrations = await res.json();
  const integration = integrations.find((i: any) => i.provider === providerIdentifier);
  
  return integration?.id || null;
}
