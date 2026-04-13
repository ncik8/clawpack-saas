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

    // Get FB page connections from social_pages
    let query = supabase
      .from('social_pages')
      .select('page_id, page_name, page_access_token, is_active')
      .eq('user_id', user.id)
      .eq('platform', 'facebook');
    
    if (pageIds && pageIds.length > 0) {
      // Normalize page IDs (remove any prefix like 'facebook_')
      const normalizedIds = pageIds.map((id: string) => {
        if (id.includes('_')) return id.split('_').slice(1).join('_');
        return id;
      });
      query = query.in('page_id', normalizedIds);
    }
    
    const { data: pages } = await query;

    if (!pages || pages.length === 0) {
      return Response.json({ error: 'No Facebook Page connected' }, { status: 400 });
    }

    const results: { pageId: string; pageName: string; success: boolean; postId?: string; error?: string }[] = [];

    for (const page of pages) {
      try {
        if (!page.is_active) continue;

        // Post to Facebook Page using page access token
        const hasImage = imageData || imageUrl;
        const endpoint = hasImage 
          ? `https://graph.facebook.com/v18.0/${page.page_id}/photos`
          : `https://graph.facebook.com/v18.0/${page.page_id}/feed`;
        
        let response: Response;
        if (hasImage) {
          // Photo post - use FormData for base64
          const formData = new FormData();
          formData.append('access_token', page.page_access_token);
          formData.append('message', text);
          if (imageData) {
            const base64Match = imageData.match(/^data:([^;]+);base64,(.+)$/);
            if (base64Match) {
              const mimeType = base64Match[1];
              const base64Data = base64Match[2];
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
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, access_token: page.page_access_token }),
          });
        }

        const data = await response.json();

        if (response.ok && data.id) {
          results.push({
            pageId: page.page_id,
            pageName: page.page_name || 'Facebook Page',
            success: true,
            postId: data.id,
          });
        } else {
          results.push({
            pageId: page.page_id,
            pageName: page.page_name || 'Facebook Page',
            success: false,
            error: data.error?.message || 'Post failed',
          });
        }
      } catch (e: any) {
        results.push({
          pageId: page.page_id,
          pageName: page.page_name || 'Facebook Page',
          success: false,
          error: e.message,
        });
      }
    }

    const successfulPosts = results.filter(r => r.success);
    
    if (successfulPosts.length === 0) {
      return Response.json({ 
        error: 'All Facebook posts failed',
        details: results 
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      results,
      message: `Posted to ${successfulPosts.length} Facebook page(s)`,
    });

  } catch (error: any) {
    console.error('Facebook post error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
