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

    // Get LinkedIn connection
    const { data: connection } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'linkedin')
      .single();

    if (!connection?.access_token) {
      return NextResponse.json({ error: 'LinkedIn not connected' }, { status: 401 });
    }

    const accessToken = connection.access_token;
    const authorUrn = `urn:li:person:${connection.platform_user_id}`;

    // Step 1: Register
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
          owner: authorUrn,
          serviceRelationships: [
            { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
          ],
        },
      }),
    });
    const registerData = await registerRes.json();
    console.log('[debug] register:', registerRes.status, JSON.stringify(registerData));

    if (!registerRes.ok || !registerData.value?.asset) {
      return NextResponse.json({ step: 'register', error: 'Failed', details: registerData }, { status: 400 });
    }

    const uploadUrl = registerData.value.uploadUrl ||
      registerData.value.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
    const assetUrn = registerData.value.asset;

    if (!uploadUrl) {
      return NextResponse.json({ step: 'register', error: 'No uploadUrl', details: registerData }, { status: 400 });
    }

    // Step 2: Fetch image
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return NextResponse.json({ step: 'fetch', error: `Failed to fetch image: ${imageRes.status}` }, { status: 400 });
    }
    const contentType = imageRes.headers.get('content-type') || 'image/png';
    const imageBytes = await imageRes.arrayBuffer();
    console.log('[debug] image fetched:', contentType, imageBytes.byteLength, 'bytes');

    // Step 3: PUT — isolated, no wrappers, no auth header
    console.log('[debug] PUT to:', uploadUrl);
    console.log('[debug] PUT headers:', { 'Content-Type': contentType });
    console.log('[debug] PUT body type:', new Uint8Array(imageBytes).constructor.name, 'length:', imageBytes.byteLength);

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: imageBytes,
    });
    
    const uploadStatus = uploadRes.status;
    const uploadText = await uploadRes.text().catch(() => '(no body)');
    console.log('[debug] PUT response:', uploadStatus, uploadText.substring(0, 200));

    return NextResponse.json({
      step: 'upload',
      status: uploadStatus,
      body: uploadText.substring(0, 200),
      assetUrn,
      uploadUrl,
    });

  } catch (error: any) {
    console.error('[debug] error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
