import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// ─── Config ───────────────────────────────────────────────
const POSTIZ_URL = process.env.POSTIZ_URL || process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POSTIZ_PASSWORD_SECRET = process.env.POSTIZ_PASSWORD_SECRET!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Helpers ──────────────────────────────────────────────

function generatePassword(userId: string): string {
  return createHash('sha256')
    .update(userId + POSTIZ_PASSWORD_SECRET)
    .digest('hex')
    .slice(0, 32);
}

async function getSupabaseUser(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(
    authHeader.substring(7)
  );

  if (error || !user?.email) return null;
  return { id: user.id, email: user.email };
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  delayMs = 1500
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });

      if (res.status >= 500 && attempt < retries) {
        const body = await res.text();
        console.warn(`Attempt ${attempt + 1} failed: ${res.status} ${body.slice(0, 100)}`);
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }

      return res;
    } catch (err: any) {
      if (attempt < retries) {
        console.warn(`Attempt ${attempt + 1} error: ${err.message}`);
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  throw new Error('All retries exhausted');
}

// Extract token from Set-Cookie header (Postiz stores token in cookie)
function extractTokenFromCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  
  // Handle array of cookies
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  
  for (const cookie of cookies) {
    // Match auth= token
    const match = cookie.match(/auth=([^;]+)/);
    if (match) return match[1];
    
    // Or token= field
    const tokenMatch = cookie.match(/token=([^;]+)/);
    if (tokenMatch) return tokenMatch[1];
  }
  
  return null;
}

function safeJsonParse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ─── Main Handler ─────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabaseUser = await getSupabaseUser(request);
    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📦 Provisioning:', supabaseUser.email);

    // Check if already provisioned
    const { data: existing } = await supabaseAdmin
      .from('postiz_users')
      .select('postiz_auth_token')
      .eq('supabase_user_id', supabaseUser.id)
      .maybeSingle();

    if (existing?.postiz_auth_token) {
      console.log('✅ Already provisioned');
      return NextResponse.json({
        success: true,
        token: existing.postiz_auth_token,
        message: 'Already provisioned',
      });
    }

    const password = generatePassword(supabaseUser.id);

    // Register
    let userExists = false;

    const registerRes = await fetchWithRetry(
      `${POSTIZ_URL}/api/auth/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: supabaseUser.email,
          password,
          name: `user-${supabaseUser.id.slice(0, 8)}`,
          company: 'Clawpack',
          provider: 'LOCAL',
        }),
      }
    );

    const registerText = await registerRes.text();
    console.log('📝 Register:', registerRes.status, registerText.slice(0, 200));

    if (!registerRes.ok) {
      const isHtml = registerText.trim().startsWith('<');

      if (isHtml) {
        console.error('❌ Postiz server unreachable:', registerText.slice(0, 100));
        return NextResponse.json(
          { error: 'Postiz server is temporarily unavailable', hint: 'Check if post.clawpack.net is running' },
          { status: 503 }
        );
      }

      const lower = registerText.toLowerCase();
      if (lower.includes('exist') || lower.includes('already') || lower.includes('duplicate')) {
        userExists = true;
        console.log('👤 User already exists, proceeding to login');
      } else {
        console.error('❌ Register failed:', registerText);
        return NextResponse.json({ error: 'Registration failed', details: registerText.slice(0, 500) }, { status: 500 });
      }
    }

    // Login to get token from cookie
    const loginRes = await fetchWithRetry(
      `${POSTIZ_URL}/api/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: supabaseUser.email,
          password,
          provider: 'LOCAL',
        }),
      }
    );

    const loginText = await loginRes.text();
    console.log('🔑 Login:', loginRes.status, loginText.slice(0, 200));

    // Check for Set-Cookie header FIRST (Postiz may return token in cookie)
    const setCookieHeader = loginRes.headers.get('set-cookie');
    console.log('🍪 Set-Cookie header:', setCookieHeader?.slice(0, 200));
    
    let token = extractTokenFromCookie(setCookieHeader);

    // Also try JSON fields as fallback
    if (!token) {
      const loginData = safeJsonParse(loginText);
      if (loginData) {
        token = loginData.access_token || loginData.token || loginData.auth || loginData.jwt;
      }
    }

    console.log('🎫 Token:', token ? `${token.slice(0, 15)}...` : 'NULL');

    if (!token) {
      console.error('❌ No token found. Login response:', loginText.slice(0, 300));
      console.error('❌ Set-Cookie was:', setCookieHeader);
      return NextResponse.json(
        { error: 'No token received from Postiz', details: loginText },
        { status: 502 }
      );
    }

    // Store in Supabase
    const { error: dbError } = await supabaseAdmin
      .from('postiz_users')
      .upsert(
        {
          supabase_user_id: supabaseUser.id,
          postiz_auth_token: token,
          postiz_password: password,
          token_updated_at: new Date().toISOString(),
        },
        { onConflict: 'supabase_user_id' }
      );

    if (dbError) {
      console.error('❌ DB error:', dbError);
      return NextResponse.json({ error: 'Failed to store token' }, { status: 500 });
    }

    console.log('✅ Provisioned successfully:', supabaseUser.email);
    return NextResponse.json({ success: true, token, message: 'Provisioned successfully' });
  } catch (error: any) {
    console.error('💥 Provision error:', error.message || error);
    return NextResponse.json({ error: 'Provisioning failed', message: error.message || 'Unknown error' }, { status: 500 });
  }
}
