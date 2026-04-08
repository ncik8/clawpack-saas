
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await request.json();

    if (!text) {
      return Response.json({ error: 'Content required' }, { status: 400 });
    }

    // Get all IG account connections for this user
    const { data: connections } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'instagram');

    if (!connections || connections.length === 0) {
      return Response.json({ error: 'No Instagram account connected' }, { status: 400 });
    }

    const results: { igId: string; username: string; success: boolean; postId?: string; error?: string }[] = [];

    for (const conn of connections) {
      try {
        // Step 1: Create media container
        const containerRes = await fetch(
          `https://graph.facebook.com/v18.0/${conn.platform_user_id}/media?access_token=${conn.access_token}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caption: text }),
          }
        );
        const containerData = await containerRes.json();

        if (!containerRes.ok || !containerData.id) {
          results.push({
            igId: conn.platform_user_id,
            username: conn.platform_username || 'Instagram',
            success: false,
            error: containerData.error?.message || 'Failed to create media',
          });
          continue;
        }

        // Step 2: Publish media container
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
          error: err.message,
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
    return Response.json({ error: err.message }, { status: 500 });
  }
}
