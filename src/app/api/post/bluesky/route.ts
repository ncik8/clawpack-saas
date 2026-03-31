import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

const BLUESKY_API = 'https://bsky.social/xrpc';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stored Bluesky connection
    const { data: connection } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'bluesky')
      .single();

    if (!connection?.access_token) {
      return NextResponse.json({ error: 'Bluesky not connected' }, { status: 401 });
    }

    // Parse request body
    let text = '';
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      text = formData.get('text') as string;
    } else {
      const body = await request.json();
      text = body.text;
    }

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    // Create post via Bluesky API
    const postRes = await fetch(`${BLUESKY_API}/com.atproto.repo.createRecord`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repo: connection.platform_user_id,
        collection: 'app.bsky.feed.post',
        record: {
          text: text,
          createdAt: new Date().toISOString(),
          langs: ['en'],
        },
      }),
    });

    const postData = await postRes.json();

    if (!postRes.ok) {
      console.error('Bluesky post failed:', postData);
      return NextResponse.json({ 
        error: 'Failed to post to Bluesky',
        details: postData 
      }, { status: postRes.status });
    }

    return NextResponse.json({ success: true, postId: postData.uri });
  } catch (error: any) {
    console.error('Bluesky post error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}