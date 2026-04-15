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

export async function POST(request: Request) {
  try {
    const userId = await getSupabaseUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageUrl } = await request.json();
    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
    }

    // Get user's LinkedIn connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'linkedin')
      .single();

    if (connError || !connection?.access_token) {
      return NextResponse.json({ error: 'LinkedIn not connected' }, { status: 401 });
    }

    const accessToken = connection.access_token;

    // Register upload with LinkedIn (this works from Vercel)
    const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:person:${connection.platform_user_id}`,
          serviceRelationships: [
            { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
          ],
        },
      }),
    });

    const registerData = await registerRes.json();
    console.log('LinkedIn pre-register response:', registerRes.status, JSON.stringify(registerData));

    if (!registerRes.ok || !registerData.value?.asset) {
      return NextResponse.json({ 
        error: 'Failed to register LinkedIn image',
        details: registerData 
      }, { status: 400 });
    }

    const assetUrn = registerData.value.asset;
    const uploadUrl = registerData.value.uploadUrl ||
      registerData.value.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;

    // Return everything the browser needs to do the upload
    return NextResponse.json({
      assetUrn,
      uploadUrl,
      accessToken, // Browser will use this to PUT the image
    });

  } catch (error: any) {
    console.error('LinkedIn pre-register error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
