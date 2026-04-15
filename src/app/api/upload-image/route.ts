import { createClient } from '@supabase/supabase-js';
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
    // Override content-type if it's wrong (image2url returns application/octet-stream)
    // Detect from file magic bytes or URL extension
    const urlExt = imageUrl.split('.').pop()?.toLowerCase().split('?')[0];
    const extToMime: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    const correctMime = extToMime[urlExt || ''] || (contentType.startsWith('image/') ? contentType : 'image/jpeg');
    const buffer = Buffer.from(await imageRes.arrayBuffer());
    
    const ext = correctMime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Try uploading to images bucket
    let { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, buffer, { contentType: correctMime, upsert: false });

    // If images bucket doesn't exist or rejects, try videos bucket
    if (error) {
      console.log('Images bucket error, trying videos bucket:', error.message);
      const result = await supabase.storage
        .from('videos')
        .upload(fileName, buffer, { contentType: correctMime, upsert: false });
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('images').getPublicUrl(data!.path);
    
    console.log('Uploaded to Supabase, URL:', urlData.publicUrl);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err: any) {
    console.error('Error:', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
