import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dcyifihwvqxtpypphpef.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all pending posts that are due
    const now = new Date().toISOString();
    
    const { data: posts, error: fetchError } = await supabaseAdmin
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError);
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return Response.json({ message: 'No posts to process', processed: 0 });
    }

    const results = { processed: 0, succeeded: 0, failed: 0 };

    for (const post of posts) {
      // Get user's connections for each platform
      const { data: connections } = await supabaseAdmin
        .from('social_connections')
        .select('platform, access_token, refresh_token, platform_user_id, expires_at')
        .eq('user_id', post.user_id);

      if (!connections || connections.length === 0) {
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
      const errorMessages = [];

      // Post to each platform
      for (const platform of post.platforms) {
        const connection = connectionMap.get(platform);
        
        if (!connection) {
          errorMessages.push(`${platform}: not connected`);
          continue;
        }

        try {
          // Refresh token if needed
          let accessToken = connection.access_token;
          if (platform === 'x' && connection.expires_at) {
            const expiresAt = new Date(connection.expires_at);
            if (expiresAt < new Date()) {
              // Token expired, try to refresh
              const refreshed = await refreshXToken(connection.refresh_token);
              if (refreshed) {
                accessToken = refreshed.access_token;
                await supabaseAdmin
                  .from('social_connections')
                  .update({
                    access_token: refreshed.access_token,
                    refresh_token: refreshed.refresh_token || connection.refresh_token,
                    expires_at: refreshed.expires_at,
                  })
                  .eq('id', connection.id);
              }
            }
          }

          if (platform === 'x') {
            const twitterRes = await fetch('https://api.twitter.com/2/tweets', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text: post.content }),
            });

            const twitterData = await twitterRes.json();

            if (!twitterRes.ok) {
              errorMessages.push(`X: ${twitterData.detail || twitterData.title || 'Unknown error'}`);
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
                'Authorization': `Bearer ${accessToken}`,
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
          } else if (platform === 'bluesky') {
            // Bluesky uses app password
            const blueskyRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                repo: connection.platform_user_id || 'did:plc:unknown',
                collection: 'app.bsky.feed.post',
                record: {
                  type: 'app.bsky.feed.post',
                  text: post.content,
                  createdAt: new Date().toISOString(),
                },
              }),
            });

            if (!blueskyRes.ok) {
              const errorData = await blueskyRes.json();
              errorMessages.push(`Bluesky: ${errorData.message}`);
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

    return Response.json({
      message: `Processed ${results.processed} posts`,
      ...results,
    });

  } catch (error: any) {
    console.error('Process scheduled error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function refreshXToken(refreshToken: string): Promise<{access_token: string; refresh_token?: string; expires_at?: string} | null> {
  try {
    const res = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const tokens = await res.json();

    if (res.ok && tokens.access_token) {
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      };
    }
    return null;
  } catch (err) {
    console.error('Token refresh failed:', err);
    return null;
  }
}
