import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dcyifihwvqxtpypphpef.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const userId = '32469aa0-5830-4af7-a928-ee58c0195630';
  
  // Delete Instagram connections
  const { error: connError } = await supabaseAdmin
    .from('social_connections')
    .delete()
    .eq('user_id', userId)
    .eq('platform', 'instagram');
  
  console.log('Delete from social_connections:', connError || 'ok');
  
  // Also delete from social_pages
  const { error: pagesError } = await supabaseAdmin
    .from('social_pages')
    .delete()
    .eq('user_id', userId)
    .eq('platform', 'instagram');
  
  console.log('Delete from social_pages:', pagesError || 'ok');
}

main().catch(console.error);