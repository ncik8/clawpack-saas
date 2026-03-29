import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
    const { content, platform } = await request.json();

    if (!content || !platform) {
      return NextResponse.json({ error: 'Missing content or platform' }, { status: 400 });
    }

    // Get user
    const userId = await getSupabaseUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stored connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();

    if (connError || !connection?.access_token) {
      return NextResponse.json({ error: `${platform} account not connected` }, { status: 400 });
    }

    // Post to Twitter
    if (platform === 'x') {
      const twitterRes = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: content }),
      });

      const twitterData = await twitterRes.json();

      if (!twitterRes.ok) {
        console.error('Twitter error:', twitterData);
        return NextResponse.json({ 
          error: twitterData.detail || 'Failed to post to Twitter' 
        }, { status: twitterRes.status });
      }

      return NextResponse.json({ 
        success: true, 
        tweetId: twitterData.data?.id,
        postId: `twitter_${twitterData.data?.id}`
      });
    }

    // Post to LinkedIn
    if (platform === 'linkedin') {
      // LinkedIn requires urn:li:person:XXXX format for author
      const authorUrn = connection.platform_user_id 
        ? `urn:li:person:${connection.platform_user_id}`
        : null;

      if (!authorUrn) {
        return NextResponse.json({ error: 'LinkedIn user ID not found' }, { status: 400 });
      }

      const linkedInRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: authorUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: content },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        }),
      });

      const linkedInData = await linkedInRes.json();

      if (!linkedInRes.ok) {
        console.error('LinkedIn error:', linkedInData);
        return NextResponse.json({ 
          error: linkedInData.message || 'Failed to post to LinkedIn' 
        }, { status: linkedInRes.status });
      }

      return NextResponse.json({ 
        success: true, 
        postId: linkedInData.id
      });
    }

    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });

  } catch (error: any) {
    console.error('Post error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
