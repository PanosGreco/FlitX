ALTER TABLE public.rental_bookings 
ADD COLUMN fuel_level text,
ADD COLUMN payment_status text DEFAULT 'paid_in_full',
ADD COLUMN balance_due_amount numeric;