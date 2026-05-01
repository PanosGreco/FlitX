import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Gauge, Zap, Wind, Snowflake, Flame, BadgeCheck, User as UserIcon,
  Ruler, Weight, Fuel, ShieldCheck, Activity, Umbrella, Thermometer,
  Package, Briefcase, Plug, Cog, KeyRound, HardHat, Lock, Smartphone, ChevronDown,
} from "lucide-react";

interface MotorbikeFeaturesDisplayProps {
  vehicleId: string;
  refreshTrigger: number;
}

interface FeatureItem {
  icon: React.ElementType;
  label: string;
  group: string;
}

export function MotorbikeFeaturesDisplay({ vehicleId, refreshTrigger }: MotorbikeFeaturesDisplayProps) {
  const { t } = useTranslation('fleet');
  const [features, setFeatures] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchFeatures = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('motorbike_features')
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
          <p className="text-sm text-muted-foreground text-center">{t('motorbikeFeatures_noneConfigured')}</p>
        </CardContent>
      </Card>
    );
  }

  const items: FeatureItem[] = [];
  const engineGroup = t('motorbikeFeatures_engine');
  const licenseGroup = t('motorbikeFeatures_license');
  const dimensionsGroup = t('motorbikeFeatures_dimensions');
  const equipmentGroup = t('motorbikeFeatures_equipment');
  const rentalGroup = t('motorbikeFeatures_rental');

  // Engine
  if (features.engine_cc > 0)
    items.push({ icon: Gauge, label: t('motorbikeFeatures_ccDisplay', { cc: features.engine_cc }), group: engineGroup });
  if (features.horsepower > 0)
    items.push({ icon: Zap, label: t('motorbikeFeatures_hpDisplay', { hp: features.horsepower }), group: engineGroup });
  if (features.top_speed_kmh > 0)
    items.push({ icon: Activity, label: t('motorbikeFeatures_speedDisplay', { speed: features.top_speed_kmh }), group: engineGroup });
  if (features.cooling_system)
    items.push({ icon: features.cooling_system === 'liquid' ? Snowflake : Wind, label: String(t(`motorbikeFeatures_cooling_${features.cooling_system}`, features.cooling_system)), group: engineGroup });
  if (features.engine_type)
    items.push({ icon: Flame, label: String(t(`motorbikeFeatures_engine_${features.engine_type}`, features.engine_type)), group: engineGroup });

  // License
  if (features.license_category)
    items.push({ icon: BadgeCheck, label: String(t(`motorbikeFeatures_license_${features.license_category}`, features.license_category)), group: licenseGroup });
  if (features.minimum_rider_age > 0)
    items.push({ icon: UserIcon, label: `${t('motorbikeFeatures_minimumAge')}: ${features.minimum_rider_age}`, group: licenseGroup });

  // Dimensions
  if (features.seat_height_cm > 0)
    items.push({ icon: Ruler, label: t('motorbikeFeatures_seatDisplay', { cm: features.seat_height_cm }), group: dimensionsGroup });
  if (features.dry_weight_kg > 0)
    items.push({ icon: Weight, label: t('motorbikeFeatures_weightDisplay', { kg: features.dry_weight_kg }), group: dimensionsGroup });
  if (parseFloat(features.fuel_tank_liters) > 0)
    items.push({ icon: Fuel, label: t('motorbikeFeatures_tankDisplay', { liters: features.fuel_tank_liters }), group: dimensionsGroup });

  // Equipment
  if (features.has_abs) items.push({ icon: ShieldCheck, label: t('motorbikeFeatures_hasAbs'), group: equipmentGroup });
  if (features.has_traction_control) items.push({ icon: Activity, label: t('motorbikeFeatures_hasTractionControl'), group: equipmentGroup });
  if (features.has_windscreen) items.push({ icon: Umbrella, label: t('motorbikeFeatures_hasWindscreen'), group: equipmentGroup });
  if (features.has_heated_grips) items.push({ icon: Thermometer, label: t('motorbikeFeatures_hasHeatedGrips'), group: equipmentGroup });
  if (features.has_top_case) items.push({ icon: Package, label: t('motorbikeFeatures_hasTopCase'), group: equipmentGroup });
  if (features.has_side_cases) items.push({ icon: Briefcase, label: t('motorbikeFeatures_hasSideCases'), group: equipmentGroup });
  if (features.has_usb_charger) items.push({ icon: Plug, label: t('motorbikeFeatures_hasUsbCharger'), group: equipmentGroup });
  if (features.has_cruise_control) items.push({ icon: Cog, label: t('motorbikeFeatures_hasCruiseControl'), group: equipmentGroup });
  if (features.has_keyless_start) items.push({ icon: KeyRound, label: t('motorbikeFeatures_hasKeylessStart'), group: equipmentGroup });

  // Rental Extras
  if (features.helmet_included)
    items.push({ icon: HardHat, label: t('motorbikeFeatures_helmetsDisplay', { count: features.num_helmets || 1 }), group: rentalGroup });
  if (features.lock_included)
    items.push({ icon: Lock, label: t('motorbikeFeatures_lockIncluded'), group: rentalGroup });
  if (features.phone_mount_included)
    items.push({ icon: Smartphone, label: t('motorbikeFeatures_phoneMountIncluded'), group: rentalGroup });

  if (items.length === 0 && !features.additional_notes) {
    return (
      <Card className="mt-4 mb-2">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">{t('motorbikeFeatures_noneConfigured')}</p>
        </CardContent>
      </Card>
    );
  }

  const grouped: Record<string, FeatureItem[]> = {};
  items.forEach(item => {
    if (!grouped[item.group]) grouped[item.group] = [];
    grouped[item.group].push(item);
  });

  const groupEntries = Object.entries(grouped);
  const initialGroups = groupEntries.filter(([g]) => g === engineGroup || g === licenseGroup);
  const collapsedGroups = groupEntries.filter(([g]) => g !== engineGroup && g !== licenseGroup);

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
        <CardTitle className="text-base">{t('motorbikeFeatures')}</CardTitle>
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
