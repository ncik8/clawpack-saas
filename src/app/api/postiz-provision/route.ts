import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const POSTIZ_URL = process.env.POSTIZ_URL || process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POSTIZ_PASSWORD_SECRET = process.env.POSTIZ_PASSWORD_SECRET || 'default-secret';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Deterministic password based on user ID - stable across provisioning attempts
function generatePassword(userId: string): string {
  return createHash('sha256')
    .update(userId + POSTIZ_PASSWORD_SECRET)
    .digest('hex')
    .slice(0, 32);
}

async function getSupabaseUser(request: Request): Promise<{ id: string; email: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) return null;
  if (!user.email) return null;
  return { id: user.id, email: user.email };
}

export async function POST(request: Request) {
  try {
    const supabaseUser = await getSupabaseUser(request);
    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if already provisioned
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

    // Generate deterministic password (stable for this user)
    const password = generatePassword(supabaseUser.id);
    
    // Try to register user
    const registerRes = await fetch(`${POSTIZ_URL}/api/auth/register`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: supabaseUser.email,
        password: password,
        name: `user-${supabaseUser.id.slice(0, 8)}`,
        company: 'Clawpack',
        provider: 'LOCAL'
      }),
      signal: AbortSignal.timeout(10000)
    });

    // If user exists, that's OK - continue to login
    if (!registerRes.ok) {
      const text = await registerRes.text();
      if (!text.toLowerCase().includes('exists')) {
        console.error('Register failed:', text);
        return NextResponse.json({ error: 'Registration failed', details: text }, { status: 500 });
      }
      console.log('User already exists in Postiz, attempting login');
    }

    // Login and get token from JSON response
    const loginRes = await fetch(`${POSTIZ_URL}/api/auth/login`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: supabaseUser.email,
        password: password,
        provider: 'LOCAL'
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!loginRes.ok) {
      const text = await loginRes.text();
      console.error('Login failed:', text);
      return NextResponse.json({ error: 'Login failed', details: text }, { status: 500 });
    }

    // Get token from JSON response - check multiple possible fields
    const loginData = await loginRes.json();
    const token = loginData.access_token || loginData.token || loginData.auth;

    if (!token) {
      console.error('No token in response:', loginData);
      return NextResponse.json({ error: 'No token received' }, { status: 500 });
    }

    // Store token
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
