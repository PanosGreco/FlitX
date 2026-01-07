-- Add fuel_type to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN fuel_type text DEFAULT 'petrol';

-- Add comment for documentation
COMMENT ON COLUMN public.vehicles.fuel_type IS 'Vehicle fuel type: petrol, diesel, electric, hybrid';

-- Add vehicle_fuel_type and vehicle_year to financial_records for expense analytics
ALTER TABLE public.financial_records 
ADD COLUMN vehicle_fuel_type text,
ADD COLUMN vehicle_year integer;

-- Add comments for documentation
COMMENT ON COLUMN public.financial_records.vehicle_fuel_type IS 'Inherited from linked vehicle at expense creation time';
COMMENT ON COLUMN public.financial_records.vehicle_year IS 'Inherited from linked vehicle at expense creation time';