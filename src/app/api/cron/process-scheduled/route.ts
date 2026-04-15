import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { uploadXImage } from '@/lib/x-oauth';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dcyifihwvqxtpypphpef.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================
// OAuth helpers for X
// ============================================================
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
  method, url, accessToken, accessTokenSecret,
}: {
  method: string; url: string; accessToken: string; accessTokenSecret: string;
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
    percentEncode(Object.keys(oauthParams).sort()
      .map((key) => `${percentEncode(key)}=${percentEncode(oauthParams[key])}`)
      .join('&')),
  ].join('&');

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
  oauthParams.oauth_signature = signature;

  return 'OAuth ' + Object.keys(oauthParams).sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');
}

async function refreshXToken(refreshToken: string): Promise<{access_token: string; refresh_token?: string; expires_at?: string} | null> {
  try {
    const res = await fetch('https://api.twitter.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.X_API_KEY}:${process.env.X_API_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    const data = await res.json();
    if (res.ok && data.access_token) {
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_at: new Date(Date.now() + (data.expires_in || 7200) * 1000).toISOString(),
      };
    }
  } catch (e) {
    console.error('X token refresh error:', e);
  }
  return null;
}

// ============================================================
// Platform posting functions
// ============================================================
async function postToX(content: string, imageUrl: string | null, connection: any) {
  let accessToken = connection.access_token;
  
  // Refresh X token if expired
  if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
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

  let mediaIds: string[] = [];

  // Upload image if present
  if (imageUrl) {
    try {
      const imageRes = await fetch(imageUrl);
      if (imageRes.ok) {
        const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
        const mediaId = await uploadXImage({
          accessToken,
          accessTokenSecret: connection.refresh_token,
          fileBuffer: imageBuffer,
          mimeType: 'image/jpeg',
        });
        if (mediaId) mediaIds.push(mediaId);
      }
    } catch (e) {
      console.error('X image upload error:', e);
    }
  }

  // Build tweet request
  const tweetBody: any = { text: content };
  if (mediaIds.length > 0) {
    tweetBody.media = { media_ids: mediaIds };
  }

  const oauthHeader = buildOAuthHeader({
    method: 'POST',
    url: 'https://api.twitter.com/2/tweets',
    accessToken,
    accessTokenSecret: connection.refresh_token,
  });

  const tweetRes = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': oauthHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tweetBody),
  });

  const tweetData = await tweetRes.json();
  console.log('X tweet result:', tweetRes.status, JSON.stringify(tweetData));

  if (!tweetRes.ok) {
    throw new Error(tweetData.detail || tweetData.error?.message || 'X post failed');
  }

  return tweetData.data?.id;
}

