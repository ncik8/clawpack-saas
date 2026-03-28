import { NextResponse } from 'next/server';

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const url = new URL(request.url);
    const queryString = url.search;
    
    // Get cookie from header - Postiz expects Cookie header, not x-postiz-cookie
    const cookie = request.headers.get('x-postiz-cookie');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const response = await fetch(`${POSTIZ_URL}/api/${path}${queryString}`, {
      method: 'GET',
      headers,
      redirect: 'manual',
    });

    // Handle redirect - must use Response constructor, not NextResponse.redirect()
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('location');
      if (location) {
        return new Response(null, {
          status: 302,
          headers: { Location: location },
        });
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const body = await request.json();
    
    // Get cookie from header - Postiz expects Cookie header
    const cookie = request.headers.get('x-postiz-cookie');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const response = await fetch(`${POSTIZ_URL}/api/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      redirect: 'manual',
    });

    // Handle redirect - Postiz returns 302 to Twitter/LinkedIn OAuth
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('location');
      if (location) {
        return new Response(null, {
          status: 302,
          headers: { Location: location },
        });
      }
    }

    // For non-redirect responses, return as JSON
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}
