import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function generatePassword(): string {
  return crypto.randomUUID() + '-' + crypto.randomUUID();
}

async function getSupabaseUser(request: Request): Promise<{ id: string; email: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) return null;
  return { id: user.id, email: user.email || '' };
}

export async function POST(request: Request) {
  try {
    const supabaseUser = await getSupabaseUser(request);
    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has Postiz account
    const { data: existingUser } = await supabaseAdmin
      .from('postiz_users')
      .select('postiz_auth_token')
      .eq('supabase_user_id', supabaseUser.id)
      .single();

    if (existingUser?.postiz_auth_token) {
      // Already provisioned - return success
      return NextResponse.json({ success: true, message: 'Already provisioned' });
    }

    // Generate random password for Postiz
    const password = generatePassword();

    // Try to register with Postiz (use identifier instead of email)
    const registerResponse = await fetch(`${POSTIZ_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: supabaseUser.email,
        password: password,
        name: supabaseUser.email.split('@')[0],
        company: 'ClawPack User',
        provider: 'LOCAL',
      }),
    });

    // Register might fail if user exists - that's OK, try login
    let loginResponse;
    if (registerResponse.ok) {
      loginResponse = registerResponse;
    } else {
      // User already exists, try login with identifier
      loginResponse = await fetch(`${POSTIZ_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: supabaseUser.email,
          password: password,
          provider: 'LOCAL',
        }),
      });
    }

    if (!loginResponse.ok) {
      const text = await loginResponse.text();
      return NextResponse.json({ error: 'Postiz login failed', details: text }, { status: 500 });
    }

    // Extract auth token from response
    const setCookie = loginResponse.headers.get('set-cookie');
    const authCookie = setCookie?.split(';')[0] || '';
    const token = authCookie.replace('auth=', '');

    if (!token) {
      return NextResponse.json({ error: 'No token received' }, { status: 500 });
    }

    // Store token in database
    const { error: dbError } = await supabaseAdmin
      .from('postiz_users')
      .upsert({
        supabase_user_id: supabaseUser.id,
        postiz_auth_token: token,
        token_updated_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to store token' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Provisioned successfully' });
  } catch (error) {
    console.error('Provision error:', error);
    return NextResponse.json({ error: 'Provision failed' }, { status: 500 });
  }
}
