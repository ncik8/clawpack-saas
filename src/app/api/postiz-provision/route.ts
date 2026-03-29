import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const POSTIZ_URL = process.env.POSTIZ_URL || process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getSupabaseUser(request: Request): Promise<{ id: string; email: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) return null;
  if (!user.email) return null;
  return { id: user.id, email: user.email };
}

function extractAuthToken(headers: Headers): string | null {
  // Use getSetCookie() which is the proper way in Vercel/Node
  const cookieArray = headers.getSetCookie?.() || [headers.get('set-cookie')].filter(Boolean);
  
  for (const cookie of cookieArray) {
    const match = cookie.match(/auth=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

async function registerPostiz(email: string, password: string, userId: string) {
  return fetch(`${POSTIZ_URL}/api/auth/register`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      name: `user-${userId.slice(0, 8)}`,
      company: 'Clawpack',
      provider: 'LOCAL'
    }),
    signal: AbortSignal.timeout(10000)
  });
}

async function loginPostiz(email: string, password: string) {
  return fetch(`${POSTIZ_URL}/api/auth/login`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      provider: 'LOCAL'
    }),
    signal: AbortSignal.timeout(10000)
  });
}

export async function POST(request: Request) {
  try {
    const supabaseUser = await getSupabaseUser(request);
    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 1: Check if already provisioned
    const { data: existing } = await supabaseAdmin
      .from('postiz_users')
      .select('postiz_auth_token')
      .eq('supabase_user_id', supabaseUser.id)
      .maybeSingle();

    if (existing?.postiz_auth_token) {
      return NextResponse.json({ 
        success: true, 
        token: existing.postiz_auth_token,
        message: 'Using existing token' 
      });
    }

    // Step 2: Not provisioned - register first
    const password = crypto.randomUUID();
    
    const registerRes = await registerPostiz(supabaseUser.email, password, supabaseUser.id);
    
    // If user already exists in Postiz but not in our DB - can't recover
    if (!registerRes.ok) {
      const text = await registerRes.text();
      
      if (text.toLowerCase().includes('exists')) {
        console.error('Postiz user out of sync:', supabaseUser.email);
        return NextResponse.json({
          error: 'User exists in Postiz but not linked. Please contact support.'
        }, { status: 409 });
      }
      
      console.error('Register failed:', text);
      return NextResponse.json({ error: 'Registration failed', details: text }, { status: 500 });
    }

    // Step 3: Login after successful registration
    const loginRes = await loginPostiz(supabaseUser.email, password);

    if (!loginRes.ok) {
      const text = await loginRes.text();
      console.error('Login failed:', text);
      return NextResponse.json({ error: 'Login failed', details: text }, { status: 500 });
    }

    // Step 4: Extract token properly using getSetCookie
    const token = extractAuthToken(loginRes.headers);

    if (!token) {
      console.error('No token in cookie. Headers:', loginRes.headers.get('set-cookie'));
      return NextResponse.json({ error: 'No token received' }, { status: 500 });
    }

    // Step 5: Store token
    const { error: dbError } = await supabaseAdmin
      .from('postiz_users')
      .upsert({
        supabase_user_id: supabaseUser.id,
        postiz_auth_token: token,
        token_updated_at: new Date().toISOString(),
      }, {
        onConflict: 'supabase_user_id'
      });

    if (dbError) {
      console.error('DB error:', dbError);
      return NextResponse.json({ error: 'Failed to store token' }, { status: 500 });
    }

    console.log('Postiz provisioned:', supabaseUser.email);
    return NextResponse.json({ success: true, token, message: 'Provisioned successfully' });
  } catch (error) {
    console.error('Provision error:', error);
    return NextResponse.json({ error: 'Provisioning failed' }, { status: 500 });
  }
}
