import { createClient } from '@/utils/supabase/server';
import { getValidTwitterToken } from '@/lib/twitter-refresh';
import { createOAuth1Header } from '@/lib/twitter-oauth1';

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

  // Get valid token (auto-refresh if needed)
  const token = await getValidTwitterToken(user.id);
  if (!token) {
    return Response.json({ error: 'Twitter not connected or token expired' }, { status: 401 });
  }

  let mediaId: string | null = null;

  // Upload image if provided using OAuth 1.0a
  if (imageFile) {
    // Get user's access token secret from database
    const { data: connection } = await supabase
      .from('social_connections')
      .select('refresh_token')
      .eq('user_id', user.id)
      .eq('platform', 'x')
      .single();

    const accessTokenSecret = connection?.refresh_token || '';

    // Create OAuth 1.0a signed request for media upload
    const mediaUploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
    const oauthHeader = createOAuth1Header(
      'POST',
      mediaUploadUrl,
      { oauth_consumer_key: process.env.TWITTER_CONSUMER_KEY! },
      accessTokenSecret
    );

    // We need to include the oauth_token in the signing
    const mediaRes = await fetch(mediaUploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `OAuth ${oauthHeader.split('OAuth ')[1]}`,
        'Content-Type': 'application/octet-stream',
      },
      body: await imageFile.arrayBuffer(),
    });

    if (!mediaRes.ok) {
      const error = await mediaRes.text();
      console.error('Media upload failed:', error);
      // Continue without image if upload fails
    } else {
      const mediaData = await mediaRes.json();
      mediaId = mediaData.media_id_string;
    }
  }

  // Create tweet
  const tweetBody: any = { text };
  if (mediaId) {
    tweetBody.media = { media_ids: [mediaId] };
  }

  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tweetBody),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Tweet failed:', data);
    return Response.json({ error: 'Failed to post', details: data }, { status: res.status });
  }

  return Response.json({ success: true, tweet: data });
}
