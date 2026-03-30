import { createClient } from '@supabase/supabase-js';
import { uploadXVideo } from './x-oauth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadVideoToSupabase(file: File): Promise<string | null> {
  try {
    console.log('Starting video upload to Supabase:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    console.log('Generated filename:', fileName);
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('Converted to ArrayBuffer, size:', arrayBuffer.byteLength);
    
    // Try uploading with ArrayBuffer directly (works in both Node.js and Edge runtimes)
    console.log('Uploading to Supabase storage bucket: videos');
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return null;
    }

    console.log('Supabase upload successful:', data);
    
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(data.path);

    console.log('Public URL generated:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err) {
    console.error('Error in uploadVideoToSupabase:', err);
    return null;
  }
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
    
    // Detect mime type from URL
    const urlLower = videoUrl.toLowerCase();
    let mimeType = 'video/mp4';
    if (urlLower.includes('.webm')) mimeType = 'video/webm';
    else if (urlLower.includes('.mov')) mimeType = 'video/quicktime';
    else if (urlLower.includes('.avi')) mimeType = 'video/x-msvideo';
    
    // Upload to X - need to convert to Buffer for the x-oauth functions
    // These functions expect Buffer, but we're in a Node.js runtime
    const buffer = Buffer.from(arrayBuffer);
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