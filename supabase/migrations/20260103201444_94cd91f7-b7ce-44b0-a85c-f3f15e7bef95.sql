-- Add time and location fields to rental_bookings
ALTER TABLE public.rental_bookings 
ADD COLUMN IF NOT EXISTS pickup_time TIME WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS return_time TIME WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS pickup_location TEXT,
ADD COLUMN IF NOT EXISTS dropoff_location TEXT,
ADD COLUMN IF NOT EXISTS contract_photo_path TEXT;

-- Add location and booking reference to daily_tasks
ALTER TABLE public.daily_tasks 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.rental_bookings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contract_path TEXT;

-- Create index for booking_id lookups
CREATE INDEX IF NOT EXISTS idx_daily_tasks_booking_id ON public.daily_tasks(booking_id);

-- Create storage bucket for rental contracts if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('rental-contracts', 'rental-contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for rental contracts
CREATE POLICY "Users can upload their own contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rental-contracts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own contracts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'rental-contracts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own contracts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'rental-contracts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Public can view contracts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'rental-contracts');