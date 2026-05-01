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
  Gauge, BadgeCheck, Ruler, Settings, HardHat, FileText, ChevronDown,
} from "lucide-react";
import { useState } from "react";

export interface MotorbikeFeaturesState {
  // Engine & Performance
  engineCc: number;
  horsepower: number;
  topSpeedKmh: number;
  coolingSystem: string;  // 'air' | 'liquid'
  engineType: string;     // '2stroke' | '4stroke' | 'electric'

  // License & Regulations
  licenseCategory: string;  // 'AM' | 'A1' | 'A2' | 'A'
  minimumRiderAge: number;

  // Dimensions & Weight
  seatHeightCm: number;
  dryWeightKg: number;
  fuelTankLiters: number;

  // Features & Equipment
  hasAbs: boolean;
  hasTractionControl: boolean;
  hasWindscreen: boolean;
  hasHeatedGrips: boolean;
  hasTopCase: boolean;
  hasSideCases: boolean;
  hasUsbCharger: boolean;
  hasCruiseControl: boolean;
  hasKeylessStart: boolean;

  // Rental Extras
  helmetIncluded: boolean;
  numHelmets: number;
  lockIncluded: boolean;
  phoneMountIncluded: boolean;

  // Notes
  additionalNotes: string;
}

export const defaultMotorbikeFeatures: MotorbikeFeaturesState = {
  engineCc: 0, horsepower: 0, topSpeedKmh: 0,
  coolingSystem: '', engineType: '',
  licenseCategory: '', minimumRiderAge: 18,
  seatHeightCm: 0, dryWeightKg: 0, fuelTankLiters: 0,
  hasAbs: false, hasTractionControl: false, hasWindscreen: false,
  hasHeatedGrips: false, hasTopCase: false, hasSideCases: false,
  hasUsbCharger: false, hasCruiseControl: false, hasKeylessStart: false,
  helmetIncluded: true, numHelmets: 1, lockIncluded: false, phoneMountIncluded: false,
  additionalNotes: '',
};

