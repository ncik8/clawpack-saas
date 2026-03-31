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
    
    // Stream the file in chunks to avoid memory issues
    let buffer: Buffer;
    if (file.stream) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of file.stream()) {
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
    } else {
      // Fallback for environments without stream()
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }
    
    console.log('Created buffer, size:', buffer.length);
    
    // Upload with timeout
    const uploadPromise = supabase.storage
      .from('videos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout (30s)')), 30000);
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