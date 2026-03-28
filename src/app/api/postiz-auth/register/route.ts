import { NextResponse } from 'next/server';

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';

export async function POST(request: Request) {
  try {
    const { email, password, name, company } = await request.json();

    const response = await fetch(`${POSTIZ_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: name || email.split('@')[0],
        company: company || 'ClawPack User',
        provider: 'LOCAL',
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Extract JWT from set-cookie header
    const setCookie = response.headers.get('set-cookie');
    const authCookie = setCookie?.split(';')[0]?.replace('auth=', '');

    const jwt = data.auth || authCookie;

    return NextResponse.json({ 
      success: true, 
      jwt,
      user: { email, name }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
