-- Add market_value_at_purchase column for depreciation baseline
-- This is separate from purchase_price (actual price paid) for financial accuracy
ALTER TABLE public.vehicles 
ADD COLUMN market_value_at_purchase numeric DEFAULT NULL;