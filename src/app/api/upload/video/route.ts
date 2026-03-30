import { NextResponse } from 'next/server';
import { uploadVideoToSupabase } from '@/lib/supabase-storage';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file type
    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }
    
    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 });
    }
    
    const publicUrl = await uploadVideoToSupabase(file);
    
    if (!publicUrl) {
      console.error('Video upload failed: uploadVideoToSupabase returned null');
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
    
    console.log('Video upload successful:', publicUrl);
    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Video upload error:', error);
    return NextResponse.json({ error: `Upload failed: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}