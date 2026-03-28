import { NextResponse } from 'next/server';

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';

export async function POST(request: Request) {
  try {
    const { email, password, userId } = await request.json();

    const response = await fetch(`${POSTIZ_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Host': 'post.clawpack.net',
      },
      body: JSON.stringify({
        email,
        password,
        provider: 'LOCAL',
      }),
      credentials: 'include',
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Extract cookie
    const setCookie = response.headers.get('set-cookie');
    const authCookie = setCookie?.split(';')[0] || '';
    const jwt = data.auth || authCookie.replace('auth=', '');

    return NextResponse.json({ 
      success: true, 
      jwt,
      cookie: authCookie, // Frontend stores this and sends with requests
      user: { email }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
