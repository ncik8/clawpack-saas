import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { text } = await request.json();
  if (!text) return Response.json({ error: 'Missing text' }, { status: 400 });

  // Get stored connection
  const { data: connection } = await supabase
    .from('social_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('platform', 'linkedin')
    .single();

  if (!connection?.access_token) {
    return Response.json(
      { error: 'LinkedIn not connected. Please reconnect.' },
      { status: 401 }
    );
  }

  // Check if token needs refresh
  const expiresAt = new Date(connection.expires_at).getTime();
  if (Date.now() > expiresAt - 300000 && connection.refresh_token) {
    // Refresh token
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
      connection.access_token = newTokens.access_token;
    }
  }

  // Post to LinkedIn using their API
  const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${connection.platform_user_id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  });

  const postData = await postRes.json();

  if (!postRes.ok) {
    console.error('LinkedIn post failed:', postData);
    return Response.json({ error: 'Failed to post to LinkedIn', details: postData }, { status: postRes.status });
  }

  return Response.json({ success: true, postId: postData.id });
}