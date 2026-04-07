
-- Create price_seasons table
CREATE TABLE public.price_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_month INTEGER NOT NULL,
  start_day INTEGER NOT NULL,
  end_month INTEGER NOT NULL,
  end_day INTEGER NOT NULL,
  mode TEXT NOT NULL DEFAULT 'automatic',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.price_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own price seasons"
  ON public.price_seasons FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create price_season_rules table
CREATE TABLE public.price_season_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES public.price_seasons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scope TEXT NOT NULL DEFAULT 'category',
  vehicle_category TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL,
  adjustment_value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.price_season_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own season rules"
  ON public.price_season_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
