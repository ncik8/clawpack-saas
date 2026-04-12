import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function normalizeUrl(input: string): string {
  const url = new URL(input);
  url.hash = '';
  url.search = '';
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
    url.port = '';
  }
  return url.toString();
}


function buildOAuthHeader({
  method,
  url,
  accessToken,
  accessTokenSecret,
}: {
  method: string;
  url: string;
  accessToken: string;
  accessTokenSecret: string;
}) {
  const consumerKey = process.env.X_API_KEY!;
  const consumerSecret = process.env.X_API_SECRET!;
  
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    oauth_token: accessToken,
  };


  const baseString = [
    method.toUpperCase(),
    percentEncode(normalizeUrl(url)),
    percentEncode(
      Object.keys(oauthParams)
        .sort()
        .map((key) => `${percentEncode(key)}=${percentEncode(oauthParams[key])}`)
        .join('&')
    ),
  ].join('&');

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  oauthParams.oauth_signature = signature;

  return (
    'OAuth ' +
    Object.keys(oauthParams)
      .sort()
      .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
      .join(', ')
  );
}

// Helper to delete video from Supabase storage after successful post
async function deleteVideoFromSupabase(videoUrl: string): Promise<void> {
  if (!videoUrl || !videoUrl.includes('/storage/v1/object/public/videos/')) {
    return;
  }
  
  try {
    const fileName = videoUrl.split('/videos/')[1];
    if (!fileName) return;
    
    await supabaseAdmin.storage
      .from('videos')
      .remove([fileName]);
    
    console.log('Deleted video from Supabase:', fileName);
  } catch (err) {
    console.error('Failed to delete video from Supabase:', err);
  }
}

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
        .select('platform, access_token, refresh_token, platform_user_id')
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
            let mediaIds: string[] = [];
            
            // If there's an image URL in the scheduled post, download and upload to Twitter
            if (post.image_url) {
              try {
                // Download image from Supabase storage
                const imageRes = await fetch(post.image_url);
                if (imageRes.ok) {
                  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
                  const mimeType = 'image/jpeg'; // Default, could be detected from content-type
                  
                  // Upload to Twitter using FormData + base64 (same method as uploadXImage)
                  const mediaUploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
                  const authHeader = buildOAuthHeader({
                    method: 'POST',
                    url: mediaUploadUrl,
                    accessToken: connection.access_token,
                    accessTokenSecret: connection.refresh_token,
                  });
                  
                  const formData = new FormData();
                  formData.append('media_data', imageBuffer.toString('base64'));
                  formData.append('media_category', 'tweet_image');
                  
                  const mediaRes = await fetch(mediaUploadUrl, {
                    method: 'POST',
                    headers: {
                      'Authorization': authHeader,
                    },
                    body: formData,
                  });
                  
                  if (mediaRes.ok) {
                    const mediaData = await mediaRes.json();
                    mediaIds = [mediaData.media_id_string];
                  } else {
                    const errText = await mediaRes.text();
                    console.error('X media upload failed:', errText);
                  }
                }
              } catch (imgErr) {
                console.error('X image processing error:', imgErr);
              }
            }
            
            const twitterPayload: any = { text: post.content };
            if (mediaIds.length > 0) {
              twitterPayload.media = { media_ids: mediaIds };
            }
            
            const tweetUrl = 'https://api.twitter.com/2/tweets';
            const tweetAuthHeader = buildOAuthHeader({
              method: 'POST',
              url: tweetUrl,
              accessToken: connection.access_token,
              accessTokenSecret: connection.refresh_token,
            });
            
            const twitterRes = await fetch(tweetUrl, {
              method: 'POST',
              headers: {
                'Authorization': tweetAuthHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(twitterPayload),
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
