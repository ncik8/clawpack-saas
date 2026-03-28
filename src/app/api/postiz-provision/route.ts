import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const POSTIZ_URL = process.env.POSTIZ_URL || process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function generatePassword(): string {
  // Postiz requires password ≤64 chars
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
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

    const { data: existingUser } = await supabaseAdmin
      .from('postiz_users')
      .select('postiz_auth_token, postiz_password')
      .eq('supabase_user_id', supabaseUser.id)
      .maybeSingle();

    let password = existingUser?.postiz_password ?? generatePassword();

    console.log('Attempting login with:', { email: supabaseUser.email, passwordLength: password.length });

    let loginResponse = await fetch(`${POSTIZ_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: supabaseUser.email,
        password: password,
        provider: 'LOCAL'
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!loginResponse.ok && !existingUser?.postiz_password) {
      console.log('Registering new Postiz user:', supabaseUser.email, 'password length:', password.length);
      
      const registerResponse = await fetch(`${POSTIZ_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: supabaseUser.email,
          password: password,
          name: supabaseUser.email.split('@')[0],
          company: 'ClawPack',
          provider: 'LOCAL'
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!registerResponse.ok) {
        const text = await registerResponse.text();
        if (!text.toLowerCase().includes('exists')) {
          throw new Error(`Register failed: ${text}`);
        }
      }

      loginResponse = await fetch(`${POSTIZ_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: supabaseUser.email,
          password: password,
          provider: 'LOCAL'
        }),
        signal: AbortSignal.timeout(10000)
      });
    }

    if (!loginResponse.ok) {
      const text = await loginResponse.text();
      console.error('Postiz login error:', text);
      return NextResponse.json({ error: 'Postiz login failed', details: text }, { status: 500 });
    }

    const cookies = loginResponse.headers.get('set-cookie') ?? '';
    const tokenMatch = cookies.match(/auth=([^;]+)/) || cookies.match(/next-auth\.session-token=([^;]+)/);
    const token = tokenMatch?.[1] ?? '';

    if (!token) {
      return NextResponse.json({ error: 'No token received' }, { status: 500 });
    }

    const { error: dbError } = await supabaseAdmin
      .from('postiz_users')
      .upsert({
        supabase_user_id: supabaseUser.id,
        postiz_auth_token: token,
        postiz_password: password,
        token_updated_at: new Date().toISOString(),
      }, {
        onConflict: 'supabase_user_id'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to store Postiz credentials' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Postiz account provisioned'
    });
  } catch (error) {
    console.error('Provision error:', error);
    return NextResponse.json(
      { error: 'Provisioning failed' },
      { status: 500 }
    );
  }
}
