
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all connections
  const { data: connections } = await supabase
    .from('social_connections')
    .select('*')
    .eq('user_id', user.id);

  const result: any = { user_id: user.id, connections: [] };

  if (connections) {
    for (const conn of connections) {
      const entry: any = {
        platform: conn.platform,
        platform_user_id: conn.platform_user_id,
        platform_username: conn.platform_username,
        tokenPreview: conn.access_token?.substring(0, 20) + '...',
      };

      // For FB - check what token can access
      if (conn.platform === 'facebook' && conn.access_token) {
        // Check if user token
        const meRes = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${conn.access_token}&fields=id,name`);
        const meData = await meRes.json();
        entry.me = meData;

        // Check pages
        const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${conn.access_token}`);
        const pagesData = await pagesRes.json();
        entry.pages = pagesData;
      }

      // For IG - check what token can access
      if (conn.platform === 'instagram' && conn.access_token) {
        // Check IG account info
        const igRes = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${conn.access_token}&fields=id,name,account_type,username`);
        const igData = await igRes.json();
        entry.igInfo = igData;
      }

      result.connections.push(entry);
    }
  }

  return NextResponse.json(result);
}
