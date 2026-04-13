import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { uploadXImage } from '@/lib/x-oauth';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dcyifihwvqxtpypphpef.supabase.co';
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

export async function GET(request: Request) {
  try {
    // No auth required - OpenClaw cron sends requests without Bearer token
    // The cron job URL is secret and only accessible via OpenClaw's cron system
    // If you need security, set CRON_SECRET in Vercel and pass Bearer token from cron

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
      // Get ALL user's connections (we need specific page tokens for FB/IG)
      const { data: connections } = await supabaseAdmin
        .from('social_connections')
        .select('id, platform, access_token, refresh_token, platform_user_id, expires_at')
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

      let postSucceeded = true;
      const errorMessages = [];

      // Post to each platform
      for (const platformStr of post.platforms) {
        // Parse platform_page_id format (underscore separator)
        const [basePlatform, pageId] = platformStr.includes('_') 
          ? platformStr.split('_') 
          : [platformStr, null];

        // Find the specific connection for this page/account
        const connection = pageId 
          ? connections.find(c => c.platform === basePlatform && c.platform_user_id === pageId)
          : connections.find(c => c.platform === basePlatform);

        if (!connection) {
          errorMessages.push(`${platformStr}: not connected`);
          continue;
        }

        try {
          let accessToken = connection.access_token;

          // Token refresh for X
          if (basePlatform === 'x' && connection.expires_at) {
            const expiresAt = new Date(connection.expires_at);
            if (expiresAt < new Date()) {
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

          // Post based on base platform
          if (basePlatform === 'x') {
            let mediaIds: string[] = [];
            
            // Upload image if present (same as immediate post flow)
            if (post.image_url) {
              try {
                const imageRes = await fetch(post.image_url);
                if (imageRes.ok) {
                  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
                  const mediaId = await uploadXImage({
                    accessToken: connection.access_token,
                    accessTokenSecret: connection.refresh_token,
                    fileBuffer: imageBuffer,
                    mimeType: 'image/jpeg',
                  });
                  mediaIds = [mediaId];
                }
              } catch (imgErr) {
                console.error('X image upload error:', imgErr);
              }
            }
            
            // Build OAuth 1.0a header (same as working immediate post)
            const tweetUrl = 'https://api.twitter.com/2/tweets';
            const tweetAuthHeader = buildOAuthHeader({
              method: 'POST',
              url: tweetUrl,
              accessToken: connection.access_token,
              accessTokenSecret: connection.refresh_token,
            });
            
            const tweetPayload: any = { text: post.content };
            if (mediaIds.length > 0) {
              tweetPayload.media = { media_ids: mediaIds };
            }
            
            const twitterRes = await fetch(tweetUrl, {
              method: 'POST',
              headers: {
                'Authorization': tweetAuthHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(tweetPayload),
            });


            const twitterData = await twitterRes.json();
            console.log('X tweet result:', twitterRes.status, JSON.stringify(twitterData));

            if (!twitterRes.ok) {
              errorMessages.push(`X: ${JSON.stringify(twitterData)}`);
              postSucceeded = false;
            }
          } else if (basePlatform === 'linkedin') {
            const authorUrn = connection.platform_user_id 
              ? `urn:li:person:${connection.platform_user_id}`
              : null;

            if (!authorUrn) {
              errorMessages.push('LinkedIn: missing user ID');
              postSucceeded = false;
              continue;
            }

            let linkedInRes;
            
            if (post.image_url) {
              // Image post - register image first, then create post with it
              // Step 1: Register the image - use ?action=registerUpload
              const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                  'X-Restli-Protocol-Version': '2.0.0',
                },
                body: JSON.stringify({
                  registerUploadRequest: {
                    recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                    owner: authorUrn,
                    serviceRelationships: [
                      {
                        relationshipType: 'OWNER',
                        identifierURN: 'urn:li:userGeneratedContent',
                      },
                    ],
                  },
                }),
              });;
              
              const registerData = await registerRes.json();
              
              console.log('LinkedIn asset register status:', registerRes.status, JSON.stringify(registerData));
              
              if (!registerRes.ok || !registerData.value?.asset) {
                console.error('LinkedIn asset registration failed:', JSON.stringify(registerData));
                // Fallback to text-only
                linkedInRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
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
              } else {
                // Step 2: Upload image binary to the uploadUrl
                const uploadUrl = registerData.value.uploadUrl ||
                  registerData.value.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
                const mediaAsset = registerData.value.asset;
                
                const imageRes = await fetch(post.image_url);
                console.log('LinkedIn image download status:', imageRes.status, post.image_url);
                const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
                
                const uploadRes = await fetch(uploadUrl, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'image/jpeg',
                  },
                  body: imageBuffer,
                });
                
                console.log('LinkedIn image upload status:', uploadRes.status);
                
                // Step 3: Create post referencing the uploaded image (same structure as immediate post)
                linkedInRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
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
                        shareMediaCategory: 'IMAGE',
                        media: [
                          {
                            status: 'READY',
                            media: mediaAsset,
                          },
                        ],
                      },
                    },
                    visibility: {
                      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
                    },
                  }),
                });
              }
            } else {
              // Text-only post
              linkedInRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
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
            }

            if (!linkedInRes.ok) {
              const errorData = await linkedInRes.json();
              // LinkedIn deduplication - if the post went through despite error, treat as success
              if (errorData.message?.includes('duplicate') || errorData.message?.includes('Duplicate')) {
                console.log('LinkedIn: duplicate detected, post may have already gone through');
              } else {
                console.error('LinkedIn post failed:', JSON.stringify(errorData));
                errorMessages.push(`LinkedIn: ${JSON.stringify(errorData)}`);
                postSucceeded = false;
              }
            } else {
              console.log('LinkedIn post success:', linkedInRes.status);
            }
          } else if (basePlatform === 'bluesky') {
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
          } else if (basePlatform === 'facebook') {
            // Post to Facebook Page (with optional image)
            if (post.image_url) {
              // Use Photos API for image posts
              const fbPhotoRes = await fetch(`https://graph.facebook.com/v18.0/${connection.platform_user_id}/photos`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  url: post.image_url,
                  caption: post.content,
                }),
              });
              const fbPhotoData = await fbPhotoRes.json();
              if (!fbPhotoRes.ok) {
                errorMessages.push(`Facebook: ${fbPhotoData.error?.message || 'Unknown error'}`);
                postSucceeded = false;
              }
            } else {
              // Text-only post - use Feed API
              const fbRes = await fetch(`https://graph.facebook.com/v18.0/${connection.platform_user_id}/feed`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: post.content }),
              });
              const fbData = await fbRes.json();
              if (!fbRes.ok) {
                errorMessages.push(`Facebook: ${fbData.error?.message || 'Unknown error'}`);
                postSucceeded = false;
              }
            }
          } else if (basePlatform === 'instagram') {
            // Post to Instagram Business Account (with optional image)
            // Instagram requires a Facebook Page linked to the IG account
            // We use the page access token to post to IG via the Graph API
            const igBody: Record<string, string> = { caption: post.content };
            
            if (post.image_url) {
              // External image URL - use EXTERNAL_IMAGE media type
              igBody['media_type'] = 'EXTERNAL_IMAGE';
              igBody['external_url'] = post.image_url;
            } else {
              igBody['media_type'] = 'TEXT';
            }

            const igRes = await fetch(`https://graph.facebook.com/v18.0/${connection.platform_user_id}/media`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(igBody),
            });

            const igData = await igRes.json();

            if (!igRes.ok) {
              errorMessages.push(`Instagram: ${igData.error?.message || 'Unknown error'}`);
              postSucceeded = false;
              continue;
            }

            // Publish the media item
            const publishRes = await fetch(`https://graph.facebook.com/v18.0/${connection.platform_user_id}/media_publish`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                creation_id: igData.id,
              }),
            });

            if (!publishRes.ok) {
              const publishData = await publishRes.json();
              errorMessages.push(`Instagram: Failed to publish - ${publishData.error?.message || 'Unknown error'}`);
              postSucceeded = false;
            }
          }
        } catch (err: any) {
          errorMessages.push(`${platformStr}: ${err.message}`);
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
        // Cleanup: delete image/video from Supabase storage after successful post
        await cleanupPostMedia(post);
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

async function cleanupPostMedia(post: any): Promise<void> {
  try {
    // Delete image from Supabase storage if exists
    if (post.image_url) {
      // Extract filename from URL - handle both /images/ and /videos/ paths
      const imageMatch = post.image_url.match(/\/images\/(.+)$/);
      if (imageMatch && imageMatch[1]) {
        const { error } = await supabaseAdmin.storage.from('images').remove([imageMatch[1]]);
        if (error) {
          console.error('Failed to delete image:', error);
        } else {
          console.log(`Deleted image: ${imageMatch[1]}`);
        }
      }
    }
    // Delete video from Supabase storage if exists
    if (post.video_url) {
      const videoMatch = post.video_url.match(/\/videos\/(.+)$/);
      if (videoMatch && videoMatch[1]) {
        const { error } = await supabaseAdmin.storage.from('videos').remove([videoMatch[1]]);
        if (error) {
          console.error('Failed to delete video:', error);
        } else {
          console.log(`Deleted video: ${videoMatch[1]}`);
        }
      }
    }
  } catch (err) {
    console.error('Failed to cleanup media:', err);
  }
}
