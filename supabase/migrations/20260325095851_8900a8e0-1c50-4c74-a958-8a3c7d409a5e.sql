CREATE TABLE public.camper_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  num_beds INTEGER DEFAULT 0,
  bed_type TEXT DEFAULT '',
  sleeping_capacity INTEGER DEFAULT 0,
  has_kitchen BOOLEAN DEFAULT false,
  num_burners INTEGER DEFAULT 0,
  has_fridge BOOLEAN DEFAULT false,
  fridge_size_liters INTEGER DEFAULT 0,
  has_sink BOOLEAN DEFAULT false,
  has_oven BOOLEAN DEFAULT false,
  has_microwave BOOLEAN DEFAULT false,
  has_toilet BOOLEAN DEFAULT false,
  has_shower BOOLEAN DEFAULT false,
  has_hot_water BOOLEAN DEFAULT false,
  toilet_type TEXT DEFAULT '',
  has_heating BOOLEAN DEFAULT false,
  has_air_conditioning BOOLEAN DEFAULT false,
  has_awning BOOLEAN DEFAULT false,
  has_mosquito_screens BOOLEAN DEFAULT false,
  has_blackout_blinds BOOLEAN DEFAULT false,
  has_solar_panels BOOLEAN DEFAULT false,
  fresh_water_capacity_liters INTEGER DEFAULT 0,
  gray_water_capacity_liters INTEGER DEFAULT 0,
  has_external_power_hookup BOOLEAN DEFAULT false,
  has_inverter BOOLEAN DEFAULT false,
  has_generator BOOLEAN DEFAULT false,
  vehicle_length_meters NUMERIC(5,2) DEFAULT 0,
  vehicle_height_meters NUMERIC(5,2) DEFAULT 0,
  has_bike_rack BOOLEAN DEFAULT false,
  has_rear_camera BOOLEAN DEFAULT false,
  has_gps BOOLEAN DEFAULT false,
  has_tv BOOLEAN DEFAULT false,
  has_wifi BOOLEAN DEFAULT false,
  has_pet_friendly BOOLEAN DEFAULT false,
  additional_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.camper_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own camper features"
  ON public.camper_features FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own camper features"
  ON public.camper_features FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own camper features"
  ON public.camper_features FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own camper features"
  ON public.camper_features FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_camper_features_vehicle_id ON public.camper_features(vehicle_id);
CREATE INDEX idx_camper_features_user_id ON public.camper_features(user_id);