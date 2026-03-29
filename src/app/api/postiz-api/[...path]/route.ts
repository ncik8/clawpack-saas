import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getPostizToken(supabaseUserId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('postiz_users')
    .select('postiz_auth_token')
    .eq('supabase_user_id', supabaseUserId)
    .single();
  
  if (error || !data) return null;
  return data.postiz_auth_token;
}

async function getSupabaseUser(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) return null;
  return user.id;
}

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const url = new URL(request.url);
    const queryString = url.search;
    
    const supabaseUserId = await getSupabaseUser(request);
    if (!supabaseUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = await getPostizToken(supabaseUserId);
    if (!token) {
      return NextResponse.json({ error: 'Postiz not connected' }, { status: 401 });
    }

    const response = await fetch(`${POSTIZ_URL}/api/${path}${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cookie': `auth=${token}`,
      },
      redirect: 'manual',
    });

    // Handle redirect
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('location');
      if (location) {
        return new Response(null, {
          status: 302,
          headers: { Location: location },
        });
      }
    }

    // Return response
    const contentType = response.headers.get('content-type') || 'text/plain';
    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const body = await request.json();
    
    const supabaseUserId = await getSupabaseUser(request);
    if (!supabaseUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = await getPostizToken(supabaseUserId);
    if (!token) {
      return NextResponse.json({ error: 'Postiz not connected' }, { status: 401 });
    }

    const response = await fetch(`${POSTIZ_URL}/api/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cookie': `auth=${token}`,
      },
      body: JSON.stringify(body),
      redirect: 'manual',
    });

    // Handle redirect
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('location');
      if (location) {
        return new Response(null, {
          status: 302,
          headers: { Location: location },
        });
      }
    }

    // Return response
    const contentType = response.headers.get('content-type') || 'text/plain';
    const responseBody = await response.text();

    return new Response(responseBody, {
      status: response.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}
