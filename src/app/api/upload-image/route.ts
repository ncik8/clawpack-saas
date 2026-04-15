import { createServerClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dcyifihwvqxtpypphpef.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL provided' }, { status: 400 });
    }

    console.log('Fetching image from:', imageUrl);
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 });
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await imageRes.arrayBuffer());
    
    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Try uploading to images bucket
    let result = await supabase.storage
      .from('images')
      .upload(fileName, buffer, { contentType, upsert: false });

    // If images bucket doesn't exist, try videos bucket
    if (result.error) {
      console.log('Images bucket not found, trying videos bucket');
      result = await supabase.storage
        .from('videos')
        .upload(fileName, buffer, { contentType, upsert: false });
    }

    if (result.error) {
      console.error('Upload error:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const bucket = result.data.path.startsWith('images/') ? 'images' : 'videos';
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(result.data.path);
    
    console.log('Uploaded to Supabase, URL:', urlData.publicUrl);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err: any) {
    console.error('Error:', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
