
CREATE TABLE public.vehicle_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vehicle images"
  ON public.vehicle_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vehicle images"
  ON public.vehicle_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vehicle images"
  ON public.vehicle_images FOR DELETE
  USING (auth.uid() = user_id);
