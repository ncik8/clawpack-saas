import { createClient } from '@supabase/supabase-js';
import { uploadXVideo } from './x-oauth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadVideoToSupabase(file: File): Promise<string | null> {
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  
  const { data, error } = await supabase.storage
    .from('videos')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false
    });

  if (error) {
    console.error('Supabase upload error:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('videos')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

export async function uploadVideoUrlToX(videoUrl: string, accessToken: string, accessTokenSecret: string): Promise<string | null> {
  try {
    // Download video from URL
    const response = await fetch(videoUrl);
    if (!response.ok) {
      console.error('Failed to download video:', response.status);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Detect mime type from URL
    const urlLower = videoUrl.toLowerCase();
    let mimeType = 'video/mp4';
    if (urlLower.includes('.webm')) mimeType = 'video/webm';
    else if (urlLower.includes('.mov')) mimeType = 'video/quicktime';
    else if (urlLower.includes('.avi')) mimeType = 'video/x-msvideo';
    
    // Upload to X
    const mediaId = await uploadXVideo({
      accessToken,
      accessTokenSecret,
      fileBuffer: buffer,
      mimeType,
    });
    
    return mediaId;
  } catch (err) {
    console.error('Failed to upload video from URL to X:', err);
    return null;
  }
}