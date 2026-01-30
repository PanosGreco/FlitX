-- Add columns for usage-based depreciation calculation
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS purchase_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS initial_mileage integer DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.vehicles.purchase_date IS 'Date when the vehicle was purchased by the user';
COMMENT ON COLUMN public.vehicles.initial_mileage IS 'Mileage at the time of purchase';