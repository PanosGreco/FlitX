import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, CalendarRange, Zap, Hand, ArrowLeft, ArrowRight, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isDateInSeason, type PriceSeason, type PriceSeasonRule } from "@/utils/priceSeasons";

interface PriceSeasonsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableCategories: string[];
  vehicles: { id: string; make: string; model: string; year: number; license_plate: string | null; type: string }[];
  onSeasonsChanged: () => void;
}

interface CategoryAdjustment {
  category: string;
  adjustmentType: 'percentage' | 'fixed';
  value: number;
  enabled: boolean;
}

interface VehicleOverride {
  vehicleId: string;
  adjustmentType: 'percentage' | 'fixed' | 'absolute';
  value: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getMonthDays(month: number): number {
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return daysInMonth[month - 1] || 31;
}

function formatDateRange(startMonth: number, startDay: number, endMonth: number, endDay: number): string {
  return `${MONTHS[startMonth - 1]} ${startDay} → ${MONTHS[endMonth - 1]} ${endDay}`;
}

function getSeasonStatus(season: PriceSeason): 'active' | 'inactive' | 'upcoming' {
  if (!season.is_active) return 'inactive';
  if (season.mode === 'manual') return 'active';
  const now = new Date();
  return isDateInSeason(now, season) ? 'active' : 'upcoming';
}

function getRuleSummary(rules: PriceSeasonRule[]): string {
  return rules.map(r => {
    const target = r.scope === 'vehicle' ? 'Vehicle' : (r.vehicle_category || '');
    const adj = r.adjustment_type === 'percentage'
      ? `${r.adjustment_value > 0 ? '+' : ''}${r.adjustment_value}%`
      : r.adjustment_type === 'fixed'
        ? `${r.adjustment_value > 0 ? '+' : ''}€${r.adjustment_value}`
        : `€${r.adjustment_value}`;
    return `${target}: ${adj}`;
  }).join(' · ');
}

export function PriceSeasonsDialog({ isOpen, onClose, availableCategories, vehicles, onSeasonsChanged }: PriceSeasonsDialogProps) {
  const { user } = useAuth();
  const { t } = useTranslation(['fleet', 'common']);

  const [seasons, setSeasons] = useState<PriceSeason[]>([]);
  const [rules, setRules] = useState<PriceSeasonRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create/Edit state
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Step 1: Name & Mode
  const [seasonName, setSeasonName] = useState("");
  const [seasonMode, setSeasonMode] = useState<'automatic' | 'manual'>('automatic');

  // Step 2: Date Range
  const [startMonth, setStartMonth] = useState(6);
  const [startDay, setStartDay] = useState(1);
  const [endMonth, setEndMonth] = useState(8);
  const [endDay, setEndDay] = useState(31);

  // Step 3: Category Adjustments
  const [sameForAll, setSameForAll] = useState(false);
  const [globalAdjType, setGlobalAdjType] = useState<'percentage' | 'fixed'>('percentage');
  const [globalAdjValue, setGlobalAdjValue] = useState(0);
  const [categoryAdjustments, setCategoryAdjustments] = useState<CategoryAdjustment[]>([]);

  // Step 4: Vehicle Overrides
  const [vehicleOverrides, setVehicleOverrides] = useState<VehicleOverride[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState("");

  // Delete confirm
  const [deleteSeasonId, setDeleteSeasonId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) fetchSeasons();
  }, [isOpen, user]);

  useEffect(() => {
    if (mode === 'create' && availableCategories.length > 0) {
      setCategoryAdjustments(availableCategories.map(cat => ({
        category: cat,
        adjustmentType: 'percentage',
        value: 0,
        enabled: false,
      })));
    }
  }, [mode, availableCategories]);

  const fetchSeasons = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [seasonsRes, rulesRes] = await Promise.all([
        supabase.from('price_seasons').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('price_season_rules').select('*').eq('user_id', user.id),
      ]);
      if (!seasonsRes.error) setSeasons((seasonsRes.data || []) as unknown as PriceSeason[]);
      if (!rulesRes.error) setRules((rulesRes.data || []) as unknown as PriceSeasonRule[]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSeasonName("");
    setSeasonMode('automatic');
    setStartMonth(6);
    setStartDay(1);
    setEndMonth(8);
    setEndDay(31);
    setSameForAll(false);
    setGlobalAdjType('percentage');
    setGlobalAdjValue(0);
    setCategoryAdjustments(availableCategories.map(cat => ({
      category: cat, adjustmentType: 'percentage', value: 0, enabled: false,
    })));
    setVehicleOverrides([]);
    setVehicleSearch("");
    setStep(1);
    setEditingSeasonId(null);
  };

  const startCreate = () => {
    resetForm();
    setMode('create');
  };

