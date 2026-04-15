import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear all Supabase auth cookies by setting them to expired
  const clearCookieNames = [
    'sb-access-token',
    'sb-refresh-token', 
    'supabase-auth-token',
    'supabase-auth-token-secure',
  ];
  
  clearCookieNames.forEach(name => {
    response.cookies.set(name, '', {
      expires: new Date(0),
      path: '/',
    });
  });
  
  return response;
}
