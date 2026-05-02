import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Gauge, Ship, Users, ShieldCheck, Sparkles, LifeBuoy, FileText, ChevronDown,
} from "lucide-react";
import { useState } from "react";

export interface JetSkiFeaturesState {
  engineCc: number;
  horsepower: number;
  topSpeedKmh: number;
  isSupercharged: boolean;
  engineType: string;
  hullMaterial: string;
  hullType: string;
  lengthMeters: number;
  widthMeters: number;
  dryWeightKg: number;
  fuelTankLiters: number;
  riderCapacity: number;
  weightLimitKg: number;
  storageCapacityLiters: number;
  hasBoardingLadder: boolean;
  hasRearviewMirrors: boolean;
  hasReverse: boolean;
  hasBrakeSystem: boolean;
  hasTractionControl: boolean;
  hasNoWakeMode: boolean;
  hasGps: boolean;
  hasDepthFinder: boolean;
  hasCruiseControl: boolean;
  hasBluetoothSpeakers: boolean;
  hasWatertightStorage: boolean;
  hasSwimPlatform: boolean;
  hasTowHook: boolean;
  lifeJacketsIncluded: boolean;
  numLifeJackets: number;
  safetyLanyardIncluded: boolean;
  fireExtinguisherIncluded: boolean;
  whistleIncluded: boolean;
  minimumOperatorAge: number;
  licenseRequired: boolean;
  additionalNotes: string;
}

export const defaultJetSkiFeatures: JetSkiFeaturesState = {
  engineCc: 0, horsepower: 0, topSpeedKmh: 0,
  isSupercharged: false, engineType: '',
  hullMaterial: '', hullType: '',
  lengthMeters: 0, widthMeters: 0, dryWeightKg: 0, fuelTankLiters: 0,
  riderCapacity: 1, weightLimitKg: 0, storageCapacityLiters: 0,
  hasBoardingLadder: false, hasRearviewMirrors: false, hasReverse: false,
  hasBrakeSystem: false, hasTractionControl: false, hasNoWakeMode: false,
  hasGps: false, hasDepthFinder: false,
  hasCruiseControl: false, hasBluetoothSpeakers: false, hasWatertightStorage: false,
  hasSwimPlatform: false, hasTowHook: false,
  lifeJacketsIncluded: true, numLifeJackets: 1, safetyLanyardIncluded: true,
  fireExtinguisherIncluded: false, whistleIncluded: false,
  minimumOperatorAge: 16, licenseRequired: false,
  additionalNotes: '',
};

interface Props {
  state: JetSkiFeaturesState;
  onChange: (updates: Partial<JetSkiFeaturesState>) => void;
  disabled?: boolean;
}

