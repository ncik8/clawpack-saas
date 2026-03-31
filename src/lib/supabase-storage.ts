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
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('Created buffer, size:', buffer.length);
    
    // Upload with timeout
    const uploadPromise = supabase.storage
      .from('videos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout (120s)')), 120000);
    });
    
    const { data, error } = await Promise.race([uploadPromise, timeoutPromise]) as any;

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
    console.log('uploadVideoUrlToX: Starting with URL:', videoUrl);
    
    // Download video from URL
    console.log('uploadVideoUrlToX: Downloading from Supabase...');
    const response = await fetch(videoUrl);
    console.log('uploadVideoUrlToX: Download response status:', response.status);
    
    if (!response.ok) {
      console.error('uploadVideoUrlToX: Failed to download video:', response.status, response.statusText);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('uploadVideoUrlToX: Downloaded size:', arrayBuffer.byteLength);
    
    // Detect mime type from URL
    const urlLower = videoUrl.toLowerCase();
    let mimeType = 'video/mp4';
    if (urlLower.includes('.webm')) mimeType = 'video/webm';
    else if (urlLower.includes('.mov')) mimeType = 'video/quicktime';
    else if (urlLower.includes('.avi')) mimeType = 'video/x-msvideo';
    
    console.log('uploadVideoUrlToX: mimeType:', mimeType);
    
    // Upload to X
    console.log('uploadVideoUrlToX: Uploading to X...');
    const buffer = Buffer.from(arrayBuffer);
    const mediaId = await uploadXVideo({
      accessToken,
      accessTokenSecret,
      fileBuffer: buffer,
      mimeType,
    });
    
    console.log('uploadVideoUrlToX: Result mediaId:', mediaId);
    return mediaId;
  } catch (err) {
    console.error('uploadVideoUrlToX: Error:', err);
    return null;
  }
}