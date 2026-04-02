import { NextRequest, NextResponse } from 'next/server';

// Meta sends a POST when user deauthorizes the app
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, app_id } = body;
    
    // In a real app, delete the user's tokens from database
    console.log('Facebook deauthorization:', { user_id, app_id });
    
    // Return 200 OK to acknowledge
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process deauthorization' }, { status: 500 });
  }
}
