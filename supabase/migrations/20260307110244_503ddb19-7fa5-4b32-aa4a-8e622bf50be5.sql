
-- Table 1: user_asset_categories
CREATE TABLE public.user_asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_vehicle_category boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_asset_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own asset categories" ON public.user_asset_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own asset categories" ON public.user_asset_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own asset categories" ON public.user_asset_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own asset categories" ON public.user_asset_categories FOR DELETE USING (auth.uid() = user_id);

-- Table 2: user_assets
CREATE TABLE public.user_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.user_asset_categories(id) ON DELETE CASCADE,
  asset_name text NOT NULL,
  asset_value numeric NOT NULL DEFAULT 0,
  vehicle_id uuid DEFAULT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets" ON public.user_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assets" ON public.user_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assets" ON public.user_assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own assets" ON public.user_assets FOR DELETE USING (auth.uid() = user_id);
