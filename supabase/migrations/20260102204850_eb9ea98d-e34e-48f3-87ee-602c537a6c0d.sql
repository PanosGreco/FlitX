-- Create storage bucket for damage images
INSERT INTO storage.buckets (id, name, public)
VALUES ('damage-images', 'damage-images', true);

-- Create policy for authenticated users to upload damage images
CREATE POLICY "Users can upload damage images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'damage-images' 
  AND auth.uid() IS NOT NULL
);

-- Create policy for public access to view damage images
CREATE POLICY "Anyone can view damage images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'damage-images');

-- Create policy for users to delete their own damage images
CREATE POLICY "Users can delete their damage images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'damage-images' 
  AND auth.uid() IS NOT NULL
);