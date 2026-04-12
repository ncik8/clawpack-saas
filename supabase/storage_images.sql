-- Create images storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  20971520, -- 20MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Enable public access to images
CREATE POLICY "Public image access" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "Authenticated image upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'images');

CREATE POLICY "Authenticated image update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'images');

CREATE POLICY "Service role image delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'images');
