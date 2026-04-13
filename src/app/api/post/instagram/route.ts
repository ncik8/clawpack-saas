import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, imageUrl } = await request.json();

    if (!text) {
      return Response.json({ error: 'Content required' }, { status: 400 });
    }

    if (!imageUrl) {
      return Response.json({ error: 'Image URL required' }, { status: 400 });
    }

    // Get all IG account connections for this user from social_connections
    const { data: connections } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'instagram');

    if (!connections || connections.length === 0) {
      console.log('[INSTAGRAM POST] No connections found for user:', user.id);
      return Response.json({ error: 'No Instagram account connected' }, { status: 400 });
    }

    console.log('[INSTAGRAM POST] Found connections:', connections.length, connections.map(c => c.platform_user_id));

    // Download image from URL (handle Supabase signed URLs)
    let imageBuffer: ArrayBuffer | null = null;
    let imageContentType = 'image/jpeg';

    try {
      const imageRes = await fetch(imageUrl);
      if (!imageRes.ok) {
        return Response.json({ error: `Failed to fetch image: ${imageRes.status}` }, { status: 400 });
      }
      imageBuffer = await imageRes.arrayBuffer();
      imageContentType = imageRes.headers.get('content-type') || 'image/jpeg';
      console.log('[INSTAGRAM POST] Image fetched, size:', imageBuffer.byteLength, 'type:', imageContentType);
    } catch (e) {
      return Response.json({ error: 'Failed to download image from URL' }, { status: 400 });
    }

    const results: { igId: string; username: string; success: boolean; postId?: string; error?: string }[] = [];

    for (const conn of connections) {
      console.log(`[INSTAGRAM POST] Posting to ${conn.platform_username} (${conn.platform_user_id})`);
      try {
        // Step 1: Create media container with binary upload (Instagram processes it directly)
        const formData = new FormData();
        formData.append('image', new Blob([imageBuffer!], { type: imageContentType }), 'image.jpg');
        formData.append('caption', text);

        const containerRes = await fetch(
          `https://graph.facebook.com/v18.0/${conn.platform_user_id}/media?access_token=${conn.access_token}`,
          {
            method: 'POST',
            body: formData,
          }
        );
        const containerData = await containerRes.json();
        console.log(`[INSTAGRAM POST] Container response for ${conn.platform_user_id}:`, JSON.stringify(containerData));

        if (!containerRes.ok || !containerData.id) {
          results.push({
            igId: conn.platform_user_id,
            username: conn.platform_username || 'Instagram',
            success: false,
            error: containerData.error?.message || `HTTP ${containerRes.status}: Failed to create media`,
          });
          continue;
        }

        // Step 2: Wait for Instagram to process the container, then publish
        await new Promise(resolve => setTimeout(resolve, 3000));

        const publishRes = await fetch(
          `https://graph.facebook.com/v18.0/${conn.platform_user_id}/media_publish?access_token=${conn.access_token}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creation_id: containerData.id }),
          }
        );
        const publishData = await publishRes.json();

        if (publishRes.ok && publishData.id) {
          results.push({
            igId: conn.platform_user_id,
            username: conn.platform_username || 'Instagram',
            success: true,
            postId: publishData.id,
          });
        } else {
          results.push({
            igId: conn.platform_user_id,
            username: conn.platform_username || 'Instagram',
            success: false,
            error: publishData.error?.message || 'Failed to publish',
          });
        }
      } catch (err: any) {
        results.push({
          igId: conn.platform_user_id,
          username: conn.platform_username || 'Instagram',
          success: false,
          error: err?.message || String(err),
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    return Response.json({
      success: successful > 0,
      results,
      message: `Posted to ${successful} of ${results.length} Instagram accounts`,
    });

  } catch (err: any) {
    console.error('IG post error:', err);
    return Response.json({ error: err?.message || String(err) || 'Unknown error' }, { status: 500 });
  }
}