  const startEdit = (seasonId: string) => {
    const season = seasons.find(s => s.id === seasonId);
    if (!season) return;
    const seasonRules = rules.filter(r => r.season_id === seasonId);

    setSeasonName(season.name);
    setSeasonMode(season.mode);
    setStartMonth(season.start_month);
    setStartDay(season.start_day);
    setEndMonth(season.end_month);
    setEndDay(season.end_day);

    const catRules = seasonRules.filter(r => r.scope === 'category');
    setCategoryAdjustments(availableCategories.map(cat => {
      const existing = catRules.find(r => r.vehicle_category?.toLowerCase() === cat.toLowerCase());
      return {
        category: cat,
        adjustmentType: (existing?.adjustment_type as 'percentage' | 'fixed') || 'percentage',
        value: existing?.adjustment_value || 0,
        enabled: !!existing,
      };
    }));

    const vehRules = seasonRules.filter(r => r.scope === 'vehicle');
    setVehicleOverrides(vehRules.map(r => ({
      vehicleId: r.vehicle_id || '',
      adjustmentType: r.adjustment_type as 'percentage' | 'fixed' | 'absolute',
      value: r.adjustment_value,
    })));

    setSameForAll(false);
    setGlobalAdjType('percentage');
    setGlobalAdjValue(0);
    setVehicleSearch("");
    setStep(1);
    setEditingSeasonId(seasonId);
    setMode('edit');
  };

  const handleSave = async () => {
    if (!user || !seasonName.trim()) return;
    setIsLoading(true);
    try {
      if (editingSeasonId) {
        // Update season
        const { error } = await supabase.from('price_seasons').update({
          name: seasonName.trim(),
          mode: seasonMode,
          start_month: startMonth,
          start_day: startDay,
          end_month: endMonth,
          end_day: endDay,
          updated_at: new Date().toISOString(),
        }).eq('id', editingSeasonId);
        if (error) throw error;

        // Delete old rules and insert new
        await supabase.from('price_season_rules').delete().eq('season_id', editingSeasonId);
        await insertRules(editingSeasonId);
        toast.success(t('fleet:seasonUpdated'));
      } else {
        // Create season
        const { data, error } = await supabase.from('price_seasons').insert({
          user_id: user.id,
          name: seasonName.trim(),
          mode: seasonMode,
          start_month: startMonth,
          start_day: startDay,
          end_month: endMonth,
          end_day: endDay,
        }).select('id').single();
        if (error) throw error;
        await insertRules(data.id);
        toast.success(t('fleet:seasonCreated'));
      }
      await fetchSeasons();
      onSeasonsChanged();
      setMode('list');
      resetForm();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Error saving season');
    } finally {
      setIsLoading(false);
    }
  };

  const insertRules = async (seasonId: string) => {
    if (!user) return;
    const rulesToInsert: any[] = [];

    // Category rules
    const activeCategories = sameForAll
      ? availableCategories.filter(() => globalAdjValue !== 0).map(cat => ({
          category: cat, adjustmentType: globalAdjType, value: globalAdjValue,
        }))
      : categoryAdjustments.filter(a => a.enabled && a.value !== 0);

    for (const adj of activeCategories) {
      rulesToInsert.push({
        season_id: seasonId,
        user_id: user.id,
        scope: 'category',
        vehicle_category: sameForAll ? (adj as any).category : adj.category,
        adjustment_type: sameForAll ? globalAdjType : adj.adjustmentType,
        adjustment_value: sameForAll ? globalAdjValue : adj.value,
      });
    }

    // Vehicle overrides
    for (const ov of vehicleOverrides) {
      if (ov.value !== 0 || ov.adjustmentType === 'absolute') {
        rulesToInsert.push({
          season_id: seasonId,
          user_id: user.id,
          scope: 'vehicle',
          vehicle_id: ov.vehicleId,
          adjustment_type: ov.adjustmentType,
          adjustment_value: ov.value,
        });
      }
    }

    if (rulesToInsert.length > 0) {
      const { error } = await supabase.from('price_season_rules').insert(rulesToInsert);
      if (error) throw error;
    }
  };

  const handleDelete = async () => {
    if (!deleteSeasonId) return;
    try {
      const { error } = await supabase.from('price_seasons').delete().eq('id', deleteSeasonId);
      if (error) throw error;
      toast.success(t('fleet:seasonDeleted'));
      await fetchSeasons();
      onSeasonsChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleteSeasonId(null);
    }
  };

