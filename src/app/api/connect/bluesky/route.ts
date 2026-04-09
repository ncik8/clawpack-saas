import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

const BLUESKY_API = 'https://bsky.social/xrpc';

export async function POST(request: Request) {
  try {
    const { handle, password } = await request.json();

    if (!handle || !password) {
      return NextResponse.json({ error: 'Handle and password required' }, { status: 400 });
    }

    // Get current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create Bluesky session
    console.log('Attempting Bluesky login for handle:', handle);
    
    const sessionRes = await fetch(`${BLUESKY_API}/com.atproto.server.createSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: handle,
        password: password,
      }),
    });

    const sessionData = await sessionRes.json();
    console.log('Bluesky response status:', sessionRes.status);
    console.log('Bluesky response body:', JSON.stringify(sessionData));

    if (!sessionRes.ok) {
      return NextResponse.json({ 
        error: sessionData.error || 'Failed to connect to Bluesky',
        message: sessionData.message,
        blueskyStatus: sessionRes.status,
        blueskyError: sessionData
      }, { status: sessionRes.status });
    }

    // Delete existing Bluesky connection and insert new one
    await supabase
      .from('social_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'bluesky');

    const { error: storeError } = await supabase
      .from('social_connections')
      .insert({
        user_id: user.id,
        platform: 'bluesky',
        access_token: sessionData.accessJwt,
        refresh_token: sessionData.refreshJwt,
        platform_user_id: sessionData.did,
        platform_username: handle,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    if (storeError) {
      console.error('Failed to store Bluesky connection:', storeError);
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      handle: sessionData.handle,
      did: sessionData.did 
    });
  } catch (error: any) {
    console.error('Bluesky connect error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}