async function postToLinkedIn(content: string, imageUrl: string | null, linkedinAssetUrn: string | null, connection: any) {
  let accessToken = connection.access_token;
  
  console.log(`LinkedIn CRON: conn_id=${connection.id}, user_id=${connection.user_id}, platform_user_id=${connection.platform_user_id}, token_prefix=${accessToken?.substring(0, 8)}, expires_at=${connection.expires_at}`);
  
  // Refresh token if expired (LinkedIn tokens can expire)
  if (connection.refresh_token && connection.expires_at && new Date(connection.expires_at) < new Date()) {
    console.log('LinkedIn: token expired, refreshing...');;
    const refreshRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
        client_id: process.env.LINKEDIN_CLIENT_ID || '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
      }),
    });
    const refreshData = await refreshRes.json();
    if (refreshRes.ok && refreshData.access_token) {
      accessToken = refreshData.access_token;
      // Update stored token
      await supabaseAdmin
        .from('social_connections')
        .update({
          access_token: refreshData.access_token,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('id', connection.id);
      console.log('LinkedIn: token refreshed successfully');
    } else {
      console.log('LinkedIn: token refresh failed:', JSON.stringify(refreshData));
    }
  }
  
  const authorUrn = connection.platform_user_id ? `urn:li:person:${connection.platform_user_id}` : null;
  console.log(`LinkedIn: using connection ${connection.id}, token prefix: ${accessToken?.substring(0, 10)}..., platform_user_id: ${connection.platform_user_id}`);

  if (!authorUrn) {
    throw new Error('LinkedIn: missing user ID');
  }

  let mediaAsset: string | null = null;
  let mediaType = 'NONE';

  // Use pre-uploaded asset URN if available (browser already uploaded it at schedule time)
  if (linkedinAssetUrn) {
    console.log(`LinkedIn: using pre-uploaded asset URN: ${linkedinAssetUrn}`);
    mediaAsset = linkedinAssetUrn;
    mediaType = 'IMAGE';
  } else if (imageUrl) {
    // Fallback: try to upload from server (may fail due to Vercel blocking LinkedIn DMS endpoint)
    console.log(`LinkedIn: no pre-uploaded URN, attempting server-side upload from: ${imageUrl}`);
    try {
      const imageRes = await fetch(imageUrl, { cache: 'no-store' });
      if (!imageRes.ok) {
        console.log(`LinkedIn: failed to fetch image: ${imageRes.status}`);
      } else {
        const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
        const contentType = imageRes.headers.get('content-type') || 'image/png';
        
        // Register upload and get asset URN
        const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
              owner: authorUrn,
              serviceRelationships: [
                { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
              ],
            },
          }),
        });
        const registerData = await registerRes.json();
        console.log(`LinkedIn register response: ${registerRes.status}`, JSON.stringify(registerData));

        if (registerRes.ok && registerData.value?.asset) {
          const uploadUrl = registerData.value.uploadUrl ||
            registerData.value.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;

          if (uploadUrl) {
            // Use exact uploadUrl as returned by LinkedIn - do NOT append token
            const uploadRes = await fetch(uploadUrl, {
              method: 'PUT',
              headers: { 
                'Content-Type': contentType,
              },
              body: imageBuffer,
              cache: 'no-store',
            });
            console.log(`LinkedIn image PUT response: ${uploadRes.status}`);
            
            if (uploadRes.ok) {
              mediaAsset = registerData.value.asset;
              mediaType = 'IMAGE';
              console.log(`LinkedIn: uploaded image (${contentType}, ${imageBuffer.length} bytes)`);
            } else {
              const errText = await uploadRes.text();
              console.log(`LinkedIn: image upload failed, aborting post. status: ${uploadRes.status}, body: ${errText.substring(0, 200)}`);
              // ABORT - do not proceed with post if image upload failed
              return;
            }
          } else {
            console.log('LinkedIn: no upload URL from register response, aborting');
            return;
          }
        } else {
          console.log(`LinkedIn: register failed, aborting. ok=${registerRes.ok}`);
          return;
        }
      }
    } catch (err) {
      console.log(`LinkedIn: image upload error: ${err}, aborting`);
      return;
    }
  } else {
    console.log('LinkedIn: no imageUrl provided, posting text-only');
  }

  console.log(`LinkedIn: building post with mediaType=${mediaType}, asset=${mediaAsset}`);
  const postBody = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: mediaType,
        media: mediaAsset ? [{ status: 'READY', media: mediaAsset }] : [],
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postBody),
  });

  const postData = await postRes.json();
  console.log(`LinkedIn ugcPosts response: ${postRes.status}`, JSON.stringify(postData));

  if (!postRes.ok) {
    const errorData = postData;
    // LinkedIn deduplication
    if (!errorData.message?.includes('duplicate') && !errorData.message?.includes('Duplicate')) {
      throw new Error(`LinkedIn: ${errorData.message}`);
    }
  }

  return 'linkedin-post';
}

