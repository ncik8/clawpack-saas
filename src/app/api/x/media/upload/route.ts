import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { uploadXImage, uploadXVideo } from '@/lib/x-oauth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: connection, error } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'x')
      .single();

    if (error || !connection) {
      return NextResponse.json(
        { error: 'X account not connected with OAuth 1.0a' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let mediaId: string;

    if (mimeType.startsWith('image/')) {
      mediaId = await uploadXImage({
        accessToken: connection.access_token,
        accessTokenSecret: connection.refresh_token,
        fileBuffer: buffer,
        mimeType,
      });
    } else if (mimeType.startsWith('video/') || mimeType === 'image/gif') {
      mediaId = await uploadXVideo({
        accessToken: connection.access_token,
        accessTokenSecret: connection.refresh_token,
        fileBuffer: buffer,
        mimeType,
      });
    } else {
      return NextResponse.json(
        { error: `Unsupported mime type: ${mimeType}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ media_id: mediaId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
