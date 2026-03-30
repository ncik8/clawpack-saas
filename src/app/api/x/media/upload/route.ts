import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { uploadXImage } from '@/lib/x-oauth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    console.log('[x-upload] start');

    const supabase = await getSupabaseServerClient();
    console.log('[x-upload] got supabase client');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log('[x-upload] auth result', {
      hasUser: !!user,
      userError: userError?.message ?? null,
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: connection, error: connectionError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'x')
      .single();

    console.log('[x-upload] connection lookup', {
      found: !!connection,
      connectionError: connectionError?.message ?? null,
    });

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: connectionError?.message || 'X account not connected' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    console.log('[x-upload] parsed incoming formData');

    const file = formData.get('file');
    console.log('[x-upload] file entry', {
      exists: !!file,
      type: file ? Object.prototype.toString.call(file) : null,
      isFile: typeof File !== 'undefined' ? file instanceof File : 'File not defined',
    });

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    console.log('[x-upload] file meta', {
      name: file.name,
      size: file.size,
      mimeType: file.type,
    });

    const arrayBuffer = await file.arrayBuffer();
    console.log('[x-upload] got arrayBuffer', {
      bytes: arrayBuffer.byteLength,
    });

    const fileBuffer = Buffer.from(arrayBuffer);
    console.log('[x-upload] created buffer', { length: fileBuffer.length });

    const mimeType = file.type || 'image/jpeg';

    console.log('[x-upload] calling uploadXImage with', {
      accessToken: connection.access_token ? 'present' : 'missing',
      accessTokenSecret: connection.refresh_token ? 'present' : 'missing',
      bufferLength: fileBuffer.length,
      mimeType,
    });

    const mediaId = await uploadXImage({
      accessToken: connection.access_token,
      accessTokenSecret: connection.refresh_token,
      fileBuffer,
      mimeType,
    });

    console.log('[x-upload] success', { mediaId });

    return NextResponse.json({ media_id: mediaId });
  } catch (error: any) {
    console.error('[x-upload] error:', error.message || String(error));
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
