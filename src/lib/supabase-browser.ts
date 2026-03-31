import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client for direct browser uploads
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadVideoToSupabaseBrowser(file: File): Promise<string | null> {
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  
  const { data, error } = await supabaseBrowser.storage
    .from('videos')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false
    });

  if (error) {
    console.error('Supabase browser upload error:', error);
    return null;
  }

  const { data: urlData } = supabaseBrowser.storage
    .from('videos')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

export async function deleteVideoFromSupabaseBrowser(videoUrl: string): Promise<void> {
  if (!videoUrl || !videoUrl.includes('/storage/v1/object/public/videos/')) {
    return;
  }
  
  try {
    const fileName = videoUrl.split('/videos/')[1];
    if (!fileName) return;
    
    const { error } = await supabaseBrowser.storage
      .from('videos')
      .remove([fileName]);
    
    if (error) {
      console.error('Failed to delete video from Supabase:', error);
    } else {
      console.log('Deleted video from Supabase:', fileName);
    }
  } catch (err) {
    console.error('Failed to delete video from Supabase:', err);
  }
}