
-- Table 1: additional_info_categories
CREATE TABLE public.additional_info_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint per user
ALTER TABLE public.additional_info_categories ADD CONSTRAINT unique_user_category UNIQUE (user_id, name);

-- Enable RLS
ALTER TABLE public.additional_info_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own categories" ON public.additional_info_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own categories" ON public.additional_info_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON public.additional_info_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON public.additional_info_categories FOR DELETE USING (auth.uid() = user_id);

-- Table 2: booking_additional_info
CREATE TABLE public.booking_additional_info (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.rental_bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.additional_info_categories(id) ON DELETE CASCADE,
  subcategory_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_additional_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own booking info" ON public.booking_additional_info FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own booking info" ON public.booking_additional_info FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own booking info" ON public.booking_additional_info FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own booking info" ON public.booking_additional_info FOR DELETE USING (auth.uid() = user_id);

-- Seed Insurance category for existing users
INSERT INTO public.additional_info_categories (user_id, name, is_default)
SELECT user_id, 'Insurance', true FROM public.profiles
ON CONFLICT (user_id, name) DO NOTHING;

-- Trigger: auto-create Insurance category for new users
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.additional_info_categories (user_id, name, is_default)
  VALUES (NEW.user_id, 'Insurance', true)
  ON CONFLICT (user_id, name) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_default_categories_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_default_categories();
