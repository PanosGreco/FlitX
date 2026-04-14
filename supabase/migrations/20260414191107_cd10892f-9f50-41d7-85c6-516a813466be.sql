
-- ============================================================
-- CRM Phase 1 — Database Foundation
-- ============================================================

-- PART A — customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_number TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  city TEXT,
  country TEXT,
  country_code TEXT,
  first_booking_date DATE,
  last_booking_date DATE,
  total_lifetime_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_bookings_count INTEGER NOT NULL DEFAULT 0,
  total_accidents_count INTEGER NOT NULL DEFAULT 0,
  total_accidents_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_customer_number_per_user UNIQUE (user_id, customer_number)
);

CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_customers_name ON public.customers(user_id, LOWER(name));
CREATE INDEX idx_customers_country ON public.customers(user_id, country_code);
CREATE INDEX idx_customers_last_booking ON public.customers(user_id, last_booking_date DESC);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customers" ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own customers" ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own customers" ON public.customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own customers" ON public.customers FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.customers IS 'Unified customer records. One row per unique customer. Aggregates data from multiple bookings.';
COMMENT ON COLUMN public.customers.customer_number IS 'Human-readable customer identifier, format "C-XXXX", unique per user_id.';
COMMENT ON COLUMN public.customers.total_lifetime_value IS 'Sum of rental_bookings.total_amount for all bookings where customer_id = this row.';
COMMENT ON COLUMN public.customers.total_accidents_amount IS 'Sum of accidents.amount_paid_by_user across all this customer''s bookings.';

-- PART B — Add columns to rental_bookings
ALTER TABLE public.rental_bookings
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_number TEXT,
  ADD COLUMN IF NOT EXISTS customer_type TEXT,
  ADD COLUMN IF NOT EXISTS insurance_type_id UUID REFERENCES public.insurance_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rental_bookings_customer_id ON public.rental_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_booking_number ON public.rental_bookings(user_id, booking_number);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_customer_type ON public.rental_bookings(user_id, customer_type);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_insurance_type_id ON public.rental_bookings(insurance_type_id);

COMMENT ON COLUMN public.rental_bookings.customer_id IS 'Links this booking to a unified customer record. Many bookings → one customer.';
COMMENT ON COLUMN public.rental_bookings.booking_number IS 'Human-readable booking reference, format "#XXXXX". Unique per user_id.';
COMMENT ON COLUMN public.rental_bookings.customer_type IS 'How the customer booked: Family, Couple, Friend Group, Business Trip, Solo Traveler, Tour/Agency, Unknown.';
COMMENT ON COLUMN public.rental_bookings.insurance_type_id IS 'Clean FK link to insurance_types for CRM insurance profitability analysis.';

ALTER TABLE public.rental_bookings
  ADD CONSTRAINT valid_customer_type CHECK (
    customer_type IS NULL OR customer_type IN (
      'Family', 'Couple', 'Friend Group', 'Business Trip',
      'Solo Traveler', 'Tour/Agency', 'Unknown'
    )
  );

-- PART C — accidents table
CREATE TABLE public.accidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.rental_bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  accident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  total_damage_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid_by_insurance NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid_by_user NUMERIC(12,2) NOT NULL DEFAULT 0,
  payer_type TEXT NOT NULL DEFAULT 'split',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_payer_type CHECK (payer_type IN ('insurance', 'user', 'split')),
  CONSTRAINT amounts_sum_check CHECK (
    ABS((amount_paid_by_insurance + amount_paid_by_user) - total_damage_cost) < 0.01
  )
);

CREATE INDEX idx_accidents_user_id ON public.accidents(user_id);
CREATE INDEX idx_accidents_booking_id ON public.accidents(booking_id);
CREATE INDEX idx_accidents_customer_id ON public.accidents(customer_id);
CREATE INDEX idx_accidents_vehicle_id ON public.accidents(vehicle_id);
CREATE INDEX idx_accidents_date ON public.accidents(user_id, accident_date DESC);

ALTER TABLE public.accidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accidents" ON public.accidents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accidents" ON public.accidents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accidents" ON public.accidents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accidents" ON public.accidents FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_accidents_updated_at
  BEFORE UPDATE ON public.accidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.accidents IS 'Accident/damage incidents tied to bookings. Used by CRM for customer risk tracking and insurance profitability.';