async function postToBluesky(content: string, imageUrl: string | null, connection: any) {
  let accessToken = connection.access_token;

  // Refresh Bluesky token if expired
  if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
    if (connection.refresh_token) {
      const refreshRes = await fetch('https://bsky.social/xrpc/com.atproto.server.refreshSession', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.refresh_token}`,
          'Content-Type': 'application/json',
        },
      });
      const refreshData = await refreshRes.json();
      if (refreshRes.ok && refreshData.accessJwt) {
        accessToken = refreshData.accessJwt;
        await supabaseAdmin
          .from('social_connections')
          .update({
            access_token: refreshData.accessJwt,
            refresh_token: refreshData.refreshJwt || connection.refresh_token,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', connection.id);
      }
    }
  }

  let embed: any = undefined;

  if (imageUrl) {
    const imageRes = await fetch(imageUrl, { cache: 'no-store' });
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const blobRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'image/jpeg',
      },
      body: imageBuffer,
      cache: 'no-store',
    });
    const blobData = await blobRes.json();
    if (blobRes.ok && blobData.blob) {
      embed = {
        $type: 'app.bsky.embed.images',
        images: [{ alt: content.substring(0, 50), image: blobData.blob }],
      };
    }
  }

  const record = {
    $type: 'app.bsky.feed.post',
    text: content,
    createdAt: new Date().toISOString(),
    ...(embed ? { embed } : {}),
  };

  const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      repo: connection.platform_user_id || 'did:plc:unknown',
      collection: 'app.bsky.feed.post',
      record,
    }),
  });

  if (!postRes.ok) {
    const errorData = await postRes.json();
    throw new Error(errorData.message || 'Bluesky post failed');
  }

  const postData = await postRes.json();
  return postData.uri;
}

async function postToFacebook(content: string, imageUrl: string | null, page: any) {
  if (imageUrl) {
    const fbPhotoRes = await fetch(`https://graph.facebook.com/v18.0/${page.page_id}/photos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${page.page_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: imageUrl, caption: content }),
    });
    const fbPhotoData = await fbPhotoRes.json();
    if (!fbPhotoRes.ok) {
      throw new Error(fbPhotoData.error?.message || 'Facebook photo post failed');
    }
    return fbPhotoData.id;
  } else {
    const fbRes = await fetch(`https://graph.facebook.com/v18.0/${page.page_id}/feed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${page.page_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: content }),
    });
    const fbData = await fbRes.json();
    if (!fbRes.ok) {
      throw new Error(fbData.error?.message || 'Facebook post failed');
    }
    return fbData.id;
  }
}

async function postToInstagram(content: string, imageUrl: string | null, connection: any) {
  // Instagram uses connection from social_connections (NOT social_pages)
  // IG accounts are stored in social_connections, not social_pages
  const accessToken = connection.access_token;
  const igUserId = connection.platform_user_id;
  
  if (!accessToken || !igUserId) {
    throw new Error('Instagram: missing access token or user ID');
  }

  // Create media container with FormData (Instagram API requires FormData for image_url)
  const formData = new FormData();
  formData.append('caption', content);
  
  if (imageUrl) {
    formData.append('media_type', 'EXTERNAL_IMAGE');
    formData.append('image_url', imageUrl);
  } else {
    formData.append('media_type', 'TEXT');
  }

  const igRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media?access_token=${accessToken}`, {
    method: 'POST',
    body: formData,
  });
  const igData = await igRes.json();

  if (!igRes.ok || !igData.id) {
    throw new Error(igData.error?.message || 'Instagram media creation failed');
  }

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Publish media
  const publishRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media_publish?access_token=${accessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: igData.id }),
  });

  if (!publishRes.ok) {
    const publishData = await publishRes.json();
    throw new Error(publishData.error?.message || 'Instagram publish failed');
  }

  return igData.id;
}

