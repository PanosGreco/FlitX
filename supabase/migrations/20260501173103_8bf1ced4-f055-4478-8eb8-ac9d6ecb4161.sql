CREATE TABLE IF NOT EXISTS public.motorbike_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID NOT NULL,

  engine_cc INTEGER DEFAULT 0,
  horsepower INTEGER DEFAULT 0,
  top_speed_kmh INTEGER DEFAULT 0,
  cooling_system TEXT DEFAULT '',
  engine_type TEXT DEFAULT '',

  license_category TEXT DEFAULT '',
  minimum_rider_age INTEGER DEFAULT 18,

  seat_height_cm INTEGER DEFAULT 0,
  dry_weight_kg INTEGER DEFAULT 0,
  fuel_tank_liters NUMERIC(5,1) DEFAULT 0,

  has_abs BOOLEAN DEFAULT false,
  has_traction_control BOOLEAN DEFAULT false,
  has_windscreen BOOLEAN DEFAULT false,
  has_heated_grips BOOLEAN DEFAULT false,
  has_top_case BOOLEAN DEFAULT false,
  has_side_cases BOOLEAN DEFAULT false,
  has_usb_charger BOOLEAN DEFAULT false,
  has_cruise_control BOOLEAN DEFAULT false,
  has_keyless_start BOOLEAN DEFAULT false,

  helmet_included BOOLEAN DEFAULT true,
  num_helmets INTEGER DEFAULT 1,
  lock_included BOOLEAN DEFAULT false,
  phone_mount_included BOOLEAN DEFAULT false,

  additional_notes TEXT DEFAULT '',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.motorbike_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own motorbike features"
  ON public.motorbike_features FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own motorbike features"
  ON public.motorbike_features FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own motorbike features"
  ON public.motorbike_features FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own motorbike features"
  ON public.motorbike_features FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_motorbike_features_vehicle_id ON public.motorbike_features(vehicle_id);
CREATE INDEX idx_motorbike_features_user_id ON public.motorbike_features(user_id);

CREATE TRIGGER update_motorbike_features_updated_at
  BEFORE UPDATE ON public.motorbike_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.motorbike_features IS 'Per-vehicle motorbike specifications. Linked 1:1 to vehicles where vehicle_type = motorbike.';