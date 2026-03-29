import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getSupabaseUser(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) return null;
  return user.id;
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform');

    if (!platform) {
      return NextResponse.json({ error: 'Missing platform' }, { status: 400 });
    }

    const userId = await getSupabaseUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from('social_connections')
      .delete()
      .eq('user_id', userId)
      .eq('platform', platform);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Disconnect error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
