-- Create a new table for sensitive customer contact information
CREATE TABLE public.booking_contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL UNIQUE REFERENCES public.rental_bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.booking_contacts ENABLE ROW LEVEL SECURITY;

-- Create strict RLS policies - only the booking owner can access their customer contacts
CREATE POLICY "Users can view their own booking contacts"
ON public.booking_contacts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own booking contacts"
ON public.booking_contacts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking contacts"
ON public.booking_contacts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking contacts"
ON public.booking_contacts
FOR DELETE
USING (auth.uid() = user_id);

-- Migrate existing data from rental_bookings to booking_contacts
INSERT INTO public.booking_contacts (booking_id, user_id, customer_email, customer_phone)
SELECT id, user_id, customer_email, customer_phone
FROM public.rental_bookings
WHERE customer_email IS NOT NULL OR customer_phone IS NOT NULL;

-- Remove the sensitive columns from rental_bookings
ALTER TABLE public.rental_bookings DROP COLUMN customer_email;
ALTER TABLE public.rental_bookings DROP COLUMN customer_phone;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_booking_contacts_updated_at
BEFORE UPDATE ON public.booking_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();