-- Create storage bucket for damage report images
INSERT INTO storage.buckets (id, name, public) VALUES ('damage_reports', 'damage_reports', true);

-- Create RLS policies for damage report images storage
CREATE POLICY "Anyone can view damage images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'damage_reports');

CREATE POLICY "Users can upload damage images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'damage_reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their damage images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'damage_reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their damage images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'damage_reports' AND auth.uid()::text = (storage.foldername(name))[1]);