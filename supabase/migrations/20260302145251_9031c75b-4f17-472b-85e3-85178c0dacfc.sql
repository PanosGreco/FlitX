
CREATE TABLE public.insurance_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name_original TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_insurance_types_unique ON public.insurance_types (user_id, name_normalized);

ALTER TABLE public.insurance_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insurance types" ON public.insurance_types FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own insurance types" ON public.insurance_types FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own insurance types" ON public.insurance_types FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own insurance types" ON public.insurance_types FOR DELETE TO authenticated USING (auth.uid() = user_id);
