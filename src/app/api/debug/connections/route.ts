
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: connections } = await supabase
    .from('social_connections')
    .select('*')
    .eq('user_id', user.id);

  return NextResponse.json({ 
    user_id: user.id,
    connections: connections || [],
    count: connections?.length || 0
  });
}
