
-- Add sale-related columns to vehicles table
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS is_sold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_price numeric NULL,
  ADD COLUMN IF NOT EXISTS sale_date date NULL;
