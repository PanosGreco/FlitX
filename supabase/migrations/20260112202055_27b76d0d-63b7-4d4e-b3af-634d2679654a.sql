-- Fix the SELECT policy on profiles table to restrict access to own data only
-- First, drop the existing SELECT policy if it exists
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a strict SELECT policy that only allows users to read their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Verify RLS is enabled (it already is, but just to be safe)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;