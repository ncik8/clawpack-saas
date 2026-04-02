import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  
  if (error) {
    return NextResponse.redirect(new URL('/dashboard/connect?error=facebook_denied', request.url));
  }
  
  if (code) {
    // In a real app, exchange code for access token here
    // For now, redirect to dashboard with success
    return NextResponse.redirect(new URL('/dashboard/connect?success=facebook_connected', request.url));
  }
  
  return NextResponse.redirect(new URL('/dashboard/connect?error=no_code', request.url));
}