// ============================================================
// Main cron handler
// ============================================================
export async function GET(request: Request) {
  try {
    // Fetch all pending targets that are due
    const now = new Date().toISOString();
    
    const { data: targets, error: fetchError } = await supabaseAdmin
      .from('scheduled_post_targets')
      .select('*, scheduled_posts(content, image_url, linkedin_asset_urn, user_id)')
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    if (fetchError) {
      console.error('Error fetching targets:', fetchError);
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

    if (!targets || targets.length === 0) {
      return Response.json({ message: 'No targets to process', processed: 0 });
    }

    const results = { processed: 0, succeeded: 0, failed: 0 };

    for (const target of targets) {
      const post = target.scheduled_posts;
      if (!post) {
        await supabaseAdmin
          .from('scheduled_post_targets')
          .update({ status: 'failed', error_message: 'Post not found' })
          .eq('id', target.id);
        results.failed++;
        results.processed++;
        continue;
      }

      // Get connection/page data
      let connection = null;
      let page = null;

      if (target.social_page_id) {
        // Multi-account platform - get page with tokens
        const { data: pageData } = await supabaseAdmin
          .from('social_pages')
          .select('*, social_connections(access_token, refresh_token, expires_at, platform_user_id)')
          .eq('id', target.social_page_id)
          .single();
        page = pageData;
        connection = pageData?.social_connections;
      } else if (target.social_connection_id) {
        // Single-account platform
        const { data: connData } = await supabaseAdmin
          .from('social_connections')
          .select('*')
          .eq('id', target.social_connection_id)
          .single();
        connection = connData;
      }

      if (!connection) {
        await supabaseAdmin
          .from('scheduled_post_targets')
          .update({ status: 'failed', error_message: `${target.platform}: connection not found` })
          .eq('id', target.id);
        results.failed++;
        results.processed++;
        continue;
      }

      // Post to the platform
      try {
        let externalPostId: string | undefined;

        if (target.platform === 'x') {
          externalPostId = await postToX(post.content, post.image_url, connection);
        } else if (target.platform === 'linkedin') {
          externalPostId = await postToLinkedIn(post.content, post.image_url, post.linkedin_asset_urn, connection);
        } else if (target.platform === 'bluesky') {
          externalPostId = await postToBluesky(post.content, post.image_url, connection);
        } else if (target.platform === 'facebook') {
          if (!page) throw new Error('Facebook page not found');
          externalPostId = await postToFacebook(post.content, post.image_url, page);
        } else if (target.platform === 'instagram') {
          // Instagram uses connection directly (IG accounts are in social_connections, not social_pages)
          externalPostId = await postToInstagram(post.content, post.image_url, connection);
        }

        // Mark target as published
        await supabaseAdmin
          .from('scheduled_post_targets')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            external_post_id: externalPostId,
          })
          .eq('id', target.id);

        results.succeeded++;

      } catch (err: any) {
        console.error(`Error posting to ${target.platform}:`, err.message);
        await supabaseAdmin
          .from('scheduled_post_targets')
          .update({ status: 'failed', error_message: err.message })
          .eq('id', target.id);
        results.failed++;
      }

      results.processed++;

      // Check if all targets for this post are done
      const { data: remainingTargets } = await supabaseAdmin
        .from('scheduled_post_targets')
        .select('status')
        .eq('scheduled_post_id', target.scheduled_post_id)
        .neq('status', 'published');

      if (!remainingTargets || remainingTargets.length === 0) {
        // All targets processed - update post status
        const { data: allTargets } = await supabaseAdmin
          .from('scheduled_post_targets')
          .select('status')
          .eq('scheduled_post_id', target.scheduled_post_id);

        const allPublished = allTargets?.every(t => t.status === 'published') ?? false;
        
        await supabaseAdmin
          .from('scheduled_posts')
          .update({
            status: allPublished ? 'published' : 'failed',
            published_at: new Date().toISOString(),
          })
          .eq('id', target.scheduled_post_id);
      }

      // Cleanup image from storage after successful post
      if (post.image_url) {
        try {
          const urlParts = post.image_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          await supabaseAdmin.storage.from('images').remove([fileName]);
        } catch (e) {}
      }
    }

    return Response.json({
      message: `Processed ${results.processed} targets`,
      ...results,
    });

  } catch (error: any) {
    console.error('Process scheduled error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}