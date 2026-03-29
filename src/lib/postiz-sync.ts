import { createClient } from '@supabase/supabase-js';

const POSTIZ_URL = process.env.POSTIZ_URL || process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function syncTokenToPostiz(params: {
  supabaseUserId: string;
  platform: string;
  accessToken: string;
  refreshToken: string;
  platformUserId: string;
  platformUsername: string;
  expiresAt: string;
}) {
  // Get Postiz user for this Supabase user
  const { data: postizUser } = await supabaseAdmin
    .from('postiz_users')
    .select('*')
    .eq('supabase_user_id', params.supabaseUserId)
    .single();

  if (!postizUser) {
    throw new Error('Postiz user not found - run provisioning first');
  }

  // Map platform to Postiz provider identifier
  const providerMap: Record<string, string> = {
    'x': 'x',
    'linkedin': 'linkedin-oauth2',
    'linkedin-page': 'linkedin',
  };
  const providerIdentifier = providerMap[params.platform] || params.platform;

  // Connect to Postiz database directly
  const postizDb = await import('pg').then(pg => {
    return new pg.Pool({
      connectionString: process.env.POSTIZ_DATABASE_URL,
    });
  });

  // Insert/update integration in Postiz
  const result = await postizDb.query(`
    INSERT INTO "Integration" (
      id, "internalId", "organizationId", "name", 
      "providerIdentifier", "token", "refreshToken", "expiresIn", 
      "type", "profile", "disabled", "createdAt", "updatedAt"
    )
    VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, false, NOW(), NOW()
    )
    ON CONFLICT ("providerIdentifier", "organizationId") 
    DO UPDATE SET 
      token = $5, 
      "refreshToken" = $6, 
      "expiresIn" = $7, 
      "updatedAt" = NOW()
    RETURNING id
  `, [
    params.platformUserId,           // internalId
    postizUser.postiz_user_id,     // organizationId (Postiz user id)
    params.platformUsername,       // name
    providerIdentifier,             // providerIdentifier
    params.accessToken,             // token
    params.refreshToken,            // refreshToken
    params.expiresAt,               // expiresIn
    params.platform,                // type
    params.platformUsername,        // profile (JSON)
  ]);

  await postizDb.end();

  return result.rows[0].id;
}

export async function getPostizIntegrationId(supabaseUserId: string, platform: string) {
  // Get Postiz user for this Supabase user
  const { data: postizUser } = await supabaseAdmin
    .from('postiz_users')
    .select('*')
    .eq('supabase_user_id', supabaseUserId)
    .single();

  if (!postizUser) {
    return null;
  }

  const providerMap: Record<string, string> = {
    'x': 'x',
    'linkedin': 'linkedin-oauth2',
    'linkedin-page': 'linkedin',
  };
  const providerIdentifier = providerMap[platform] || platform;

  // Query Postiz database
  const postizDb = await import('pg').then(pg => {
    return new pg.Pool({
      connectionString: process.env.POSTIZ_DATABASE_URL,
    });
  });

  const result = await postizDb.query(`
    SELECT id FROM "Integration" 
    WHERE "organizationId" = $1 AND "providerIdentifier" = $2
  `, [postizUser.postiz_user_id, providerIdentifier]);

  await postizDb.end();

  return result.rows[0]?.id || null;
}
