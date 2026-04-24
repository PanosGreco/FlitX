CREATE TABLE IF NOT EXISTS public.seasonal_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_seasonal BOOLEAN NOT NULL DEFAULT false,
  season_months INTEGER[] NOT NULL DEFAULT '{}',
  is_paused BOOLEAN NOT NULL DEFAULT false,
  paused_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_seasonal UNIQUE (user_id)
);

ALTER TABLE public.seasonal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own seasonal settings"
  ON public.seasonal_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own seasonal settings"
  ON public.seasonal_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own seasonal settings"
  ON public.seasonal_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_seasonal_settings_updated_at
BEFORE UPDATE ON public.seasonal_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.seasonal_settings IS 'Per-user seasonal mode configuration. Controls which months are considered active business months for analytics filtering.';
COMMENT ON COLUMN public.seasonal_settings.season_months IS 'Array of month numbers (1-12) that are active. Example: {5,6,7,8,9} for May-September.';