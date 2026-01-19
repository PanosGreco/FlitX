-- Add company_name, country, and city columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN company_name text,
ADD COLUMN country text,
ADD COLUMN city text;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.company_name IS 'Company or business name of the user';
COMMENT ON COLUMN public.profiles.country IS 'Country where the user operates (for AI-based location features)';
COMMENT ON COLUMN public.profiles.city IS 'City where the user operates (for AI-based location features)';