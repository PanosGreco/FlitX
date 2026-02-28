
-- Table for reusable additional cost categories (per user)
CREATE TABLE public.additional_cost_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint on (user_id, normalized_name) to prevent duplicates
CREATE UNIQUE INDEX idx_additional_cost_categories_unique ON public.additional_cost_categories (user_id, normalized_name);

-- Table linking bookings to their additional costs
CREATE TABLE public.booking_additional_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.rental_bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.additional_cost_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  insurance_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for additional_cost_categories
ALTER TABLE public.additional_cost_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cost categories" ON public.additional_cost_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cost categories" ON public.additional_cost_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cost categories" ON public.additional_cost_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cost categories" ON public.additional_cost_categories FOR DELETE USING (auth.uid() = user_id);

-- RLS for booking_additional_costs
ALTER TABLE public.booking_additional_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own booking costs" ON public.booking_additional_costs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own booking costs" ON public.booking_additional_costs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own booking costs" ON public.booking_additional_costs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own booking costs" ON public.booking_additional_costs FOR DELETE USING (auth.uid() = user_id);
