import { createClient } from '@/utils/supabase/server';
import { getValidTwitterToken } from '@/lib/twitter-refresh';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { text } = await request.json();
  if (!text) return Response.json({ error: 'Missing text' }, { status: 400 });

  // This automatically refreshes if needed
  const token = await getValidTwitterToken(user.id);

  if (!token) {
    return Response.json(
      { error: 'Twitter not connected or token expired. Please reconnect.' },
      { status: 401 }
    );
  }

  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Tweet failed:', data);
    return Response.json({ error: 'Failed to post', details: data }, { status: res.status });
  }

  return Response.json({ success: true, tweet: data });
}