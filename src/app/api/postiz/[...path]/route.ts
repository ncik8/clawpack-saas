const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://api.clawpack.net';
const POSTIZ_EMAIL = 'charliemo123@gmail.com';
const POSTIZ_PASSWORD = 'Noodle@478788';

// In-memory cache for session (refreshes periodically)
let cachedSession: { token: string; expires: number } | null = null;

async function getPostizSession(): Promise<string | null> {
  // Check cache first
  if (cachedSession && cachedSession.expires > Date.now()) {
    return cachedSession.token;
  }
  
  // Login to Postiz
  try {
    const loginRes = await fetch(`${POSTIZ_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: POSTIZ_EMAIL, password: POSTIZ_PASSWORD }),
    });
    
    if (loginRes.ok) {
      const data = await loginRes.json();
      // Try different response formats
      const token = data.token || data.access_token || data.session_token;
      
      if (token) {
        cachedSession = {
          token,
          expires: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
        };
        return token;
      }
    }
    
    console.error('Postiz login failed:', await loginRes.text());
  } catch (e) {
    console.error('Postiz login error:', e);
  }
  
  return cachedSession?.token || null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';
  
  if (!path) {
    return Response.json({ error: 'Path is required' }, { status: 400 });
  }
  
  const session = await getPostizSession();
  if (!session) {
    return Response.json({ error: 'Postiz connection failed' }, { status: 500 });
  }
  
  try {
    const res = await fetch(`${POSTIZ_URL}/api/${path}`, {
      headers: {
        'Authorization': `Bearer ${session}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (error) {
    console.error('Postiz GET error:', error);
    return Response.json({ error: 'Proxy error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';
  
  if (!path) {
    return Response.json({ error: 'Path is required' }, { status: 400 });
  }
  
  const session = await getPostizSession();
  if (!session) {
    return Response.json({ error: 'Postiz connection failed' }, { status: 500 });
  }
  
  try {
    const body = await request.json().catch(() => ({}));
    
    const res = await fetch(`${POSTIZ_URL}/api/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (error) {
    console.error('Postiz POST error:', error);
    return Response.json({ error: 'Proxy error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';
  
  if (!path) {
    return Response.json({ error: 'Path is required' }, { status: 400 });
  }
  
  const session = await getPostizSession();
  if (!session) {
    return Response.json({ error: 'Postiz connection failed' }, { status: 500 });
  }
  
  try {
    const res = await fetch(`${POSTIZ_URL}/api/${path}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (error) {
    console.error('Postiz DELETE error:', error);
    return Response.json({ error: 'Proxy error' }, { status: 500 });
  }
}
