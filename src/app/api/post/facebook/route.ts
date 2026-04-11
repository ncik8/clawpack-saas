
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, imageUrl, pageIds, imageData } = await request.json();

    if (!text && !imageUrl && !imageData) {
      return Response.json({ error: 'Content or image required' }, { status: 400 });
    }

    // Get FB page connections
    let query = supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'facebook');
    
    if (pageIds && pageIds.length > 0) {
      // Normalize page IDs (remove any prefix like 'facebook_' or 'facebook:')
      const normalizedIds = pageIds.map((id: string) => {
        if (id.includes(':')) return id.split(':')[1];
        if (id.includes('_')) return id.split('_')[1];
        return id;
      });
      query = query.in('platform_user_id', normalizedIds);
    }
    
    const { data: connections } = await query;

    if (!connections || connections.length === 0) {
      return Response.json({ error: 'No Facebook Page connected' }, { status: 400 });
    }

    const results: { pageId: string; pageName: string; success: boolean; postId?: string; error?: string }[] = [];

    for (const conn of connections) {
      try {
        // Post to Facebook Page using page access token
        // Use /photos endpoint for posts with images, /feed for text-only
        const hasImage = imageData || imageUrl;
        const endpoint = hasImage 
          ? `https://graph.facebook.com/v18.0/${conn.platform_user_id}/photos`
          : `https://graph.facebook.com/v18.0/${conn.platform_user_id}/feed`;
        
        let response: Response;
        if (hasImage) {
          // Photo post - use FormData for base64
          const formData = new FormData();
          formData.append('access_token', conn.access_token);
          formData.append('message', text);
          if (imageData) {
            // Extract base64 data from data URL (e.g. "data:image/jpeg;base64,/9j/4AAQ...")
            const base64Match = imageData.match(/^data:([^;]+);base64,(.+)$/);
            if (base64Match) {
              const mimeType = base64Match[1];
              const base64Data = base64Match[2];
              // Convert base64 to Blob
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: mimeType });
              formData.append('source', blob, 'image.jpg');
            }
          } else if (imageUrl) {
            formData.append('url', imageUrl);
          }
          
          response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
          });
        } else {
          // Text-only post
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, access_token: conn.access_token }),
          });
        }

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
