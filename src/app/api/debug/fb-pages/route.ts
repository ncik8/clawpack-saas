
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get FB connection
  const { data: connection } = await supabase
    .from('social_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('platform', 'facebook')
    .single();

  if (!connection?.access_token) {
    return NextResponse.json({ error: 'No Facebook connection' });
  }

  const token = connection.access_token;

  // Step 1: Get all pages
  const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`);
  const pagesData = await pagesRes.json();

  const result: any = {
    userTokenValid: pagesRes.ok,
    pages: [],
    instagramAccounts: []
  };

  if (pagesData.data) {
    for (const page of pagesData.data) {
      // Get page details with IG account
      const pageRes = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=id,name,instagram_business_account&access_token=${page.access_token}`);
      const pageData = await pageRes.json();

      result.pages.push({
        id: page.id,
        name: page.name,
        hasIg: !!pageData.instagram_business_account,
        igAccountId: pageData.instagram_business_account?.id || null
      });

      if (pageData.instagram_business_account) {
        result.instagramAccounts.push({
          pageId: page.id,
          pageName: page.name,
          igAccountId: pageData.instagram_business_account.id
        });
      }
    }
  }

  return NextResponse.json(result);
}
