
-- Add rented_until column to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN rented_until timestamp with time zone;

-- Create an index for better query performance when filtering by rental dates
CREATE INDEX idx_vehicles_rented_until ON public.vehicles(rented_until);
