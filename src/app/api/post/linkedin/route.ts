import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Handle both JSON and FormData
  let text: string;
  let imageFile: File | null = null;

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    text = formData.get('text') as string;
    const image = formData.get('image');
    if (image instanceof File) {
      imageFile = image;
    }
  } else {
    const body = await request.json();
    text = body.text;
  }

  if (!text) return Response.json({ error: 'Missing text' }, { status: 400 });

  // Get stored connection
  const { data: connection } = await supabase
    .from('social_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('platform', 'linkedin')
    .single();

  if (!connection?.access_token) {
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
      await supabase
        .from('social_connections')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token || connection.refresh_token,
          expires_at: new Date(Date.now() + (newTokens.expires_in || 3600) * 1000).toISOString(),
        })
        .eq('user_id', user.id)
        .eq('platform', 'linkedin');
      accessToken = newTokens.access_token;
    }
  }

  // For LinkedIn with image, we need to upload the image first
  let mediaAsset: string | null = null;
  let mediaUploadUrl: string | null = null;

  if (imageFile) {
    console.log('Starting LinkedIn image upload...');
    
    // Register image upload
    const registerRes = await fetch('https://api.linkedin.com/v2/assets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        registerUploadRequest: {
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
    console.log('LinkedIn asset registration response:', JSON.stringify(registerData));

    if (!registerRes.ok) {
      console.error('LinkedIn asset registration failed:', registerData);
    }

    if (registerRes.ok && registerData.value?.asset) {
      mediaAsset = registerData.value.asset;
      mediaUploadUrl = registerData.value.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
      console.log('Got media asset:', mediaAsset, 'upload URL:', mediaUploadUrl);

      // Upload the image binary
      if (mediaUploadUrl) {
        const arrayBuffer = await imageFile.arrayBuffer();
        console.log('Uploading image binary, size:', arrayBuffer.byteLength);
        
        const uploadRes = await fetch(mediaUploadUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': imageFile.type || 'image/jpeg',
          },
          body: arrayBuffer,
        });
        
        console.log('Image upload response status:', uploadRes.status);
        if (!uploadRes.ok) {
          console.error('Image upload failed:', await uploadRes.text());
        }
      } else {
        console.error('No upload URL returned from LinkedIn');
      }
    } else {
      console.error('Asset registration failed or no asset returned');
    }
  }

  // Create the post
  const postBody: any = {
    author: `urn:li:person:${connection.platform_user_id}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: mediaAsset ? 'IMAGE' : 'NONE',
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
}