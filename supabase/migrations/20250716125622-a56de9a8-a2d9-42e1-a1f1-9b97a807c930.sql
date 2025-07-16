-- Create rental_bookings table for storing rental information with date ranges, notes, and photos
CREATE TABLE public.rental_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL,
  user_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  contract_photo_path TEXT,
  customer_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rental_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for rental bookings
CREATE POLICY "Users can view their own rental bookings" 
ON public.rental_bookings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rental bookings" 
ON public.rental_bookings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rental bookings" 
ON public.rental_bookings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rental bookings" 
ON public.rental_bookings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_rental_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_rental_bookings_updated_at
BEFORE UPDATE ON public.rental_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_rental_bookings_updated_at();

-- Create index for better performance
CREATE INDEX idx_rental_bookings_vehicle_id ON public.rental_bookings(vehicle_id);
CREATE INDEX idx_rental_bookings_user_id ON public.rental_bookings(user_id);
CREATE INDEX idx_rental_bookings_dates ON public.rental_bookings(start_date, end_date);

-- Create storage bucket for rental contract photos
INSERT INTO storage.buckets (id, name, public) VALUES ('rental-contracts', 'rental-contracts', true);

-- Create storage policies for rental contract photos
CREATE POLICY "Users can view rental contract photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'rental-contracts');

CREATE POLICY "Users can upload rental contract photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'rental-contracts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their rental contract photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'rental-contracts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their rental contract photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'rental-contracts' AND auth.uid()::text = (storage.foldername(name))[1]);