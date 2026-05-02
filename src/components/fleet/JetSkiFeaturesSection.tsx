import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Gauge, Zap, Activity, Flame, Ship, Ruler, Weight, Fuel, Users,
  ShieldCheck, Eye, RotateCcw, CircleSlash, Compass, Waves,
  Cog, Bluetooth, Package, Anchor, Link2,
  LifeBuoy, KeyRound, Flame as FireIcon, Megaphone, BadgeCheck, ChevronDown, Sparkles,
} from "lucide-react";

interface Props {
  vehicleId: string;
  refreshTrigger?: number;
}

interface Item { icon: React.ElementType; label: string; group: string; }

export function JetSkiFeaturesSection({ vehicleId, refreshTrigger }: Props) {
  const { t } = useTranslation('fleet');
  const [features, setFeatures] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('jet_ski_features' as any)
        .select('*')
        .eq('vehicle_id', vehicleId)
        .maybeSingle();
      setFeatures(data);
      setLoading(false);
    })();
  }, [vehicleId, refreshTrigger]);

  if (loading) return null;

  if (!features) {
    return (
      <Card className="mt-4 mb-2">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">{t('jetSkiFeatures_noneConfigured')}</p>
        </CardContent>
      </Card>
    );
  }

  const items: Item[] = [];
  const g = {
    engine: t('jetSkiFeatures_engine'),
    hull: t('jetSkiFeatures_hull'),
    capacity: t('jetSkiFeatures_capacity'),
    safety: t('jetSkiFeatures_safety'),
    comfort: t('jetSkiFeatures_comfort'),
    rental: t('jetSkiFeatures_rental'),
  };

  if (features.engine_cc > 0) items.push({ icon: Gauge, label: t('jetSkiFeatures_ccDisplay', { cc: features.engine_cc }), group: g.engine });
  if (features.horsepower > 0) items.push({ icon: Zap, label: t('jetSkiFeatures_hpDisplay', { hp: features.horsepower }), group: g.engine });
  if (features.top_speed_kmh > 0) items.push({ icon: Activity, label: t('jetSkiFeatures_speedDisplay', { speed: features.top_speed_kmh }), group: g.engine });
  if (features.is_supercharged) items.push({ icon: Sparkles, label: t('jetSkiFeatures_supercharged'), group: g.engine });
  if (features.engine_type) items.push({ icon: Flame, label: String(t(`jetSkiFeatures_engine_${features.engine_type}`, features.engine_type)), group: g.engine });

  if (features.hull_material) items.push({ icon: Ship, label: String(t(`jetSkiFeatures_hull_${features.hull_material}`, features.hull_material)), group: g.hull });
  if (features.hull_type) {
    const map: Record<string, string> = { flat_bottom: 'flat', v_shape: 'vshape', progressive_stepped_v: 'stepped' };
    const k = map[features.hull_type] || features.hull_type;
    items.push({ icon: Waves, label: String(t(`jetSkiFeatures_hull_${k}`, features.hull_type)), group: g.hull });
  }
  const len = parseFloat(features.length_meters);
  const wid = parseFloat(features.width_meters);
  if (len > 0 || wid > 0) items.push({ icon: Ruler, label: t('jetSkiFeatures_dimensionsDisplay', { length: len || 0, width: wid || 0 }), group: g.hull });
  if (features.dry_weight_kg > 0) items.push({ icon: Weight, label: t('jetSkiFeatures_weightDisplay', { kg: features.dry_weight_kg }), group: g.hull });
  if (parseFloat(features.fuel_tank_liters) > 0) items.push({ icon: Fuel, label: t('jetSkiFeatures_tankDisplay', { liters: features.fuel_tank_liters }), group: g.hull });

  if (features.rider_capacity > 0) items.push({ icon: Users, label: t('jetSkiFeatures_ridersDisplay', { count: features.rider_capacity }), group: g.capacity });
  if (features.weight_limit_kg > 0) items.push({ icon: Weight, label: t('jetSkiFeatures_weightLimitDisplay', { kg: features.weight_limit_kg }), group: g.capacity });
  if (features.storage_capacity_liters > 0) items.push({ icon: Package, label: t('jetSkiFeatures_storageDisplay', { liters: features.storage_capacity_liters }), group: g.capacity });

  if (features.has_boarding_ladder) items.push({ icon: Anchor, label: t('jetSkiFeatures_boardingLadder'), group: g.safety });
  if (features.has_rearview_mirrors) items.push({ icon: Eye, label: t('jetSkiFeatures_rearviewMirrors'), group: g.safety });
  if (features.has_reverse) items.push({ icon: RotateCcw, label: t('jetSkiFeatures_reverse'), group: g.safety });
  if (features.has_brake_system) items.push({ icon: ShieldCheck, label: t('jetSkiFeatures_brakeSystem'), group: g.safety });
  if (features.has_traction_control) items.push({ icon: Activity, label: t('jetSkiFeatures_tractionControl'), group: g.safety });
  if (features.has_no_wake_mode) items.push({ icon: CircleSlash, label: t('jetSkiFeatures_noWakeMode'), group: g.safety });
  if (features.has_gps) items.push({ icon: Compass, label: t('jetSkiFeatures_gps'), group: g.safety });
  if (features.has_depth_finder) items.push({ icon: Waves, label: t('jetSkiFeatures_depthFinder'), group: g.safety });

  if (features.has_cruise_control) items.push({ icon: Cog, label: t('jetSkiFeatures_cruiseControl'), group: g.comfort });
  if (features.has_bluetooth_speakers) items.push({ icon: Bluetooth, label: t('jetSkiFeatures_bluetoothSpeakers'), group: g.comfort });
  if (features.has_watertight_storage) items.push({ icon: Package, label: t('jetSkiFeatures_watertightStorage'), group: g.comfort });
  if (features.has_swim_platform) items.push({ icon: Anchor, label: t('jetSkiFeatures_swimPlatform'), group: g.comfort });
  if (features.has_tow_hook) items.push({ icon: Link2, label: t('jetSkiFeatures_towHook'), group: g.comfort });

  if (features.life_jackets_included) items.push({ icon: LifeBuoy, label: t('jetSkiFeatures_lifeJacketsDisplay', { count: features.num_life_jackets || 1 }), group: g.rental });
  if (features.safety_lanyard_included) items.push({ icon: KeyRound, label: t('jetSkiFeatures_safetyLanyard'), group: g.rental });
  if (features.fire_extinguisher_included) items.push({ icon: FireIcon, label: t('jetSkiFeatures_fireExtinguisher'), group: g.rental });
  if (features.whistle_included) items.push({ icon: Megaphone, label: t('jetSkiFeatures_whistle'), group: g.rental });
  if (features.minimum_operator_age > 0) items.push({ icon: Users, label: t('jetSkiFeatures_minAgeDisplay', { age: features.minimum_operator_age }), group: g.rental });
  if (features.license_required) items.push({ icon: BadgeCheck, label: t('jetSkiFeatures_licenseRequired'), group: g.rental });

  if (items.length === 0 && !features.additional_notes) {
    return (
      <Card className="mt-4 mb-2">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">{t('jetSkiFeatures_noneConfigured')}</p>
        </CardContent>
      </Card>
    );
  }

  const grouped: Record<string, Item[]> = {};
  items.forEach(i => { (grouped[i.group] ||= []).push(i); });
  const entries = Object.entries(grouped);
  const initial = entries.filter(([gr]) => gr === g.engine || gr === g.hull);
  const collapsed = entries.filter(([gr]) => gr !== g.engine && gr !== g.hull);

  const renderGroup = ([group, list]: [string, Item[]]) => (
    <div key={group}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{group}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {list.map((it, idx) => {
          const Icon = it.icon;
          return (
            <div key={idx} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/50 text-sm">
              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{it.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Card className="mt-4 mb-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('jetSkiFeatures')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {initial.map(renderGroup)}
        {collapsed.length > 0 && (
          <>
            {expanded && collapsed.map(renderGroup)}
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
