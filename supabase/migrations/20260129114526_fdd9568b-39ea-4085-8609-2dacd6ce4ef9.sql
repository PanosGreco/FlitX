-- Add transmission_type column to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN transmission_type text NOT NULL DEFAULT 'manual'
CONSTRAINT transmission_type_check CHECK (transmission_type IN ('manual', 'automatic'));