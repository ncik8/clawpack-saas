import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return Response.json({ error: 'not logged in' });
  }

  const { data: connections } = await supabase
    .from('social_connections')
    .select('*')
    .eq('user_id', session.user.id);

  return Response.json({ 
    user_id: session.user.id,
    connections: connections || [] 
  });
}