-- Add passenger_capacity column to vehicles table
ALTER TABLE public.vehicles
ADD COLUMN passenger_capacity integer DEFAULT 5;

-- Add comment for clarity
COMMENT ON COLUMN public.vehicles.passenger_capacity IS 'Number of passengers the vehicle can accommodate';