interface MotorbikeFeaturesFormProps {
  state: MotorbikeFeaturesState;
  onChange: (updates: Partial<MotorbikeFeaturesState>) => void;
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

export function MotorbikeFeaturesForm({ state, onChange, disabled }: MotorbikeFeaturesFormProps) {
  const { t } = useTranslation('fleet');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    engine: true, license: true, dimensions: true, equipment: true, rental: true, notes: false,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-1">
      <Separator className="my-3" />
      <div className="flex items-center gap-2 text-muted-foreground pb-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wide">{t('motorbikeFeatures')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Engine & Performance */}
      <Collapsible open={openGroups.engine}>
        <GroupHeader icon={Gauge} label={t('motorbikeFeatures_engine')} isOpen={openGroups.engine} onToggle={() => toggleGroup('engine')} />
        <CollapsibleContent className="space-y-2 pl-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('motorbikeFeatures_engineCc')}</Label>
              <Input type="number" min={0} placeholder="e.g., 530" value={state.engineCc || ''} onChange={e => onChange({ engineCc: parseInt(e.target.value) || 0 })} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('motorbikeFeatures_horsepower')}</Label>
              <Input type="number" min={0} placeholder="e.g., 45" value={state.horsepower || ''} onChange={e => onChange({ horsepower: parseInt(e.target.value) || 0 })} disabled={disabled} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('motorbikeFeatures_topSpeed')}</Label>
            <Input type="number" min={0} value={state.topSpeedKmh || ''} onChange={e => onChange({ topSpeedKmh: parseInt(e.target.value) || 0 })} disabled={disabled} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('motorbikeFeatures_coolingSystem')}</Label>
              <Select value={state.coolingSystem} onValueChange={v => onChange({ coolingSystem: v })} disabled={disabled}>
                <SelectTrigger><SelectValue placeholder={t('selectPrompt')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="air">{t('motorbikeFeatures_cooling_air')}</SelectItem>
                  <SelectItem value="liquid">{t('motorbikeFeatures_cooling_liquid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('motorbikeFeatures_engineType')}</Label>
              <Select value={state.engineType} onValueChange={v => onChange({ engineType: v })} disabled={disabled}>
                <SelectTrigger><SelectValue placeholder={t('selectPrompt')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2stroke">{t('motorbikeFeatures_engine_2stroke')}</SelectItem>
                  <SelectItem value="4stroke">{t('motorbikeFeatures_engine_4stroke')}</SelectItem>
                  <SelectItem value="electric">{t('motorbikeFeatures_engine_electric')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* License & Regulations */}
      <Collapsible open={openGroups.license}>
        <GroupHeader icon={BadgeCheck} label={t('motorbikeFeatures_license')} isOpen={openGroups.license} onToggle={() => toggleGroup('license')} />
        <CollapsibleContent className="space-y-2 pl-6">
          <div className="space-y-1">
            <Label className="text-xs">{t('motorbikeFeatures_licenseCategory')}</Label>
            <Select value={state.licenseCategory} onValueChange={v => onChange({ licenseCategory: v })} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder={t('selectPrompt')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">{t('motorbikeFeatures_license_AM')}</SelectItem>
                <SelectItem value="A1">{t('motorbikeFeatures_license_A1')}</SelectItem>
                <SelectItem value="A2">{t('motorbikeFeatures_license_A2')}</SelectItem>
                <SelectItem value="A">{t('motorbikeFeatures_license_A')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('motorbikeFeatures_minimumAge')}</Label>
            <Input type="number" min={14} max={25} value={state.minimumRiderAge || ''} onChange={e => onChange({ minimumRiderAge: parseInt(e.target.value) || 18 })} disabled={disabled} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Dimensions & Weight */}
      <Collapsible open={openGroups.dimensions}>
        <GroupHeader icon={Ruler} label={t('motorbikeFeatures_dimensions')} isOpen={openGroups.dimensions} onToggle={() => toggleGroup('dimensions')} />
        <CollapsibleContent className="space-y-2 pl-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('motorbikeFeatures_seatHeight')}</Label>
              <Input type="number" min={0} value={state.seatHeightCm || ''} onChange={e => onChange({ seatHeightCm: parseInt(e.target.value) || 0 })} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('motorbikeFeatures_dryWeight')}</Label>
              <Input type="number" min={0} value={state.dryWeightKg || ''} onChange={e => onChange({ dryWeightKg: parseInt(e.target.value) || 0 })} disabled={disabled} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('motorbikeFeatures_fuelTank')}</Label>
            <Input type="number" min={0} step="0.1" value={state.fuelTankLiters || ''} onChange={e => onChange({ fuelTankLiters: parseFloat(e.target.value) || 0 })} disabled={disabled} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Features & Equipment */}
      <Collapsible open={openGroups.equipment}>
        <GroupHeader icon={Settings} label={t('motorbikeFeatures_equipment')} isOpen={openGroups.equipment} onToggle={() => toggleGroup('equipment')} />
        <CollapsibleContent className="space-y-1 pl-6">
          <ToggleRow label={t('motorbikeFeatures_hasAbs')} checked={state.hasAbs} onCheckedChange={v => onChange({ hasAbs: v })} disabled={disabled} />
          <ToggleRow label={t('motorbikeFeatures_hasTractionControl')} checked={state.hasTractionControl} onCheckedChange={v => onChange({ hasTractionControl: v })} disabled={disabled} />
          <ToggleRow label={t('motorbikeFeatures_hasWindscreen')} checked={state.hasWindscreen} onCheckedChange={v => onChange({ hasWindscreen: v })} disabled={disabled} />
          <ToggleRow label={t('motorbikeFeatures_hasHeatedGrips')} checked={state.hasHeatedGrips} onCheckedChange={v => onChange({ hasHeatedGrips: v })} disabled={disabled} />
          <ToggleRow label={t('motorbikeFeatures_hasTopCase')} checked={state.hasTopCase} onCheckedChange={v => onChange({ hasTopCase: v })} disabled={disabled} />
          <ToggleRow label={t('motorbikeFeatures_hasSideCases')} checked={state.hasSideCases} onCheckedChange={v => onChange({ hasSideCases: v })} disabled={disabled} />
          <ToggleRow label={t('motorbikeFeatures_hasUsbCharger')} checked={state.hasUsbCharger} onCheckedChange={v => onChange({ hasUsbCharger: v })} disabled={disabled} />
          <ToggleRow label={t('motorbikeFeatures_hasCruiseControl')} checked={state.hasCruiseControl} onCheckedChange={v => onChange({ hasCruiseControl: v })} disabled={disabled} />
          <ToggleRow label={t('motorbikeFeatures_hasKeylessStart')} checked={state.hasKeylessStart} onCheckedChange={v => onChange({ hasKeylessStart: v })} disabled={disabled} />
        </CollapsibleContent>
      </Collapsible>

      {/* Rental Extras */}
      <Collapsible open={openGroups.rental}>
        <GroupHeader icon={HardHat} label={t('motorbikeFeatures_rental')} isOpen={openGroups.rental} onToggle={() => toggleGroup('rental')} />
        <CollapsibleContent className="space-y-1 pl-6">
          <ToggleRow label={t('motorbikeFeatures_helmetIncluded')} checked={state.helmetIncluded} onCheckedChange={v => onChange({ helmetIncluded: v })} disabled={disabled} />
          {state.helmetIncluded && (
            <div className="space-y-1 ml-2 border-l-2 border-muted pl-3">
              <Label className="text-xs">{t('motorbikeFeatures_numHelmets')}</Label>
              <Input type="number" min={1} max={2} value={state.numHelmets || ''} onChange={e => onChange({ numHelmets: parseInt(e.target.value) || 1 })} disabled={disabled} />
            </div>
          )}
          <ToggleRow label={t('motorbikeFeatures_lockIncluded')} checked={state.lockIncluded} onCheckedChange={v => onChange({ lockIncluded: v })} disabled={disabled} />
          <ToggleRow label={t('motorbikeFeatures_phoneMountIncluded')} checked={state.phoneMountIncluded} onCheckedChange={v => onChange({ phoneMountIncluded: v })} disabled={disabled} />
        </CollapsibleContent>
      </Collapsible>

      {/* Additional Notes */}
      <Collapsible open={openGroups.notes}>
        <GroupHeader icon={FileText} label={t('motorbikeFeatures_additionalNotes')} isOpen={openGroups.notes} onToggle={() => toggleGroup('notes')} />
        <CollapsibleContent className="space-y-1 pl-6">
          <Textarea
            value={state.additionalNotes}
            onChange={e => onChange({ additionalNotes: e.target.value })}
            placeholder={t('motorbikeFeatures_additionalNotesPlaceholder')}
            disabled={disabled}
            className="min-h-[60px]"
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
