import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dcyifihwvqxtpypphpef.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: Request) {
  console.log('LINKEDIN POST ROUTE HIT');

  try {
    // Get auth header from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized - no auth header' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    
    // Use service role key to validate the user's token
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized - invalid token' }, { status: 401 });
    }

    const userId = user.id;

    // Handle both JSON and FormData
    let text: string;
    let imageFile: File | null = null;
    let videoFile: File | null = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      text = formData.get('text') as string;
      const image = formData.get('image');
      if (image instanceof File) {
        imageFile = image;
      }
      const video = formData.get('video');
      if (video instanceof File) {
        videoFile = video;
      }
    } else {
      const body = await request.json();
      text = body.text;
    }

    if (!text) return Response.json({ error: 'Missing text' }, { status: 400 });

    // Get stored connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'linkedin')
      .single();

    if (connError || !connection?.access_token) {
      return Response.json({ error: 'LinkedIn not connected' }, { status: 401 });
    }

    let accessToken = connection.access_token;

    // Check if token needs refresh
    const expiresAt = new Date(connection.expires_at).getTime();
    if (Date.now() > expiresAt - 300000 && connection.refresh_token) {
      const refreshRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      });

      const newTokens = await refreshRes.json();
      if (refreshRes.ok && newTokens.access_token) {
        accessToken = newTokens.access_token;
        // Update stored tokens
        await supabaseAdmin
          .from('social_connections')
          .update({
            access_token: newTokens.access_token,
            expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          })
          .eq('id', connection.id);
      }
    }

    // Build media asset if needed
    let mediaAsset: string | null = null;
    let mediaType: string | null = null;

    if (imageFile) {
      // Register image asset - use ?action=registerUpload
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
            owner: `urn:li:person:${connection.platform_user_id}`,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              },
            ],
          },
        }),
      });
      const registerData = await registerRes.json();
      console.log('LinkedIn image register status:', registerRes.status, JSON.stringify(registerData));

      if (registerRes.ok && registerData.value?.asset) {
        const uploadUrl = registerData.value.uploadUrl ||
          registerData.value.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
        mediaAsset = registerData.value.asset;
        mediaType = 'IMAGE';

        if (uploadUrl) {
          // Upload the image binary
          const arrayBuffer = await imageFile.arrayBuffer();
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': imageFile.type || 'image/jpeg',
            },
            body: arrayBuffer,
          });
          console.log('LinkedIn image upload status:', uploadRes.status);
        } else {
          console.error('LinkedIn: no uploadUrl found in register response');
        }
      }
    } else if (videoFile) {
      // Register video asset - use ?action=registerUpload
      const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-video'],
            owner: `urn:li:person:${connection.platform_user_id}`,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              },
            ],
          },
        }),
      });
      const registerData = await registerRes.json();

      if (registerRes.ok && registerData.value?.asset) {
        const uploadUrl = registerData.value.uploadUrl ||
          registerData.value.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
        mediaAsset = registerData.value.asset;
        mediaType = 'VIDEO';

        if (uploadUrl) {
          // Upload the video binary
          const arrayBuffer = await videoFile.arrayBuffer();
          await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': videoFile.type || 'video/mp4',
            },
            body: arrayBuffer,
          });
        }
      }
    }

    // Create the post
    const postBody: any = {
      author: `urn:li:person:${connection.platform_user_id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: mediaType || 'NONE',
          media: mediaAsset
            ? [
                {
                  status: 'READY',
                  media: mediaAsset,
                },
              ]
            : [],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
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

    if (!postRes.ok) {
      console.error('LinkedIn post failed:', postData);
      return Response.json({ error: 'Failed to post to LinkedIn', details: postData }, { status: postRes.status });
    }

    return Response.json({ success: true, postId: postData.id });
  } catch (error: any) {
    console.error('LinkedIn post error:', error);
    return Response.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
