import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const BLUESKY_API = 'https://bsky.social/xrpc';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dcyifihwvqxtpypphpef.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: Request) {
  console.log('===========================================');
  console.log('BLUESKY POST ROUTE HIT');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Get auth header from request
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('NO AUTH HEADER - returning 401');
      return NextResponse.json({ error: 'Unauthorized - no auth header' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    console.log('Token length:', token.length);
    
    // Use service role key to validate the user's token
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    console.log('User:', user?.id, 'Error:', userError);
    
    if (userError || !user) {
      console.log('INVALID TOKEN - returning 401');
      return NextResponse.json({ error: 'Unauthorized - invalid token' }, { status: 401 });
    }
    
    const userId = user.id;
    console.log('User ID:', userId);

    // Get stored Bluesky connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'bluesky')
      .single();

    console.log('Connection:', connection?.platform_username, 'Error:', connError);

    if (!connection?.access_token) {
      console.log('Bluesky not connected - no access token found');
      return NextResponse.json({ error: 'Bluesky not connected' }, { status: 401 });
    }

    // Check if token needs refresh (Bluesky tokens expire after 24h)
    let accessToken = connection.access_token;
    console.log('Bluesky access token found, attempting to post...');
    
    if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
      console.log('Bluesky token expired, refreshing...');
      const refreshRes = await fetch(`${BLUESKY_API}/com.atproto.server.refreshSession`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.refresh_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const refreshData = await refreshRes.json();
      if (refreshRes.ok && refreshData.accessJwt) {
        accessToken = refreshData.accessJwt;
        // Update stored tokens
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

    // Parse request body
    let text = '';
    let imageFile: File | null = null;
    let videoFile: File | null = null;
    let imageUrl: string | null = null;
    let videoUrl: string | null = null;
    
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
      imageUrl = body.image_url || null;
      videoUrl = body.video_url || null;
    }

    if (!text && !imageFile && !videoFile && !imageUrl && !videoUrl) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    let embed: any = undefined;

    // Upload image if provided (file from form or URL from scheduler)
    if (imageFile) {
      console.log('Uploading image file to Bluesky...');
      
      const arrayBuffer = await imageFile.arrayBuffer();
      const blobRes = await fetch(`${BLUESKY_API}/com.atproto.repo.uploadBlob`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': imageFile.type || 'image/jpeg',
        },
        body: arrayBuffer,
      });

      const blobData = await blobRes.json();
      console.log('Blob upload response:', blobRes.status, JSON.stringify(blobData));

      if (!blobRes.ok) {
        return NextResponse.json({ 
          error: 'Failed to upload image to Bluesky',
          details: blobData 
        }, { status: blobRes.status });
      }

      embed = {
        $type: 'app.bsky.embed.images',
        images: [{
          alt: text || 'Image',
          image: blobData.blob,
        }],
      };
    } else if (imageUrl) {
      // Fetch image from URL and upload to Bluesky
      console.log('Fetching image from URL for Bluesky:', imageUrl);
      try {
        const imgRes = await fetch(imageUrl);
        const blobParts = await imgRes.blob();
        const blobRes = await fetch(`${BLUESKY_API}/com.atproto.repo.uploadBlob`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': imgRes.headers.get('content-type') || 'image/jpeg',
          },
          body: blobParts,
        });

        const uploadData = await blobRes.json();
        console.log('Blob upload from URL response:', blobRes.status, JSON.stringify(uploadData));

        if (!blobRes.ok) {
          return NextResponse.json({ 
            error: 'Failed to upload image from URL to Bluesky',
            details: uploadData 
          }, { status: blobRes.status });
        }

        embed = {
          $type: 'app.bsky.embed.images',
          images: [{
            alt: text || 'Image',
            image: uploadData.blob,
          }],
        };
      } catch (imgErr) {
        console.error('Image URL fetch error:', imgErr);
        return NextResponse.json({ error: 'Failed to fetch image from URL' }, { status: 400 });
      }
    }

    // Upload video if provided - Bluesky requires service auth for video uploads
    if (videoFile) {
      console.log('Uploading video to Bluesky...');
      
      // First, get service auth token
      const serviceAuthRes = await fetch(`${BLUESKY_API}/com.atproto.server.getServiceAuth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aud: 'did:web:video.bsky.app',
          lxm: 'app.bsky.video.uploadVideo',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      });

      const serviceAuthData = await serviceAuthRes.json();
      console.log('Service auth response:', serviceAuthRes.status, JSON.stringify(serviceAuthData));

      if (!serviceAuthRes.ok || !serviceAuthData.token) {
        return NextResponse.json({ 
          error: 'Failed to get service auth for video upload',
          details: serviceAuthData 
        }, { status: serviceAuthRes.status });
      }

      const arrayBuffer = await videoFile.arrayBuffer();
      const uploadUrl = new URL(`https://video.bsky.app/xrpc/app.bsky.video.uploadVideo`);
      uploadUrl.searchParams.append('did', connection.platform_user_id);
      uploadUrl.searchParams.append('name', 'video.mp4');

      const videoRes = await fetch(uploadUrl.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceAuthData.token}`,
          'Content-Type': videoFile.type || 'video/mp4',
        },
        body: arrayBuffer,
      });

      const videoData = await videoRes.json();
      console.log('Video upload response:', videoRes.status, JSON.stringify(videoData));

      if (!videoRes.ok) {
        return NextResponse.json({ 
          error: 'Failed to upload video to Bluesky',
          details: videoData 
        }, { status: videoRes.status });
      }

      embed = {
        $type: 'app.bsky.embed.video',
        video: videoData.blob || videoData,
        alt: text || 'Video',
      };
    } else if (videoUrl) {
      // Fetch video from URL and upload to Bluesky
      console.log('Fetching video from URL for Bluesky:', videoUrl);
      try {
        // Get service auth token
        const serviceAuthRes = await fetch(`${BLUESKY_API}/com.atproto.server.getServiceAuth`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            aud: 'did:web:video.bsky.app',
            lxm: 'app.bsky.video.uploadVideo',
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        });

        const serviceAuthData = await serviceAuthRes.json();
        console.log('Service auth response:', serviceAuthRes.status, JSON.stringify(serviceAuthData));

        if (!serviceAuthRes.ok || !serviceAuthData.token) {
          return NextResponse.json({ 
            error: 'Failed to get service auth for video upload',
            details: serviceAuthData 
          }, { status: serviceAuthRes.status });
        }

        // Fetch video from URL
        const videoRes = await fetch(videoUrl);
        const videoBlob = await videoRes.blob();
        const contentType = videoRes.headers.get('content-type') || 'video/mp4';

        const uploadUrl = new URL(`https://video.bsky.app/xrpc/app.bsky.video.uploadVideo`);
        uploadUrl.searchParams.append('did', connection.platform_user_id);
        uploadUrl.searchParams.append('name', 'video.mp4');

        const uploadRes = await fetch(uploadUrl.toString(), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceAuthData.token}`,
            'Content-Type': contentType,
          },
          body: videoBlob,
        });

        const uploadData = await uploadRes.json();
        console.log('Video upload from URL response:', uploadRes.status, JSON.stringify(uploadData));

        if (!uploadRes.ok) {
          return NextResponse.json({ 
            error: 'Failed to upload video from URL to Bluesky',
            details: uploadData 
          }, { status: uploadRes.status });
        }

        embed = {
          $type: 'app.bsky.embed.video',
          video: uploadData.blob || uploadData,
          alt: text || 'Video',
        };
      } catch (vidErr) {
        console.error('Video URL fetch error:', vidErr);
        return NextResponse.json({ error: 'Failed to fetch video from URL' }, { status: 400 });
      }
    }

    // Build the post record
    const record: any = {
      text: text || '',
      createdAt: new Date().toISOString(),
      langs: ['en'],
    };

    if (embed) {
      record.embed = embed;
    }

    // Create post via Bluesky API
    const postRes = await fetch(`${BLUESKY_API}/com.atproto.repo.createRecord`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repo: connection.platform_user_id,
        collection: 'app.bsky.feed.post',
        record: record,
      }),
    });

    const postData = await postRes.json();
    console.log('Bluesky post response:', postRes.status, JSON.stringify(postData));

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