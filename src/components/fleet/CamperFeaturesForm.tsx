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
  BedDouble, Flame, Droplets, Thermometer, Zap, Ruler, ChevronDown,
} from "lucide-react";
import { useState } from "react";

export interface CamperFeaturesState {
  sleepingCapacity: number;
  numBeds: number;
  bedType: string;
  hasKitchen: boolean;
  numBurners: number;
  hasFridge: boolean;
  fridgeSizeLiters: number;
  hasSink: boolean;
  hasOven: boolean;
  hasMicrowave: boolean;
  hasToilet: boolean;
  toiletType: string;
  hasShower: boolean;
  hasHotWater: boolean;
  hasHeating: boolean;
  hasAC: boolean;
  hasAwning: boolean;
  hasMosquitoScreens: boolean;
  hasBlackoutBlinds: boolean;
  hasSolarPanels: boolean;
  hasExternalPower: boolean;
  hasInverter: boolean;
  hasGenerator: boolean;
  freshWaterCapacity: number;
  grayWaterCapacity: number;
  vehicleLength: string;
  vehicleHeight: string;
  hasBikeRack: boolean;
  hasRearCamera: boolean;
  hasGPS: boolean;
  hasTV: boolean;
  hasWifi: boolean;
  hasPetFriendly: boolean;
  additionalNotes: string;
}

export const defaultCamperFeatures: CamperFeaturesState = {
  sleepingCapacity: 0, numBeds: 0, bedType: '',
  hasKitchen: false, numBurners: 0, hasFridge: false, fridgeSizeLiters: 0,
  hasSink: false, hasOven: false, hasMicrowave: false,
  hasToilet: false, toiletType: '', hasShower: false, hasHotWater: false,
  hasHeating: false, hasAC: false, hasAwning: false, hasMosquitoScreens: false, hasBlackoutBlinds: false,
  hasSolarPanels: false, hasExternalPower: false, hasInverter: false, hasGenerator: false,
  freshWaterCapacity: 0, grayWaterCapacity: 0,
  vehicleLength: '', vehicleHeight: '',
  hasBikeRack: false, hasRearCamera: false, hasGPS: false,
  hasTV: false, hasWifi: false, hasPetFriendly: false, additionalNotes: '',
};

