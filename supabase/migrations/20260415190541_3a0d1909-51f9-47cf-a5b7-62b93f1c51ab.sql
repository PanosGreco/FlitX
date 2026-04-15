-- ============================================================
-- CRM Phase 2 Hotfix — Merge duplicate customers
-- ============================================================

-- Step 1: Reassign bookings from duplicates to keepers
WITH grouped AS (
  SELECT
    id,
    user_id,
    LOWER(TRIM(name)) AS name_key,
    LOWER(TRIM(COALESCE(email, ''))) AS email_key,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, LOWER(TRIM(name)), LOWER(TRIM(COALESCE(email, '')))
      ORDER BY created_at ASC
    ) AS rn
  FROM public.customers
),
keepers AS (
  SELECT id AS keeper_id, user_id, name_key, email_key
  FROM grouped WHERE rn = 1
),
duplicates AS (
  SELECT g.id AS duplicate_id, k.keeper_id
  FROM grouped g
  JOIN keepers k
    ON k.user_id = g.user_id
   AND k.name_key = g.name_key
   AND k.email_key = g.email_key
  WHERE g.rn > 1
)
UPDATE public.rental_bookings rb
SET customer_id = d.keeper_id
FROM duplicates d
WHERE rb.customer_id = d.duplicate_id;

-- Step 2: Reassign accidents from duplicates to keepers
WITH grouped AS (
  SELECT
    id,
    user_id,
    LOWER(TRIM(name)) AS name_key,
    LOWER(TRIM(COALESCE(email, ''))) AS email_key,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, LOWER(TRIM(name)), LOWER(TRIM(COALESCE(email, '')))
      ORDER BY created_at ASC
    ) AS rn
  FROM public.customers
),
keepers AS (
  SELECT id AS keeper_id, user_id, name_key, email_key
  FROM grouped WHERE rn = 1
),
duplicates AS (
  SELECT g.id AS duplicate_id, k.keeper_id
  FROM grouped g
  JOIN keepers k
    ON k.user_id = g.user_id
   AND k.name_key = g.name_key
   AND k.email_key = g.email_key
  WHERE g.rn > 1
)
UPDATE public.accidents a
SET customer_id = d.keeper_id
FROM duplicates d
WHERE a.customer_id = d.duplicate_id;

-- Step 3: Delete the duplicate customer rows
WITH grouped AS (
  SELECT
    id,
    user_id,
    LOWER(TRIM(name)) AS name_key,
    LOWER(TRIM(COALESCE(email, ''))) AS email_key,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, LOWER(TRIM(name)), LOWER(TRIM(COALESCE(email, '')))
      ORDER BY created_at ASC
    ) AS rn
  FROM public.customers
)
DELETE FROM public.customers
WHERE id IN (SELECT id FROM grouped WHERE rn > 1);

-- Step 4: Force aggregate recompute for all customers
UPDATE public.customers c
SET
  total_bookings_count = COALESCE((
    SELECT COUNT(*) FROM public.rental_bookings WHERE customer_id = c.id
  ), 0),
  total_lifetime_value = COALESCE((
    SELECT SUM(total_amount) FROM public.rental_bookings WHERE customer_id = c.id
  ), 0),
  first_booking_date = (
    SELECT MIN(start_date) FROM public.rental_bookings WHERE customer_id = c.id
  ),
  last_booking_date = (
    SELECT MAX(start_date) FROM public.rental_bookings WHERE customer_id = c.id
  ),
  total_accidents_count = COALESCE((
    SELECT COUNT(*) FROM public.accidents WHERE customer_id = c.id
  ), 0),
  total_accidents_amount = COALESCE((
    SELECT SUM(amount_paid_by_user) FROM public.accidents WHERE customer_id = c.id
  ), 0),
  updated_at = now();