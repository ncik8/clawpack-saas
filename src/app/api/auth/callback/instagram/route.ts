import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  
  if (error) {
    return NextResponse.redirect(new URL('/dashboard/connect?error=instagram_denied', request.url));
  }
  
  if (code) {
    // In a real app, exchange code for access token here
    // For Instagram/Meta, you need to exchange the code for a token
    return NextResponse.redirect(new URL('/dashboard/connect?success=instagram_connected', request.url));
  }
  
  return NextResponse.redirect(new URL('/dashboard/connect?error=no_code', request.url));
}
