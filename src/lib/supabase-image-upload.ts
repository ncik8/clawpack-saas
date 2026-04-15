import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dcyifihwvqxtpypphpef.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function uploadImageUrlToSupabase(imageUrl: string): Promise<string | null> {
  try {
    console.log('Downloading image from:', imageUrl);
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      console.error('Failed to fetch image:', imageRes.status);
      return null;
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await imageRes.arrayBuffer());
    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Try images bucket first
    let { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, buffer, { contentType, upsert: false });

    // Fallback to videos bucket
    if (error) {
      console.log('Images bucket error, trying videos:', error.message);
      const result = await supabase.storage
        .from('videos')
        .upload(fileName, buffer, { contentType, upsert: false });
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Supabase image upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage.from('images').getPublicUrl(data!.path);
    console.log('Image uploaded, public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err) {
    console.error('Error uploading image to Supabase:', err);
    return null;
  }
}
