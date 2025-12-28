-- Add purchase_price column to vehicles table
ALTER TABLE public.vehicles ADD COLUMN purchase_price numeric NULL DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.vehicles.purchase_price IS 'Optional purchase/acquisition price of the vehicle';