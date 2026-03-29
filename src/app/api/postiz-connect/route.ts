import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const POSTIZ_URL = process.env.POSTIZ_URL || process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POSTIZ_PASSWORD_SECRET = process.env.POSTIZ_PASSWORD_SECRET!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function generatePassword(userId: string): string {
  return createHash('sha256')
    .update(userId + POSTIZ_PASSWORD_SECRET)
    .digest('hex')
    .slice(0, 32);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const platform = url.searchParams.get('platform');

  if (!platform) {
    return new Response('Missing platform', { status: 400 });
  }

  // Get user from Supabase via Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Generate deterministic password
  const password = generatePassword(user.id);

  // Login to Postiz server-side
  const loginRes = await fetch(`${POSTIZ_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: user.email,
      password: password,
      provider: 'LOCAL'
    }),
  });

  if (!loginRes.ok) {
    return new Response(`Postiz login failed: ${loginRes.status}`, { status: 500 });
  }

  // Extract JWT from Set-Cookie
  const setCookie = loginRes.headers.get('set-cookie');
  const authToken = setCookie?.match(/auth=([^;]+)/)?.[1];

  if (!authToken) {
    return new Response('No auth token from Postiz', { status: 500 });
  }

  // Redirect to auth-bridge: nginx sets cookie and redirects to OAuth
  const redirectPath = `/integrations/social/${platform}`;
  const bridgeUrl = `${POSTIZ_URL}/auth-bridge?token=${encodeURIComponent(authToken)}&redirect=${encodeURIComponent(redirectPath)}`;

  return Response.redirect(bridgeUrl, 302);
}
