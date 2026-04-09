import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

const BLUESKY_API = 'https://bsky.social/xrpc';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log('Bluesky POST - user:', user?.id);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stored Bluesky connection
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'bluesky')
      .single();

    console.log('Bluesky connection query result:', { connection, connError });

    if (!connection?.access_token) {
      console.log('Bluesky not connected - no access token found');
      return NextResponse.json({ error: 'Bluesky not connected' }, { status: 401 });
    }

    console.log('Bluesky access token found, attempting to post...');

    // Check if token needs refresh (Bluesky tokens expire after 24h)
    let accessToken = connection.access_token;
    console.log('Bluesky connection found, checking token...');
    console.log('Expires at:', connection.expires_at);
    
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
        await supabase
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

    if (!text && !imageFile && !videoFile) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    let embed: any = undefined;

    // Upload image if provided
    if (imageFile) {
      console.log('Uploading image to Bluesky...');
      
      const arrayBuffer = await imageFile.arrayBuffer();
      const blobRes = await fetch(`${BLUESKY_API}/com.atproto.repo.uploadBlob`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
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
    }

    // Upload video if provided - Bluesky requires service auth for video uploads
    if (videoFile) {
      console.log('Uploading video to Bluesky...');
      
      // First, get service auth token
      const serviceAuthRes = await fetch(`${BLUESKY_API}/com.atproto.server.getServiceAuth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aud: 'did:web:video.bsky.app',
          lxm: 'app.bsky.video.uploadVideo',
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
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

      // Upload video with service auth
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

      // Video uploaded successfully - create embed with the video reference
      embed = {
        $type: 'app.bsky.embed.video',
        video: videoData.blob || videoData,
        alt: text || 'Video',
      };
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
        'Authorization': `Bearer ${connection.access_token}`,
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