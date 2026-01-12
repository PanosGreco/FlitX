-- Add vehicle_type column with enum for top-level classification
-- Values: car, motorbike, atv

-- First, add the vehicle_type column
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS vehicle_type TEXT NOT NULL DEFAULT 'car';

-- Add check constraint for valid vehicle types
ALTER TABLE public.vehicles 
ADD CONSTRAINT vehicles_vehicle_type_check 
CHECK (vehicle_type IN ('car', 'motorbike', 'atv'));

-- Rename existing 'type' column to 'vehicle_category' for clarity
-- Actually, we'll keep 'type' as vehicle_category since it's already named 'type'
-- The 'type' column will now store the subcategory (sedan, suv, 50cc, etc.) or custom values

-- Update existing vehicles: set vehicle_type based on current type values
-- Assume all existing vehicles are cars since only car categories exist
UPDATE public.vehicles 
SET vehicle_type = 'car' 
WHERE vehicle_type IS NULL OR vehicle_type = '';

-- Add index for vehicle_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type ON public.vehicles(vehicle_type);

-- Add index for type (category) for analytics
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON public.vehicles(type);