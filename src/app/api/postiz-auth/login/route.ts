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
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Extract JWT from set-cookie header
    const setCookie = response.headers.get('set-cookie');
    const jwt = setCookie?.split(';')[0]?.replace('auth=', '') || data.auth;

    return NextResponse.json({ 
      success: true, 
      jwt,
      user: { email }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