COMMENT ON COLUMN public.accidents.customer_id IS 'Denormalized from booking → customer for faster CRM queries. Kept in sync via trigger.';
COMMENT ON COLUMN public.accidents.amount_paid_by_user IS 'The portion the fleet operator absorbed. Increments customer.total_accidents_amount.';

-- PART D — Triggers

CREATE OR REPLACE FUNCTION public.sync_accident_denorm_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT customer_id, vehicle_id INTO NEW.customer_id, NEW.vehicle_id
  FROM public.rental_bookings WHERE id = NEW.booking_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_accident_denorm
  BEFORE INSERT OR UPDATE OF booking_id ON public.accidents
  FOR EACH ROW EXECUTE FUNCTION public.sync_accident_denorm_fields();

CREATE OR REPLACE FUNCTION public.recompute_customer_accident_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_customer_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN target_customer_id := OLD.customer_id;
  ELSE target_customer_id := NEW.customer_id; END IF;
  IF target_customer_id IS NOT NULL THEN
    UPDATE public.customers SET
      total_accidents_count = (SELECT COUNT(*) FROM public.accidents WHERE customer_id = target_customer_id),
      total_accidents_amount = (SELECT COALESCE(SUM(amount_paid_by_user), 0) FROM public.accidents WHERE customer_id = target_customer_id),
      updated_at = now()
    WHERE id = target_customer_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recompute_customer_accidents
  AFTER INSERT OR UPDATE OR DELETE ON public.accidents
  FOR EACH ROW EXECUTE FUNCTION public.recompute_customer_accident_totals();

CREATE OR REPLACE FUNCTION public.recompute_customer_booking_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_customer_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN target_customer_id := OLD.customer_id;
  ELSE target_customer_id := NEW.customer_id; END IF;
  IF target_customer_id IS NOT NULL THEN
    UPDATE public.customers c SET
      total_bookings_count = (SELECT COUNT(*) FROM public.rental_bookings WHERE customer_id = target_customer_id),
      total_lifetime_value = (SELECT COALESCE(SUM(total_amount), 0) FROM public.rental_bookings WHERE customer_id = target_customer_id),
      first_booking_date = (SELECT MIN(start_date) FROM public.rental_bookings WHERE customer_id = target_customer_id),
      last_booking_date = (SELECT MAX(start_date) FROM public.rental_bookings WHERE customer_id = target_customer_id),
      updated_at = now()
    WHERE c.id = target_customer_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recompute_customer_bookings
  AFTER INSERT OR UPDATE OF customer_id, total_amount, start_date
  OR DELETE ON public.rental_bookings
  FOR EACH ROW EXECUTE FUNCTION public.recompute_customer_booking_totals();

-- PART E — Back-fill

-- E1: Assign booking_number to existing bookings
WITH numbered AS (
  SELECT id, '#' || LPAD(ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC)::TEXT, 5, '0') AS new_number
  FROM public.rental_bookings
  WHERE booking_number IS NULL
)
UPDATE public.rental_bookings rb SET booking_number = n.new_number FROM numbered n WHERE rb.id = n.id;

-- E2: Unique constraint
ALTER TABLE public.rental_bookings
  ADD CONSTRAINT unique_booking_number_per_user UNIQUE (user_id, booking_number);

-- E3: NOT NULL
ALTER TABLE public.rental_bookings ALTER COLUMN booking_number SET NOT NULL;

