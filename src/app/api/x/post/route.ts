import { NextResponse } from 'next/server';
import { uploadVideoUrlToX } from '@/lib/supabase-storage';
import crypto from 'crypto';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dcyifihwvqxtpypphpef.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function normalizeUrl(input: string): string {
  const url = new URL(input);
  url.hash = '';
  url.search = '';
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
    url.port = '';
  }
  return url.toString();
}

function buildOAuthHeaderForJson({
  method,
  url,
  consumerKey,
  consumerSecret,
  accessToken,
  accessTokenSecret,
}: {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}) {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    oauth_token: accessToken,
  };

  const baseString = [
    method.toUpperCase(),
    percentEncode(normalizeUrl(url)),
    percentEncode(
      Object.keys(oauthParams)
        .sort()
        .map((key) => `${percentEncode(key)}=${percentEncode(oauthParams[key])}`)
        .join('&')
    ),
  ].join('&');

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  oauthParams.oauth_signature = signature;

  return (
    'OAuth ' +
    Object.keys(oauthParams)
      .sort()
      .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
      .join(', ')
  );
}

export async function POST(request: Request) {
  console.log('X POST ROUTE HIT');
  
  try {
    // Get auth header from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - no auth header' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    
    // Use service role key to validate the user's token
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized - invalid token' }, { status: 401 });
    }

    const userId = user.id;

    // Get stored X connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'x')
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: 'X not connected' }, { status: 400 });
    }

    const body = await request.json();
    const text = body.text as string;
    const mediaIds = body.media_ids as string[] | undefined;
    const videoUrl = body.video_url as string | undefined;

    // If video URL provided, download and upload to Twitter
    let finalMediaIds = mediaIds || [];
    if (videoUrl && !mediaIds?.length) {
      console.log('Downloading video from:', videoUrl);
      const mediaId = await uploadVideoUrlToX(videoUrl, connection.access_token, connection.refresh_token);
      console.log('Upload result:', mediaId);
      if (!mediaId) {
        return NextResponse.json({ error: 'Video upload to X failed' }, { status: 500 });
      }
      finalMediaIds = [mediaId];
    }

    const url = 'https://api.twitter.com/2/tweets';
    const payload: any = { text };
    if (finalMediaIds?.length) {
      payload.media = { media_ids: finalMediaIds };
    }

    const authHeaderOAuth = buildOAuthHeaderForJson({
      method: 'POST',
      url,
      consumerKey: process.env.X_API_KEY!,
      consumerSecret: process.env.X_API_SECRET!,
      accessToken: connection.access_token,
      accessTokenSecret: connection.refresh_token,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeaderOAuth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: `Tweet failed: ${JSON.stringify(data)}` }, { status: 500 });

    return NextResponse.json({ data: data.data });
  } catch (error: any) {
    console.error('X post error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