interface CamperFeaturesFormProps {
  state: CamperFeaturesState;
  onChange: (updates: Partial<CamperFeaturesState>) => void;
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

export function CamperFeaturesForm({ state, onChange, disabled }: CamperFeaturesFormProps) {
  const { t } = useTranslation('fleet');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    sleeping: true, kitchen: true, bathroom: true, climate: true, utilities: true, dimensions: true,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-1">
      <Separator className="my-3" />
      <div className="flex items-center gap-2 text-muted-foreground pb-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wide">{t('camperFeatures')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Sleeping */}
      <Collapsible open={openGroups.sleeping}>
        <GroupHeader icon={BedDouble} label={t('camperFeatures_sleeping')} isOpen={openGroups.sleeping} onToggle={() => toggleGroup('sleeping')} />
        <CollapsibleContent className="space-y-2 pl-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('camperFeatures_sleepingCapacity')}</Label>
              <Input type="number" min={0} value={state.sleepingCapacity || ''} onChange={e => onChange({ sleepingCapacity: parseInt(e.target.value) || 0 })} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('camperFeatures_numBeds')}</Label>
              <Input type="number" min={0} value={state.numBeds || ''} onChange={e => onChange({ numBeds: parseInt(e.target.value) || 0 })} disabled={disabled} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('camperFeatures_bedType')}</Label>
            <Select value={state.bedType} onValueChange={v => onChange({ bedType: v })} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder={t('selectPrompt')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed_double">{t('camperFeatures_bedType_fixed_double')}</SelectItem>
                <SelectItem value="pop_top">{t('camperFeatures_bedType_pop_top')}</SelectItem>
                <SelectItem value="convertible">{t('camperFeatures_bedType_convertible')}</SelectItem>
                <SelectItem value="bunk">{t('camperFeatures_bedType_bunk')}</SelectItem>
                <SelectItem value="mixed">{t('camperFeatures_bedType_mixed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Kitchen */}
      <Collapsible open={openGroups.kitchen}>
        <GroupHeader icon={Flame} label={t('camperFeatures_kitchen')} isOpen={openGroups.kitchen} onToggle={() => toggleGroup('kitchen')} />
        <CollapsibleContent className="space-y-1 pl-6">
          <ToggleRow label={t('camperFeatures_hasKitchen')} checked={state.hasKitchen} onCheckedChange={v => onChange({ hasKitchen: v })} disabled={disabled} />
          {state.hasKitchen && (
            <div className="space-y-1 ml-2 border-l-2 border-muted pl-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('camperFeatures_numBurners')}</Label>
                <Input type="number" min={0} max={4} value={state.numBurners || ''} onChange={e => onChange({ numBurners: parseInt(e.target.value) || 0 })} disabled={disabled} />
              </div>
              <ToggleRow label={t('camperFeatures_hasFridge')} checked={state.hasFridge} onCheckedChange={v => onChange({ hasFridge: v })} disabled={disabled} />
              {state.hasFridge && (
                <div className="space-y-1 ml-2">
                  <Label className="text-xs">{t('camperFeatures_fridgeSize')}</Label>
                  <Input type="number" min={0} value={state.fridgeSizeLiters || ''} onChange={e => onChange({ fridgeSizeLiters: parseInt(e.target.value) || 0 })} disabled={disabled} />
                </div>
              )}
              <ToggleRow label={t('camperFeatures_hasSink')} checked={state.hasSink} onCheckedChange={v => onChange({ hasSink: v })} disabled={disabled} />
              <ToggleRow label={t('camperFeatures_hasOven')} checked={state.hasOven} onCheckedChange={v => onChange({ hasOven: v })} disabled={disabled} />
              <ToggleRow label={t('camperFeatures_hasMicrowave')} checked={state.hasMicrowave} onCheckedChange={v => onChange({ hasMicrowave: v })} disabled={disabled} />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Bathroom */}
      <Collapsible open={openGroups.bathroom}>
        <GroupHeader icon={Droplets} label={t('camperFeatures_bathroom')} isOpen={openGroups.bathroom} onToggle={() => toggleGroup('bathroom')} />
        <CollapsibleContent className="space-y-1 pl-6">
          <ToggleRow label={t('camperFeatures_hasToilet')} checked={state.hasToilet} onCheckedChange={v => onChange({ hasToilet: v })} disabled={disabled} />
          {state.hasToilet && (
            <div className="space-y-1 ml-2 border-l-2 border-muted pl-3">
              <Label className="text-xs">{t('camperFeatures_toiletType')}</Label>
              <Select value={state.toiletType} onValueChange={v => onChange({ toiletType: v })} disabled={disabled}>
                <SelectTrigger><SelectValue placeholder={t('selectPrompt')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cassette">{t('camperFeatures_toiletType_cassette')}</SelectItem>
                  <SelectItem value="chemical">{t('camperFeatures_toiletType_chemical')}</SelectItem>
                  <SelectItem value="fixed">{t('camperFeatures_toiletType_fixed')}</SelectItem>
                  <SelectItem value="portable">{t('camperFeatures_toiletType_portable')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <ToggleRow label={t('camperFeatures_hasShower')} checked={state.hasShower} onCheckedChange={v => onChange({ hasShower: v })} disabled={disabled} />
          <ToggleRow label={t('camperFeatures_hasHotWater')} checked={state.hasHotWater} onCheckedChange={v => onChange({ hasHotWater: v })} disabled={disabled} />
        </CollapsibleContent>
      </Collapsible>

      {/* Climate */}
      <Collapsible open={openGroups.climate}>
        <GroupHeader icon={Thermometer} label={t('camperFeatures_climate')} isOpen={openGroups.climate} onToggle={() => toggleGroup('climate')} />
        <CollapsibleContent className="space-y-1 pl-6">
          <ToggleRow label={t('camperFeatures_hasHeating')} checked={state.hasHeating} onCheckedChange={v => onChange({ hasHeating: v })} disabled={disabled} />
          <ToggleRow label={t('camperFeatures_hasAC')} checked={state.hasAC} onCheckedChange={v => onChange({ hasAC: v })} disabled={disabled} />
          <ToggleRow label={t('camperFeatures_hasAwning')} checked={state.hasAwning} onCheckedChange={v => onChange({ hasAwning: v })} disabled={disabled} />
          <ToggleRow label={t('camperFeatures_hasMosquitoScreens')} checked={state.hasMosquitoScreens} onCheckedChange={v => onChange({ hasMosquitoScreens: v })} disabled={disabled} />
          <ToggleRow label={t('camperFeatures_hasBlackoutBlinds')} checked={state.hasBlackoutBlinds} onCheckedChange={v => onChange({ hasBlackoutBlinds: v })} disabled={disabled} />
        </CollapsibleContent>
      </Collapsible>

      {/* Utilities */}
      <Collapsible open={openGroups.utilities}>
        <GroupHeader icon={Zap} label={t('camperFeatures_utilities')} isOpen={openGroups.utilities} onToggle={() => toggleGroup('utilities')} />
        <CollapsibleContent className="space-y-1 pl-6">
          <ToggleRow label={t('camperFeatures_hasSolarPanels')} checked={state.hasSolarPanels} onCheckedChange={v => onChange({ hasSolarPanels: v })} disabled={disabled} />
          <ToggleRow label={t('camperFeatures_hasExternalPower')} checked={state.hasExternalPower} onCheckedChange={v => onChange({ hasExternalPower: v })} disabled={disabled} />
          <ToggleRow label={t('camperFeatures_hasInverter')} checked={state.hasInverter} onCheckedChange={v => onChange({ hasInverter: v })} disabled={disabled} />
          <ToggleRow label={t('camperFeatures_hasGenerator')} checked={state.hasGenerator} onCheckedChange={v => onChange({ hasGenerator: v })} disabled={disabled} />
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <Label className="text-xs">{t('camperFeatures_freshWater')}</Label>
              <Input type="number" min={0} value={state.freshWaterCapacity || ''} onChange={e => onChange({ freshWaterCapacity: parseInt(e.target.value) || 0 })} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('camperFeatures_grayWater')}</Label>
              <Input type="number" min={0} value={state.grayWaterCapacity || ''} onChange={e => onChange({ grayWaterCapacity: parseInt(e.target.value) || 0 })} disabled={disabled} />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Dimensions & Extras */}
      <Collapsible open={openGroups.dimensions}>
        <GroupHeader icon={Ruler} label={t('camperFeatures_dimensions')} isOpen={openGroups.dimensions} onToggle={() => toggleGroup('dimensions')} />
        <CollapsibleContent className="space-y-2 pl-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('camperFeatures_length')}</Label>
              <Input type="number" min={0} step="0.01" value={state.vehicleLength} onChange={e => onChange({ vehicleLength: e.target.value })} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('camperFeatures_height')}</Label>
              <Input type="number" min={0} step="0.01" value={state.vehicleHeight} onChange={e => onChange({ vehicleHeight: e.target.value })} disabled={disabled} />
            </div>
          </div>
          <ToggleRow label={t('camperFeatures_hasBikeRack')} checked={state.hasBikeRack} onCheckedChange={v => onChange({ hasBikeRack: v })} disabled={disabled} />
          <ToggleRow label={t('camperFeatures_hasRearCamera')} checked={state.hasRearCamera} onCheckedChange={v => onChange({ hasRearCamera: v })} disabled={disabled} />
          <ToggleRow label={t('camperFeatures_hasGPS')} checked={state.hasGPS} onCheckedChange={v => onChange({ hasGPS: v })} disabled={disabled} />
          <ToggleRow label={t('camperFeatures_hasTV')} checked={state.hasTV} onCheckedChange={v => onChange({ hasTV: v })} disabled={disabled} />
          <ToggleRow label={t('camperFeatures_hasWifi')} checked={state.hasWifi} onCheckedChange={v => onChange({ hasWifi: v })} disabled={disabled} />
          <ToggleRow label={t('camperFeatures_hasPetFriendly')} checked={state.hasPetFriendly} onCheckedChange={v => onChange({ hasPetFriendly: v })} disabled={disabled} />
          <div className="space-y-1 pt-1">
            <Label className="text-xs">{t('camperFeatures_additionalNotes')}</Label>
            <Textarea
              value={state.additionalNotes}
              onChange={e => onChange({ additionalNotes: e.target.value })}
              placeholder={t('camperFeatures_additionalNotesPlaceholder')}
              disabled={disabled}
              className="min-h-[60px]"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
