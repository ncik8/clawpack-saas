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
  const platform = url.searchParams.get('platform') || 'x';
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('Unauthorized - no token', { status: 401 });
  }

  // Get user from Supabase
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return new Response('Unauthorized - invalid token', { status: 401 });
  }

  // Get Postiz token from our DB
  const { data: postizUser } = await supabaseAdmin
    .from('postiz_users')
    .select('postiz_auth_token')
    .eq('supabase_user_id', user.id)
    .single();

  const postizToken = postizUser?.postiz_auth_token;
  const password = generatePassword(user.id);

  const html = `<!DOCTYPE html>
<html>
<head><title>Connecting to ${platform}...</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 50px; background: #1f2937; color: white;">
<p style="font-size: 18px;">🔄 Connecting to ${platform}...</p>
<script>
(async () => {
  try {
    // Login to Postiz (sets cookie via credentials: include)
    const loginRes = await fetch('${POSTIZ_URL}/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '${user.email}',
        password: '${password}',
        provider: 'LOCAL'
      })
    });
    
    if (loginRes.ok) {
      console.log('Postiz login successful, redirecting to OAuth...');
      // Redirect to OAuth flow on Postiz
      window.location.href = '${POSTIZ_URL}/integrations/social/${platform}';
    } else {
      const text = await loginRes.text();
      document.body.innerHTML = '<p>❌ Login failed: ' + text + '</p><button onclick="window.close()">Close</button>';
    }
  } catch (err) {
    document.body.innerHTML = '<p>❌ Error: ' + err.message + '</p><button onclick="window.close()">Close</button>';
  }
})();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': 'https://clawpack-saas.vercel.app',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
