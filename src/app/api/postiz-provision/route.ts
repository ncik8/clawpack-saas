import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function generatePassword(): string {
  return crypto.randomUUID() + '-' + crypto.randomUUID();
}

async function getSupabaseUser(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) return null;
  return user.id;
}

export async function POST(request: Request) {
  try {
    const supabaseUserId = await getSupabaseUser(request);
    if (!supabaseUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has Postiz account
    const { data: existingUser } = await supabaseAdmin
      .from('postiz_users')
      .select('postiz_auth_token')
      .eq('supabase_user_id', supabaseUserId)
      .single();

    if (existingUser?.postiz_auth_token) {
      // Already provisioned - return success
      return NextResponse.json({ success: true, message: 'Already provisioned' });
    }

    // Get user's email from request body (frontend passes it since user is authenticated)
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'No email found' }, { status: 400 });
    }

    // Generate random password for Postiz
    const password = generatePassword();

    // Try to register with Postiz
    const registerResponse = await fetch(`${POSTIZ_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: email.split('@')[0],
        company: 'ClawPack User',
        provider: 'LOCAL',
      }),
    });

    // Register might fail if user exists - that's OK, try login
    let loginResponse;
    if (registerResponse.ok) {
      loginResponse = registerResponse;
    } else {
      // User might already exist, try login
      loginResponse = await fetch(`${POSTIZ_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          provider: 'LOCAL',
        }),
      });
    }

    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      return NextResponse.json({ error: 'Postiz login failed', details: error }, { status: 500 });
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
        supabase_user_id: supabaseUserId,
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
