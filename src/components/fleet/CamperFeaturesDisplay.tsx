import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  BedDouble, Bed, Users, Flame, Snowflake, Droplets, Bath,
  Thermometer, Wind, Tent, Shield, Moon, Sun, Plug, Zap,
  Droplet, Ruler, ArrowUpFromLine, Bike, Camera, Navigation,
  Tv, Wifi, PawPrint, ChevronDown,
} from "lucide-react";
import { UtensilsCrossed } from "lucide-react";

interface CamperFeaturesDisplayProps {
  vehicleId: string;
  refreshTrigger: number;
}

interface FeatureItem {
  icon: React.ElementType;
  label: string;
  group: string;
}

export function CamperFeaturesDisplay({ vehicleId, refreshTrigger }: CamperFeaturesDisplayProps) {
  const { t } = useTranslation('fleet');
  const [features, setFeatures] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchFeatures = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('camper_features')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .maybeSingle();
      setFeatures(data);
      setLoading(false);
    };
    fetchFeatures();
  }, [vehicleId, refreshTrigger]);

  if (loading) return null;

  if (!features) {
    return (
      <Card className="mt-4 mb-2">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">{t('camperFeatures_noneConfigured')}</p>
        </CardContent>
      </Card>
    );
  }

  const items: FeatureItem[] = [];

  // Sleeping
  if (features.sleeping_capacity > 0)
    items.push({ icon: Users, label: t('camperFeatures_sleepsN', { count: features.sleeping_capacity }), group: t('camperFeatures_sleeping') });
  if (features.num_beds > 0)
    items.push({ icon: BedDouble, label: t('camperFeatures_nBeds', { count: features.num_beds }), group: t('camperFeatures_sleeping') });
  if (features.bed_type) {
    const bedTypeKey = `camperFeatures_bedType_${features.bed_type}`;
    items.push({ icon: Bed, label: String(t(bedTypeKey, features.bed_type)), group: String(t('camperFeatures_sleeping')) });
  }

  // Kitchen
  if (features.has_kitchen)
    items.push({ icon: UtensilsCrossed, label: t('camperFeatures_hasKitchen'), group: t('camperFeatures_kitchen') });
  if (features.num_burners > 0)
    items.push({ icon: Flame, label: t('camperFeatures_nBurnerStove', { count: features.num_burners }), group: t('camperFeatures_kitchen') });
  if (features.has_fridge) {
    const label = features.fridge_size_liters > 0
      ? t('camperFeatures_fridgeWithSize', { size: features.fridge_size_liters })
      : t('camperFeatures_hasFridge');
    items.push({ icon: Snowflake, label, group: t('camperFeatures_kitchen') });
  }
  if (features.has_sink)
    items.push({ icon: Droplets, label: t('camperFeatures_hasSink'), group: t('camperFeatures_kitchen') });
  if (features.has_oven)
    items.push({ icon: Flame, label: t('camperFeatures_hasOven'), group: t('camperFeatures_kitchen') });
  if (features.has_microwave)
    items.push({ icon: Zap, label: t('camperFeatures_hasMicrowave'), group: t('camperFeatures_kitchen') });

  // Bathroom
  if (features.has_toilet) {
    const label = features.toilet_type
      ? t('camperFeatures_toiletWithType', { type: t(`camperFeatures_toiletType_${features.toilet_type}`, features.toilet_type) })
      : t('camperFeatures_hasToilet');
    items.push({ icon: Bath, label, group: t('camperFeatures_bathroom') });
  }
  if (features.has_shower)
    items.push({ icon: Droplets, label: t('camperFeatures_hasShower'), group: t('camperFeatures_bathroom') });
  if (features.has_hot_water)
    items.push({ icon: Droplets, label: t('camperFeatures_hasHotWater'), group: t('camperFeatures_bathroom') });

  // Climate
  if (features.has_heating)
    items.push({ icon: Thermometer, label: t('camperFeatures_hasHeating'), group: t('camperFeatures_climate') });
  if (features.has_air_conditioning)
    items.push({ icon: Wind, label: t('camperFeatures_hasAC'), group: t('camperFeatures_climate') });
  if (features.has_awning)
    items.push({ icon: Tent, label: t('camperFeatures_hasAwning'), group: t('camperFeatures_climate') });
  if (features.has_mosquito_screens)
    items.push({ icon: Shield, label: t('camperFeatures_hasMosquitoScreens'), group: t('camperFeatures_climate') });
  if (features.has_blackout_blinds)
    items.push({ icon: Moon, label: t('camperFeatures_hasBlackoutBlinds'), group: t('camperFeatures_climate') });

  // Utilities
  if (features.has_solar_panels)
    items.push({ icon: Sun, label: t('camperFeatures_hasSolarPanels'), group: t('camperFeatures_utilities') });
  if (features.has_external_power_hookup)
    items.push({ icon: Plug, label: t('camperFeatures_hasExternalPower'), group: t('camperFeatures_utilities') });
  if (features.has_inverter)
    items.push({ icon: Zap, label: t('camperFeatures_hasInverter'), group: t('camperFeatures_utilities') });
  if (features.has_generator)
    items.push({ icon: Zap, label: t('camperFeatures_hasGenerator'), group: t('camperFeatures_utilities') });
  if (features.fresh_water_capacity_liters > 0)
    items.push({ icon: Droplet, label: t('camperFeatures_freshWaterDisplay', { liters: features.fresh_water_capacity_liters }), group: t('camperFeatures_utilities') });
  if (features.gray_water_capacity_liters > 0)
    items.push({ icon: Droplet, label: t('camperFeatures_grayWaterDisplay', { liters: features.gray_water_capacity_liters }), group: t('camperFeatures_utilities') });

  // Dimensions & Extras
  if (parseFloat(features.vehicle_length_meters) > 0)
    items.push({ icon: Ruler, label: t('camperFeatures_lengthDisplay', { meters: features.vehicle_length_meters }), group: t('camperFeatures_dimensions') });
  if (parseFloat(features.vehicle_height_meters) > 0)
    items.push({ icon: ArrowUpFromLine, label: t('camperFeatures_heightDisplay', { meters: features.vehicle_height_meters }), group: t('camperFeatures_dimensions') });
  if (features.has_bike_rack)
    items.push({ icon: Bike, label: t('camperFeatures_hasBikeRack'), group: t('camperFeatures_dimensions') });
  if (features.has_rear_camera)
    items.push({ icon: Camera, label: t('camperFeatures_hasRearCamera'), group: t('camperFeatures_dimensions') });
  if (features.has_gps)
    items.push({ icon: Navigation, label: t('camperFeatures_hasGPS'), group: t('camperFeatures_dimensions') });
  if (features.has_tv)
    items.push({ icon: Tv, label: t('camperFeatures_hasTV'), group: t('camperFeatures_dimensions') });
  if (features.has_wifi)
    items.push({ icon: Wifi, label: t('camperFeatures_hasWifi'), group: t('camperFeatures_dimensions') });
  if (features.has_pet_friendly)
    items.push({ icon: PawPrint, label: t('camperFeatures_hasPetFriendly'), group: t('camperFeatures_dimensions') });

  if (items.length === 0 && !features.additional_notes) {
    return (
      <Card className="mt-4 mb-2">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">{t('camperFeatures_noneConfigured')}</p>
        </CardContent>
      </Card>
    );
  }

  // Group items by group name preserving insertion order
  const grouped: Record<string, FeatureItem[]> = {};
  items.forEach(item => {
    if (!grouped[item.group]) grouped[item.group] = [];
    grouped[item.group].push(item);
  });

  const groupEntries = Object.entries(grouped);
  const sleepingKey = t('camperFeatures_sleeping');
  const kitchenKey = t('camperFeatures_kitchen');
  const initialGroups = groupEntries.filter(([g]) => g === sleepingKey || g === kitchenKey);
  const collapsedGroups = groupEntries.filter(([g]) => g !== sleepingKey && g !== kitchenKey);

  const renderGroup = ([group, groupItems]: [string, FeatureItem[]]) => (
    <div key={group}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{group}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {groupItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/50 text-sm">
              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Card className="mt-4 mb-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('camperFeatures')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {initialGroups.map(renderGroup)}

        {collapsedGroups.length > 0 && (
          <>
            {expanded && collapsedGroups.map(renderGroup)}
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center pt-1"
            >
              <span>{expanded ? t('common:showLess', 'Show less') : t('common:showMore', 'Show more')}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </>
        )}

        {features.additional_notes && (
          <p className="text-sm text-muted-foreground border-t pt-3 mt-2">{features.additional_notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
