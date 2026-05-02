CREATE TABLE IF NOT EXISTS public.jet_ski_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  engine_cc INTEGER DEFAULT 0,
  horsepower INTEGER DEFAULT 0,
  top_speed_kmh INTEGER DEFAULT 0,
  is_supercharged BOOLEAN DEFAULT false,
  engine_type TEXT DEFAULT '',
  hull_material TEXT DEFAULT '',
  hull_type TEXT DEFAULT '',
  length_meters NUMERIC(4,2) DEFAULT 0,
  width_meters NUMERIC(4,2) DEFAULT 0,
  dry_weight_kg INTEGER DEFAULT 0,
  fuel_tank_liters NUMERIC(5,1) DEFAULT 0,
  rider_capacity INTEGER DEFAULT 1,
  weight_limit_kg INTEGER DEFAULT 0,
  storage_capacity_liters INTEGER DEFAULT 0,
  has_boarding_ladder BOOLEAN DEFAULT false,
  has_rearview_mirrors BOOLEAN DEFAULT false,
  has_reverse BOOLEAN DEFAULT false,
  has_brake_system BOOLEAN DEFAULT false,
  has_traction_control BOOLEAN DEFAULT false,
  has_no_wake_mode BOOLEAN DEFAULT false,
  has_gps BOOLEAN DEFAULT false,
  has_depth_finder BOOLEAN DEFAULT false,
  has_cruise_control BOOLEAN DEFAULT false,
  has_bluetooth_speakers BOOLEAN DEFAULT false,
  has_watertight_storage BOOLEAN DEFAULT false,
  has_swim_platform BOOLEAN DEFAULT false,
  has_tow_hook BOOLEAN DEFAULT false,
  life_jackets_included BOOLEAN DEFAULT true,
  num_life_jackets INTEGER DEFAULT 1,
  safety_lanyard_included BOOLEAN DEFAULT true,
  fire_extinguisher_included BOOLEAN DEFAULT false,
  whistle_included BOOLEAN DEFAULT false,
  minimum_operator_age INTEGER DEFAULT 16,
  license_required BOOLEAN DEFAULT false,
  additional_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jet_ski_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jet ski features"
  ON public.jet_ski_features FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jet ski features"
  ON public.jet_ski_features FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jet ski features"
  ON public.jet_ski_features FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own jet ski features"
  ON public.jet_ski_features FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_jet_ski_features_vehicle_id ON public.jet_ski_features(vehicle_id);
CREATE INDEX idx_jet_ski_features_user_id ON public.jet_ski_features(user_id);

COMMENT ON TABLE public.jet_ski_features IS 'Per-vehicle jet ski / PWC specifications. Linked 1:1 to vehicles where vehicle_type = jet_ski.';