-- E4: Auto-generate on future inserts
CREATE OR REPLACE FUNCTION public.auto_generate_booking_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_num INTEGER;
BEGIN
  IF NEW.booking_number IS NULL OR NEW.booking_number = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(booking_number FROM 2) AS INTEGER)), 0) + 1
    INTO next_num FROM public.rental_bookings
    WHERE user_id = NEW.user_id AND booking_number ~ '^#\d+$';
    NEW.booking_number := '#' || LPAD(next_num::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_booking_number
  BEFORE INSERT ON public.rental_bookings
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_booking_number();

-- E5: Create customers from historical bookings (fixed query)
-- First, build a temp table with the grouped data to avoid correlated subquery issues
CREATE TEMP TABLE _customer_groups AS
SELECT
  rb.user_id,
  LOWER(rb.customer_name) AS name_key,
  LOWER(COALESCE(bc.customer_email, '')) AS email_key,
  MIN(rb.start_date) AS first_start_date,
  MAX(rb.start_date) AS last_start_date,
  COALESCE(SUM(rb.total_amount), 0) AS total_value,
  COUNT(*) AS booking_count
FROM public.rental_bookings rb
LEFT JOIN public.booking_contacts bc ON bc.booking_id = rb.id
GROUP BY rb.user_id, LOWER(rb.customer_name), LOWER(COALESCE(bc.customer_email, ''));

-- Get the most recent name casing per group
CREATE TEMP TABLE _customer_names AS
SELECT DISTINCT ON (rb.user_id, LOWER(rb.customer_name), LOWER(COALESCE(bc.customer_email, '')))
  rb.user_id,
  LOWER(rb.customer_name) AS name_key,
  LOWER(COALESCE(bc.customer_email, '')) AS email_key,
  rb.customer_name AS latest_name
FROM public.rental_bookings rb
LEFT JOIN public.booking_contacts bc ON bc.booking_id = rb.id
ORDER BY rb.user_id, LOWER(rb.customer_name), LOWER(COALESCE(bc.customer_email, '')), rb.created_at DESC;

-- Get the most recent PII per group
CREATE TEMP TABLE _customer_pii AS
SELECT DISTINCT ON (rb.user_id, LOWER(rb.customer_name), LOWER(COALESCE(bc.customer_email, '')))
  rb.user_id,
  LOWER(rb.customer_name) AS name_key,
  LOWER(COALESCE(bc.customer_email, '')) AS email_key,
  bc.customer_phone,
  bc.customer_birth_date,
  bc.customer_city,
  bc.customer_country,
  bc.customer_country_code
FROM public.rental_bookings rb
LEFT JOIN public.booking_contacts bc ON bc.booking_id = rb.id
WHERE bc.id IS NOT NULL
ORDER BY rb.user_id, LOWER(rb.customer_name), LOWER(COALESCE(bc.customer_email, '')), rb.created_at DESC;

-- Now insert into customers
INSERT INTO public.customers (
  user_id, customer_number, name, email, phone, birth_date,
  city, country, country_code,
  first_booking_date, last_booking_date,
  total_lifetime_value, total_bookings_count,
  total_accidents_count, total_accidents_amount
)
SELECT
  g.user_id,
  'C-' || LPAD(ROW_NUMBER() OVER (PARTITION BY g.user_id ORDER BY g.first_start_date ASC)::TEXT, 4, '0'),
  n.latest_name,
  NULLIF(g.email_key, ''),
  p.customer_phone,
  p.customer_birth_date,
  p.customer_city,
  p.customer_country,
  p.customer_country_code,
  g.first_start_date,
  g.last_start_date,
  g.total_value,
  g.booking_count,
  0, 0
FROM _customer_groups g
JOIN _customer_names n ON n.user_id = g.user_id AND n.name_key = g.name_key AND n.email_key = g.email_key
LEFT JOIN _customer_pii p ON p.user_id = g.user_id AND p.name_key = g.name_key AND p.email_key = g.email_key;

DROP TABLE _customer_groups;
DROP TABLE _customer_names;
DROP TABLE _customer_pii;

-- E6: Back-fill customer_id on bookings
UPDATE public.rental_bookings rb
SET customer_id = c.id
FROM public.customers c
WHERE rb.user_id = c.user_id
  AND LOWER(rb.customer_name) = LOWER(c.name)
  AND LOWER(COALESCE((SELECT customer_email FROM public.booking_contacts WHERE booking_id = rb.id LIMIT 1), '')) = LOWER(COALESCE(c.email, ''))
  AND rb.customer_id IS NULL;

-- E7: Back-fill insurance_type_id
UPDATE public.rental_bookings rb
SET insurance_type_id = it.id
FROM public.insurance_types it
JOIN public.booking_additional_info bai ON LOWER(TRIM(bai.subcategory_value)) = LOWER(TRIM(it.name_original))
JOIN public.additional_info_categories aic ON aic.id = bai.category_id AND aic.name = 'Insurance'
WHERE bai.booking_id = rb.id
  AND it.user_id = rb.user_id
  AND rb.insurance_type_id IS NULL;
