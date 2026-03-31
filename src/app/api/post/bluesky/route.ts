import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

const BLUESKY_API = 'https://bsky.social/xrpc';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stored Bluesky connection
    const { data: connection } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'bluesky')
      .single();

    if (!connection?.access_token) {
      return NextResponse.json({ error: 'Bluesky not connected' }, { status: 401 });
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

    // Upload video if provided - Bluesky uses video.bsky.app for videos
    if (videoFile) {
      console.log('Uploading video to Bluesky...');
      
      const arrayBuffer = await videoFile.arrayBuffer();
      
      // Use video.bsky.app for video uploads
      const videoRes = await fetch(`https://video.bsky.app/xrpc/app.bsky.video.uploadVideo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
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