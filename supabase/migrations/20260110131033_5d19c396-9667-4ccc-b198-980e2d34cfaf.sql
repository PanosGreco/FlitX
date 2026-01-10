-- Create a storage bucket for vehicle documents (private bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-documents', 'vehicle-documents', false);

-- Create RLS policies for vehicle documents storage
-- Users can only upload to their own folder (user_id/vehicle_id/filename)
CREATE POLICY "Users can upload their own vehicle documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can only view their own vehicle documents
CREATE POLICY "Users can view their own vehicle documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vehicle-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can only update their own vehicle documents
CREATE POLICY "Users can update their own vehicle documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vehicle-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can only delete their own vehicle documents
CREATE POLICY "Users can delete their own vehicle documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehicle-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create a table for document metadata
CREATE TABLE public.vehicle_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

-- Create strict RLS policies - only the document owner can access
CREATE POLICY "Users can view their own vehicle documents"
ON public.vehicle_documents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vehicle documents"
ON public.vehicle_documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vehicle documents"
ON public.vehicle_documents
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vehicle documents"
ON public.vehicle_documents
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vehicle_documents_updated_at
BEFORE UPDATE ON public.vehicle_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();