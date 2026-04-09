
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, imageUrl } = await request.json();

    if (!text && !imageUrl) {
      return Response.json({ error: 'Content or image required' }, { status: 400 });
    }

    // Get all FB page connections for this user
    const { data: connections } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'facebook');

    if (!connections || connections.length === 0) {
      return Response.json({ error: 'No Facebook Page connected' }, { status: 400 });
    }

    const results: { pageId: string; pageName: string; success: boolean; postId?: string; error?: string }[] = [];

    for (const conn of connections) {
      try {
        // Post to Facebook Page using page access token
        const postData: any = { message: text };
        
        const response = await fetch(`https://graph.facebook.com/v18.0/${conn.platform_user_id}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            access_token: conn.access_token,
          }),
        });

        const data = await response.json();

        if (response.ok && data.id) {
          results.push({
            pageId: conn.platform_user_id,
            pageName: conn.platform_username || 'Facebook Page',
            success: true,
            postId: data.id,
          });
        } else {
          // Facebook error might not have .error.message - log for debugging
          console.error('Facebook API error:', data);
          const errorMsg = data.error?.message || data.error?.type || data.error?.code || 'Unknown Facebook error';
          results.push({
            pageId: conn.platform_user_id,
            pageName: conn.platform_username || 'Facebook Page',
            success: false,
            error: errorMsg,
          });
        }
      } catch (err: any) {
        results.push({
          pageId: conn.platform_user_id,
          pageName: conn.platform_username || 'Facebook Page',
          success: false,
          error: err.message,
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    return Response.json({
      success: successful > 0,
      results,
      message: `Posted to ${successful} of ${results.length} Facebook Pages`,
    });
  } catch (err: any) {
    console.error('FB post error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
