-- Remove fuel_level column from vehicles table (no longer needed)
ALTER TABLE public.vehicles DROP COLUMN IF EXISTS fuel_level;