  const toggleActive = async (seasonId: string, currentlyActive: boolean) => {
    try {
      const { error } = await supabase.from('price_seasons').update({ is_active: !currentlyActive }).eq('id', seasonId);
      if (error) throw error;
      await fetchSeasons();
      onSeasonsChanged();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const isCrossYear = startMonth * 100 + startDay > endMonth * 100 + endDay;

  const filteredVehiclesForOverride = vehicles.filter(v => {
    if (vehicleOverrides.some(o => o.vehicleId === v.id)) return false;
    if (!vehicleSearch) return true;
    const search = vehicleSearch.toLowerCase();
    return `${v.make} ${v.model} ${v.year} ${v.license_plate || ''}`.toLowerCase().includes(search);
  });

  // Wizard content
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label>{t('fleet:seasonName')}</Label>
              <Input
                value={seasonName}
                onChange={e => setSeasonName(e.target.value)}
                placeholder={t('fleet:seasonNamePlaceholder')}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSeasonMode('automatic')}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-colors",
                  seasonMode === 'automatic' ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                )}
              >
                <Zap className="h-5 w-5 mb-2 text-green-600" />
                <div className="font-medium text-sm">{t('fleet:automaticMode')}</div>
                <p className="text-xs text-muted-foreground mt-1">{t('fleet:automaticModeDesc')}</p>
              </button>
              <button
                type="button"
                onClick={() => setSeasonMode('manual')}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-colors",
                  seasonMode === 'manual' ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                )}
              >
                <Hand className="h-5 w-5 mb-2 text-blue-600" />
                <div className="font-medium text-sm">{t('fleet:manualMode')}</div>
                <p className="text-xs text-muted-foreground mt-1">{t('fleet:manualModeDesc')}</p>
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Label>{t('fleet:dateRange')}</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground font-medium">{t('fleet:startDate')}</span>
                <Select value={String(startMonth)} onValueChange={v => setStartMonth(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(startDay)} onValueChange={v => setStartDay(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: getMonthDays(startMonth) }, (_, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground font-medium">{t('fleet:endDate')}</span>
                <Select value={String(endMonth)} onValueChange={v => setEndMonth(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(endDay)} onValueChange={v => setEndDay(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: getMonthDays(endMonth) }, (_, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-sm text-center font-medium text-muted-foreground">
              {formatDateRange(startMonth, startDay, endMonth, endDay)}
            </div>
            {isCrossYear && (
              <p className="text-xs text-amber-600 text-center">{t('fleet:crossYearNote')}</p>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Label>{t('fleet:categoryAdjustments')}</Label>
            <div className="flex items-center gap-2">
              <Switch checked={sameForAll} onCheckedChange={setSameForAll} />
              <span className="text-sm">{t('fleet:sameForAll')}</span>
            </div>
            {sameForAll ? (
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <Select value={globalAdjType} onValueChange={v => setGlobalAdjType(v as any)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t('fleet:percentage')}</SelectItem>
                    <SelectItem value="fixed">{t('fleet:fixedAmount')}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={globalAdjValue}
                  onChange={e => setGlobalAdjValue(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">{globalAdjType === 'percentage' ? '%' : '€'}</span>
              </div>
            ) : (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {categoryAdjustments.map((adj, idx) => (
                    <div key={adj.category} className="flex items-center gap-2 p-2 rounded-lg border">
                      <Switch
                        checked={adj.enabled}
                        onCheckedChange={v => {
                          const updated = [...categoryAdjustments];
                          updated[idx].enabled = v;
                          setCategoryAdjustments(updated);
                        }}
                      />
                      <span className="text-sm font-medium min-w-[80px]">{adj.category}</span>
                      <Select
                        value={adj.adjustmentType}
                        onValueChange={v => {
                          const updated = [...categoryAdjustments];
                          updated[idx].adjustmentType = v as any;
                          setCategoryAdjustments(updated);
                        }}
                        disabled={!adj.enabled}
                      >
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">{t('fleet:percentage')}</SelectItem>
                          <SelectItem value="fixed">{t('fleet:fixedAmount')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={adj.value}
                        onChange={e => {
                          const updated = [...categoryAdjustments];
                          updated[idx].value = Number(e.target.value);
                          setCategoryAdjustments(updated);
                        }}
                        className="w-20"
                        disabled={!adj.enabled}
                      />
                      <span className="text-xs text-muted-foreground">{adj.adjustmentType === 'percentage' ? '%' : '€'}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label>{t('fleet:vehicleOverrides')}</Label>
              <p className="text-xs text-muted-foreground mt-1">{t('fleet:vehicleOverridesDesc')}</p>
            </div>

            {vehicleOverrides.length > 0 && (
              <div className="space-y-2">
                {vehicleOverrides.map((ov, idx) => {
                  const veh = vehicles.find(v => v.id === ov.vehicleId);
                  return (
                    <div key={ov.vehicleId} className="flex items-center gap-2 p-2 rounded-lg border">
                      <span className="text-sm font-medium flex-1 truncate">
                        {veh ? `${veh.make} ${veh.model}` : ov.vehicleId}
                      </span>
                      <Select
                        value={ov.adjustmentType}
                        onValueChange={v => {
                          const updated = [...vehicleOverrides];
                          updated[idx].adjustmentType = v as any;
                          setVehicleOverrides(updated);
                        }}
                      >
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">{t('fleet:percentage')}</SelectItem>
                          <SelectItem value="fixed">{t('fleet:fixedAmount')}</SelectItem>
                          <SelectItem value="absolute">{t('fleet:absolutePrice')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={ov.value}
                        onChange={e => {
                          const updated = [...vehicleOverrides];
                          updated[idx].value = Number(e.target.value);
                          setVehicleOverrides(updated);
                        }}
                        className="w-20"
                      />
                      <Button variant="ghost" size="icon" onClick={() => setVehicleOverrides(vehicleOverrides.filter((_, i) => i !== idx))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={vehicleSearch}
                  onChange={e => setVehicleSearch(e.target.value)}
                  placeholder={t('fleet:booking_searchVehicle')}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="max-h-[150px] border rounded-md">
                {filteredVehiclesForOverride.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 border-b last:border-b-0"
                    onClick={() => setVehicleOverrides([...vehicleOverrides, { vehicleId: v.id, adjustmentType: 'percentage', value: 0 }])}
                  >
                    {v.make} {v.model} {v.year}
                    {v.license_plate && <span className="text-muted-foreground"> ({v.license_plate})</span>}
                  </button>
                ))}
                {filteredVehiclesForOverride.length === 0 && (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    {vehicles.length === vehicleOverrides.length ? t('fleet:noSearchResults') : t('fleet:noSearchResults')}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    if (step === 1) return seasonName.trim().length > 0;
    return true;
  };

  // List view
  const renderList = () => (
    <div className="space-y-4">
      <Button onClick={startCreate} className="w-full" variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        {t('fleet:createNewSeason')}
      </Button>

      {seasons.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <CalendarRange className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">{t('fleet:noSeasons')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('fleet:noSeasonsDesc')}</p>
        </div>
      )}

      {seasons.map(season => {
        const status = getSeasonStatus(season);
        const seasonRules = rules.filter(r => r.season_id === season.id);
        return (
          <div key={season.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold">{season.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {formatDateRange(season.start_month, season.start_day, season.end_month, season.end_day)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant={season.mode === 'automatic' ? 'default' : 'secondary'} className={cn(
                  "text-[10px]",
                  season.mode === 'automatic' ? "bg-green-100 text-green-800 border-green-200" : "bg-blue-100 text-blue-800 border-blue-200"
                )}>
                  {season.mode === 'automatic' ? t('fleet:automaticMode') : t('fleet:manualMode')}
                </Badge>
                <Badge variant="outline" className={cn(
                  "text-[10px]",
                  status === 'active' && "border-green-500 text-green-700",
                  status === 'inactive' && "border-muted-foreground text-muted-foreground",
                  status === 'upcoming' && "border-amber-500 text-amber-700"
                )}>
                  {status === 'active' ? t('fleet:currentlyActive') : status === 'upcoming' ? t('fleet:upcoming') : t('fleet:inactive')}
                </Badge>
              </div>
            </div>

            {seasonRules.length > 0 && (
              <p className="text-xs text-muted-foreground truncate">{getRuleSummary(seasonRules)}</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => startEdit(season.id)}>
                <Pencil className="h-3 w-3 mr-1" /> {t('common:edit')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => toggleActive(season.id, season.is_active)}>
                {season.is_active ? t('fleet:deactivate') : t('fleet:activate')}
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteSeasonId(season.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={open => { if (!open) { onClose(); setMode('list'); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5" />
              {t('fleet:priceSeasons')}
            </DialogTitle>
            <DialogDescription>{t('fleet:priceSeasonsDesc')}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-2">
            {mode === 'list' ? renderList() : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => { setMode('list'); resetForm(); }}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> {t('common:back')}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t('fleet:step')} {step} {t('fleet:of')} {totalSteps}
                  </span>
                </div>

                {/* Step progress */}
                <div className="flex gap-1">
                  {Array.from({ length: totalSteps }, (_, i) => (
                    <div key={i} className={cn(
                      "h-1 flex-1 rounded-full",
                      i < step ? "bg-primary" : "bg-muted"
                    )} />
                  ))}
                </div>

                {renderStep()}

                <div className="flex justify-between pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(s => s - 1)}
                    disabled={step === 1}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" /> {t('common:back')}
                  </Button>
                  {step < totalSteps ? (
                    <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
                      {t('common:next')} <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={handleSave} disabled={isLoading || !canProceed()}>
                      {editingSeasonId ? t('fleet:saveChanges') : t('fleet:createNewSeason')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSeasonId} onOpenChange={open => { if (!open) setDeleteSeasonId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common:confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('common:deleteConfirmation')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('common:delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
