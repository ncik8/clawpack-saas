import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function POST(request: Request) {
  try {
    // Only allow from cron or internal calls (verify a secret if needed)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all pending posts that are due
    const { data: posts, error: fetchError } = await supabaseAdmin
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ message: 'No posts to process', processed: 0 });
    }

    const results = { processed: 0, succeeded: 0, failed: 0 };

    for (const post of posts) {
      // Get user's connections for each platform
      const { data: connections } = await supabaseAdmin
        .from('social_connections')
        .select('platform, access_token, platform_user_id')
        .eq('user_id', post.user_id)
        .in('platform', post.platforms);

      if (!connections || connections.length === 0) {
        // Mark as failed - no connections
        await supabaseAdmin
          .from('scheduled_posts')
          .update({ 
            status: 'failed', 
            error_message: 'No connected accounts found',
            sent_at: new Date().toISOString(),
          })
          .eq('id', post.id);
        
        results.failed++;
        results.processed++;
        continue;
      }

      const connectionMap = new Map(connections.map(c => [c.platform, c]));
      let postSucceeded = true;
      let errorMessages = [];

      // Post to each platform
      for (const platform of post.platforms) {
        const connection = connectionMap.get(platform);
        
        if (!connection) {
          errorMessages.push(`${platform}: not connected`);
          postSucceeded = false;
          continue;
        }

        try {
          if (platform === 'x') {
            const twitterRes = await fetch('https://api.twitter.com/2/tweets', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${connection.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text: post.content }),
            });

            const twitterData = await twitterRes.json();

            if (!twitterRes.ok) {
              errorMessages.push(`Twitter: ${twitterData.detail || twitterData.title}`);
              postSucceeded = false;
            }
          } else if (platform === 'linkedin') {
            const authorUrn = connection.platform_user_id 
              ? `urn:li:person:${connection.platform_user_id}`
              : null;

            if (!authorUrn) {
              errorMessages.push('LinkedIn: missing user ID');
              postSucceeded = false;
              continue;
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
                    shareCommentary: { text: post.content },
                    shareMediaCategory: 'NONE',
                  },
                },
                visibility: {
                  'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
                },
              }),
            });

            if (!linkedInRes.ok) {
              const errorData = await linkedInRes.json();
              errorMessages.push(`LinkedIn: ${errorData.message}`);
              postSucceeded = false;
            }
          }
        } catch (err: any) {
          errorMessages.push(`${platform}: ${err.message}`);
          postSucceeded = false;
        }
      }

      // Update post status
      await supabaseAdmin
        .from('scheduled_posts')
        .update({ 
          status: postSucceeded ? 'sent' : 'failed',
          error_message: errorMessages.length > 0 ? errorMessages.join('; ') : null,
          sent_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      if (postSucceeded) {
        results.succeeded++;
      } else {
        results.failed++;
      }
      results.processed++;
    }

    return NextResponse.json({
      message: `Processed ${results.processed} posts`,
      ...results,
    });

  } catch (error: any) {
    console.error('Process scheduled error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