function ToggleRow({ label, checked, onCheckedChange, disabled }: {
  label: string; checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

function GroupHeader({ icon: Icon, label, isOpen, onToggle }: {
  icon: React.ElementType; label: string; isOpen: boolean; onToggle: () => void;
}) {
  return (
    <CollapsibleTrigger onClick={onToggle} className="flex items-center gap-2 w-full py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-left">{label}</span>
      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </CollapsibleTrigger>
  );
}

export function JetSkiFeaturesForm({ state, onChange, disabled }: Props) {
  const { t } = useTranslation('fleet');
  const [open, setOpen] = useState<Record<string, boolean>>({
    engine: true, hull: true, capacity: true, safety: true, comfort: false, rental: true, notes: false,
  });
  const toggle = (k: string) => setOpen(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="space-y-1">
      <Separator className="my-3" />
      <div className="flex items-center gap-2 text-muted-foreground pb-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wide">{t('jetSkiFeatures')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Engine & Performance */}
      <Collapsible open={open.engine}>
        <GroupHeader icon={Gauge} label={t('jetSkiFeatures_engine')} isOpen={open.engine} onToggle={() => toggle('engine')} />
        <CollapsibleContent className="space-y-2 pl-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('jetSkiFeatures_engineCc')}</Label>
              <Input type="number" min={0} value={state.engineCc || ''} onChange={e => onChange({ engineCc: parseInt(e.target.value) || 0 })} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('jetSkiFeatures_horsepower')}</Label>
              <Input type="number" min={0} value={state.horsepower || ''} onChange={e => onChange({ horsepower: parseInt(e.target.value) || 0 })} disabled={disabled} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('jetSkiFeatures_topSpeed')}</Label>
              <Input type="number" min={0} value={state.topSpeedKmh || ''} onChange={e => onChange({ topSpeedKmh: parseInt(e.target.value) || 0 })} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('jetSkiFeatures_engineType')}</Label>
              <Select value={state.engineType} onValueChange={v => onChange({ engineType: v })} disabled={disabled}>
                <SelectTrigger><SelectValue placeholder={t('selectPrompt')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2stroke">{t('jetSkiFeatures_engine_2stroke')}</SelectItem>
                  <SelectItem value="4stroke">{t('jetSkiFeatures_engine_4stroke')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <ToggleRow label={t('jetSkiFeatures_supercharged')} checked={state.isSupercharged} onCheckedChange={v => onChange({ isSupercharged: v })} disabled={disabled} />
        </CollapsibleContent>
      </Collapsible>

      {/* Hull & Dimensions */}
      <Collapsible open={open.hull}>
        <GroupHeader icon={Ship} label={t('jetSkiFeatures_hull')} isOpen={open.hull} onToggle={() => toggle('hull')} />
        <CollapsibleContent className="space-y-2 pl-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('jetSkiFeatures_hullMaterial')}</Label>
              <Select value={state.hullMaterial} onValueChange={v => onChange({ hullMaterial: v })} disabled={disabled}>
                <SelectTrigger><SelectValue placeholder={t('selectPrompt')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiberglass">{t('jetSkiFeatures_hull_fiberglass')}</SelectItem>
                  <SelectItem value="smc">{t('jetSkiFeatures_hull_smc')}</SelectItem>
                  <SelectItem value="polyethylene">{t('jetSkiFeatures_hull_polyethylene')}</SelectItem>
                  <SelectItem value="nanoxcel">{t('jetSkiFeatures_hull_nanoxcel')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('jetSkiFeatures_hullType')}</Label>
              <Select value={state.hullType} onValueChange={v => onChange({ hullType: v })} disabled={disabled}>
                <SelectTrigger><SelectValue placeholder={t('selectPrompt')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat_bottom">{t('jetSkiFeatures_hull_flat')}</SelectItem>
                  <SelectItem value="v_shape">{t('jetSkiFeatures_hull_vshape')}</SelectItem>
                  <SelectItem value="progressive_stepped_v">{t('jetSkiFeatures_hull_stepped')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('jetSkiFeatures_length')}</Label>
              <Input type="number" min={0} step="0.01" value={state.lengthMeters || ''} onChange={e => onChange({ lengthMeters: parseFloat(e.target.value) || 0 })} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('jetSkiFeatures_width')}</Label>
              <Input type="number" min={0} step="0.01" value={state.widthMeters || ''} onChange={e => onChange({ widthMeters: parseFloat(e.target.value) || 0 })} disabled={disabled} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('jetSkiFeatures_dryWeight')}</Label>
              <Input type="number" min={0} value={state.dryWeightKg || ''} onChange={e => onChange({ dryWeightKg: parseInt(e.target.value) || 0 })} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('jetSkiFeatures_fuelTank')}</Label>
              <Input type="number" min={0} step="0.1" value={state.fuelTankLiters || ''} onChange={e => onChange({ fuelTankLiters: parseFloat(e.target.value) || 0 })} disabled={disabled} />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Capacity */}
      <Collapsible open={open.capacity}>
        <GroupHeader icon={Users} label={t('jetSkiFeatures_capacity')} isOpen={open.capacity} onToggle={() => toggle('capacity')} />
        <CollapsibleContent className="space-y-2 pl-6">
          <div className="space-y-1">
            <Label className="text-xs">{t('jetSkiFeatures_riderCapacity')}</Label>
            <Select value={String(state.riderCapacity)} onValueChange={v => onChange({ riderCapacity: parseInt(v) || 1 })} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder={t('selectPrompt')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('jetSkiFeatures_weightLimit')}</Label>
              <Input type="number" min={0} value={state.weightLimitKg || ''} onChange={e => onChange({ weightLimitKg: parseInt(e.target.value) || 0 })} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('jetSkiFeatures_storageCapacity')}</Label>
              <Input type="number" min={0} value={state.storageCapacityLiters || ''} onChange={e => onChange({ storageCapacityLiters: parseInt(e.target.value) || 0 })} disabled={disabled} />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Safety & Equipment */}
      <Collapsible open={open.safety}>
        <GroupHeader icon={ShieldCheck} label={t('jetSkiFeatures_safety')} isOpen={open.safety} onToggle={() => toggle('safety')} />
        <CollapsibleContent className="space-y-1 pl-6">
          <ToggleRow label={t('jetSkiFeatures_boardingLadder')} checked={state.hasBoardingLadder} onCheckedChange={v => onChange({ hasBoardingLadder: v })} disabled={disabled} />
          <ToggleRow label={t('jetSkiFeatures_rearviewMirrors')} checked={state.hasRearviewMirrors} onCheckedChange={v => onChange({ hasRearviewMirrors: v })} disabled={disabled} />
          <ToggleRow label={t('jetSkiFeatures_reverse')} checked={state.hasReverse} onCheckedChange={v => onChange({ hasReverse: v })} disabled={disabled} />
          <ToggleRow label={t('jetSkiFeatures_brakeSystem')} checked={state.hasBrakeSystem} onCheckedChange={v => onChange({ hasBrakeSystem: v })} disabled={disabled} />
          <ToggleRow label={t('jetSkiFeatures_tractionControl')} checked={state.hasTractionControl} onCheckedChange={v => onChange({ hasTractionControl: v })} disabled={disabled} />
          <ToggleRow label={t('jetSkiFeatures_noWakeMode')} checked={state.hasNoWakeMode} onCheckedChange={v => onChange({ hasNoWakeMode: v })} disabled={disabled} />
          <ToggleRow label={t('jetSkiFeatures_gps')} checked={state.hasGps} onCheckedChange={v => onChange({ hasGps: v })} disabled={disabled} />
          <ToggleRow label={t('jetSkiFeatures_depthFinder')} checked={state.hasDepthFinder} onCheckedChange={v => onChange({ hasDepthFinder: v })} disabled={disabled} />
        </CollapsibleContent>
      </Collapsible>

      {/* Comfort & Extras */}
      <Collapsible open={open.comfort}>
        <GroupHeader icon={Sparkles} label={t('jetSkiFeatures_comfort')} isOpen={open.comfort} onToggle={() => toggle('comfort')} />
        <CollapsibleContent className="space-y-1 pl-6">
          <ToggleRow label={t('jetSkiFeatures_cruiseControl')} checked={state.hasCruiseControl} onCheckedChange={v => onChange({ hasCruiseControl: v })} disabled={disabled} />
          <ToggleRow label={t('jetSkiFeatures_bluetoothSpeakers')} checked={state.hasBluetoothSpeakers} onCheckedChange={v => onChange({ hasBluetoothSpeakers: v })} disabled={disabled} />
          <ToggleRow label={t('jetSkiFeatures_watertightStorage')} checked={state.hasWatertightStorage} onCheckedChange={v => onChange({ hasWatertightStorage: v })} disabled={disabled} />
          <ToggleRow label={t('jetSkiFeatures_swimPlatform')} checked={state.hasSwimPlatform} onCheckedChange={v => onChange({ hasSwimPlatform: v })} disabled={disabled} />
          <ToggleRow label={t('jetSkiFeatures_towHook')} checked={state.hasTowHook} onCheckedChange={v => onChange({ hasTowHook: v })} disabled={disabled} />
        </CollapsibleContent>
      </Collapsible>

      {/* Rental Extras */}
      <Collapsible open={open.rental}>
        <GroupHeader icon={LifeBuoy} label={t('jetSkiFeatures_rental')} isOpen={open.rental} onToggle={() => toggle('rental')} />
        <CollapsibleContent className="space-y-1 pl-6">
          <ToggleRow label={t('jetSkiFeatures_lifeJackets')} checked={state.lifeJacketsIncluded} onCheckedChange={v => onChange({ lifeJacketsIncluded: v })} disabled={disabled} />
          {state.lifeJacketsIncluded && (
            <div className="space-y-1 ml-2 border-l-2 border-muted pl-3">
              <Label className="text-xs">{t('jetSkiFeatures_numLifeJackets')}</Label>
              <Input type="number" min={1} max={3} value={state.numLifeJackets || ''} onChange={e => onChange({ numLifeJackets: parseInt(e.target.value) || 1 })} disabled={disabled} />
            </div>
          )}
          <ToggleRow label={t('jetSkiFeatures_safetyLanyard')} checked={state.safetyLanyardIncluded} onCheckedChange={v => onChange({ safetyLanyardIncluded: v })} disabled={disabled} />
          <ToggleRow label={t('jetSkiFeatures_fireExtinguisher')} checked={state.fireExtinguisherIncluded} onCheckedChange={v => onChange({ fireExtinguisherIncluded: v })} disabled={disabled} />
          <ToggleRow label={t('jetSkiFeatures_whistle')} checked={state.whistleIncluded} onCheckedChange={v => onChange({ whistleIncluded: v })} disabled={disabled} />
          <div className="space-y-1">
            <Label className="text-xs">{t('jetSkiFeatures_minimumAge')}</Label>
            <Input type="number" min={14} max={25} value={state.minimumOperatorAge || ''} onChange={e => onChange({ minimumOperatorAge: parseInt(e.target.value) || 16 })} disabled={disabled} />
          </div>
          <ToggleRow label={t('jetSkiFeatures_licenseRequired')} checked={state.licenseRequired} onCheckedChange={v => onChange({ licenseRequired: v })} disabled={disabled} />
        </CollapsibleContent>
      </Collapsible>

      {/* Notes */}
      <Collapsible open={open.notes}>
        <GroupHeader icon={FileText} label={t('jetSkiFeatures_additionalNotes')} isOpen={open.notes} onToggle={() => toggle('notes')} />
        <CollapsibleContent className="space-y-1 pl-6">
          <Textarea
            value={state.additionalNotes}
            onChange={e => onChange({ additionalNotes: e.target.value })}
            placeholder={t('jetSkiFeatures_additionalNotesPlaceholder')}
            disabled={disabled}
            className="min-h-[60px]"
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
