import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { buildOAuthHeaderUrlEncoded } from '@/lib/x-oauth';

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: connection, error } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'x')
      .single();

    if (error || !connection) {
      return NextResponse.json(
        { error: 'X account not connected' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const text = body.text as string | undefined;
    const mediaIds = body.media_ids as string[] | undefined;

    if (!text && (!mediaIds || mediaIds.length === 0)) {
      return NextResponse.json(
        { error: 'Either text or media_ids is required' },
        { status: 400 }
      );
    }

    const url = 'https://api.twitter.com/1.1/statuses/update.json';
    const bodyParams: Record<string, string> = { status: text || '' };
    if (mediaIds?.length) {
      bodyParams.media_ids = mediaIds.join(',');
    }

    const authHeader = buildOAuthHeaderUrlEncoded({
      method: 'POST',
      url,
      consumerKey: process.env.X_API_KEY!,
      consumerSecret: process.env.X_API_SECRET!,
      accessToken: connection.access_token,
      accessTokenSecret: connection.refresh_token,
      bodyParams,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(bodyParams).toString(),
    });

    const raw = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: `Tweet create failed: ${raw}` },
        { status: 500 }
      );
    }

    const responseData = JSON.parse(raw);
    return NextResponse.json({ success: true, tweet: responseData });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Tweet creation failed' },
      { status: 500 }
    );
  }
}
