import { createServerClient } from '@supabase/supabase-js';

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
    const fileName = `images/${Date.now()}-${Math.random().toString(36).substring(7)}.${contentType.split('/')[1] || 'jpg'}`;

    const supabase = createServerClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, buffer, { contentType, upsert: false });

    if (error) {
      console.error('Supabase image upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage.from('images').getPublicUrl(data.path);
    console.log('Image uploaded, public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err) {
    console.error('Error uploading image to Supabase:', err);
    return null;
  }
}
