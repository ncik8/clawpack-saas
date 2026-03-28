import { NextResponse } from 'next/server';

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const jwt = request.headers.get('x-postiz-jwt');
    
    if (!jwt) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const path = params.path.join('/');
    const url = new URL(request.url);
    const queryString = url.search;

    const response = await fetch(`${POSTIZ_URL}/api/${path}${queryString}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'auth': jwt,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

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
    const jwt = request.headers.get('x-postiz-jwt');
    const body = await request.json();
    
    if (!jwt) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const path = params.path.join('/');

    const response = await fetch(`${POSTIZ_URL}/api/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'auth': jwt,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}
