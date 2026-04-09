import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return Response.json({ error: 'not logged in' });
  }

  const { data: connections } = await supabase
    .from('social_connections')
    .select('*')
    .eq('user_id', user.id);

  return Response.json({ 
    user_id: user.id,
    connections: connections || [] 
  });
}