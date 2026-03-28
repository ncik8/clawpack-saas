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
    
    // Get cookie from header
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
      credentials: 'include',
    });

    const data = await response.json();
    
    // Return cookie in response for frontend to store
    const setCookie = response.headers.get('set-cookie');
    
    return NextResponse.json({
      ...data,
      _cookie: setCookie?.split(';')[0]
    });
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
    
    // Get cookie from header
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
      credentials: 'include',
    });

    const data = await response.json();
    
    // Return cookie in response for frontend to store
    const setCookie = response.headers.get('set-cookie');
    
    return NextResponse.json({
      ...data,
      _cookie: setCookie?.split(';')[0]
    });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}
