-- Step 1: Rename amount_paid_by_user to amount_paid_by_business
ALTER TABLE public.accidents RENAME COLUMN amount_paid_by_user TO amount_paid_by_business;

-- Step 2: Add amount_paid_by_customer column
ALTER TABLE public.accidents
  ADD COLUMN amount_paid_by_customer NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Step 3: Update the payer_type CHECK constraint (drop if exists, recreate)
ALTER TABLE public.accidents DROP CONSTRAINT IF EXISTS valid_payer_type;
ALTER TABLE public.accidents ADD CONSTRAINT valid_payer_type CHECK (
  payer_type IN ('insurance', 'customer', 'business', 'split')
);

-- Step 4: Update the amounts_sum_check constraint
ALTER TABLE public.accidents DROP CONSTRAINT IF EXISTS amounts_sum_check;
ALTER TABLE public.accidents ADD CONSTRAINT amounts_sum_check CHECK (
  ABS((amount_paid_by_insurance + amount_paid_by_customer + amount_paid_by_business) - total_damage_cost) < 0.01
);

-- Step 5: Migrate old 'user' payer_type values to 'business'
UPDATE public.accidents SET payer_type = 'business' WHERE payer_type = 'user';

-- Step 6: Update the recompute trigger to use the new column name
CREATE OR REPLACE FUNCTION public.recompute_customer_accident_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE target_customer_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN target_customer_id := OLD.customer_id;
  ELSE target_customer_id := NEW.customer_id; END IF;
  IF target_customer_id IS NOT NULL THEN
    UPDATE public.customers SET
      total_accidents_count = (SELECT COUNT(*) FROM public.accidents WHERE customer_id = target_customer_id),
      total_accidents_amount = (SELECT COALESCE(SUM(amount_paid_by_business), 0) FROM public.accidents WHERE customer_id = target_customer_id),
      updated_at = now()
    WHERE id = target_customer_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 7: Add column comments
COMMENT ON COLUMN public.accidents.amount_paid_by_customer IS 'Amount the rental customer paid to compensate for the damage. Does NOT count as a business loss.';
COMMENT ON COLUMN public.accidents.amount_paid_by_business IS 'Amount the fleet operator (business) absorbed. THIS is what counts as a financial loss and feeds into customers.total_accidents_amount.';
COMMENT ON COLUMN public.accidents.amount_paid_by_insurance IS 'Amount covered by the insurance policy.';