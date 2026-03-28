import { NextResponse } from 'next/server';

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const response = await fetch(`${POSTIZ_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        provider: 'LOCAL',
      }),
      credentials: 'include', // Important: include cookies
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Extract full cookie for auth
    const setCookie = response.headers.get('set-cookie');
    const authCookie = setCookie?.split(';')[0] || '';
    const jwt = data.auth || authCookie.replace('auth=', '');

    // Create response with cookie
    const nextResponse = NextResponse.json({ 
      success: true, 
      jwt: jwt,
      user: { email }
    });

    // Forward the Postiz cookie to the browser
    if (authCookie) {
      nextResponse.headers.set('Set-Cookie', authCookie);
    }

    return nextResponse;
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
