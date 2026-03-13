import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Car, Bike, Truck, Snowflake, Waves, Tent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  VEHICLE_TYPES, VEHICLE_CATEGORIES, VEHICLE_TYPE_LABELS,
  getVehicleTypeLabel, getVehicleCategoryLabel, VehicleType 
} from "@/constants/vehicleTypes";
import { TRANSMISSION_TYPES, TRANSMISSION_TYPE_LABELS } from "@/constants/transmissionTypes";

const getVehicleIcon = (type: VehicleType) => {
  switch (type) {
    case 'car': return Car;
    case 'van': return Truck;
    case 'truck': return Truck;
    case 'motorbike': return Bike;
    case 'atv': return Car;
    case 'snowmobile': return Snowflake;
    case 'camper': return Tent;
    case 'bicycle': return Bike;
    case 'jet_ski': return Waves;
    default: return Car;
  }
};

export interface VehicleFilters {
  yearSort: 'asc' | 'desc' | null;
  fuelTypes: string[];
  passengerCounts: number[];
  vehicleTypes: string[];
  vehicleCategories: string[];
  transmissionTypes: string[];
}

interface VehicleFilterPanelProps {
  filters: VehicleFilters;
  onFiltersChange: (filters: VehicleFilters) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  availableCategories?: string[];
}

const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'hybrid'];
const PASSENGER_COUNTS = [1, 2, 3, 4, 5, 6, 7];

export function VehicleFilterPanel({ filters, onFiltersChange, isOpen, onOpenChange, trigger, availableCategories = [] }: VehicleFilterPanelProps) {
  const { language } = useLanguage();
  const { t } = useTranslation(['fleet', 'common']);
  

  const customCategories = useMemo(() => {
    const standardCats = new Set(VEHICLE_TYPES.flatMap(type => VEHICLE_CATEGORIES[type].map(c => c.value)));
    return availableCategories.filter(cat => !standardCats.has(cat) && cat !== 'atv');
  }, [availableCategories]);

  const displayCategories = useMemo(() => {
    const cats: { value: string; label: string; isCustom: boolean }[] = [];
    customCategories.forEach(cat => { cats.push({ value: cat, label: getVehicleCategoryLabel(cat, language), isCustom: true }); });
    if (filters.vehicleTypes.length === 0) {
      VEHICLE_TYPES.forEach(type => { VEHICLE_CATEGORIES[type].forEach(cat => { cats.push({ value: cat.value, label: t(`fleet:category_${cat.value}`, cat.label.en), isCustom: false }); }); });
    } else {
      filters.vehicleTypes.forEach(type => { const typeCats = VEHICLE_CATEGORIES[type as VehicleType] || []; typeCats.forEach(cat => { cats.push({ value: cat.value, label: t(`fleet:category_${cat.value}`, cat.label.en), isCustom: false }); }); });
    }
    return cats;
  }, [filters.vehicleTypes, customCategories, language, t]);

  const handleYearSortChange = (sort: 'asc' | 'desc' | null) => { onFiltersChange({ ...filters, yearSort: filters.yearSort === sort ? null : sort }); };
  const handleFuelTypeToggle = (fuelType: string) => { const newFuelTypes = filters.fuelTypes.includes(fuelType) ? filters.fuelTypes.filter(f => f !== fuelType) : [...filters.fuelTypes, fuelType]; onFiltersChange({ ...filters, fuelTypes: newFuelTypes }); };
  const handlePassengerCountToggle = (count: number) => { const newCounts = filters.passengerCounts.includes(count) ? filters.passengerCounts.filter(c => c !== count) : [...filters.passengerCounts, count]; onFiltersChange({ ...filters, passengerCounts: newCounts }); };
  const handleVehicleTypeToggle = (type: string) => { const newTypes = filters.vehicleTypes.includes(type) ? filters.vehicleTypes.filter(t => t !== type) : [...filters.vehicleTypes, type]; onFiltersChange({ ...filters, vehicleTypes: newTypes, vehicleCategories: [] }); };
  const handleCategoryChange = (category: string) => { if (category === 'all') { onFiltersChange({ ...filters, vehicleCategories: [] }); } else { const newCategories = filters.vehicleCategories.includes(category) ? filters.vehicleCategories.filter(c => c !== category) : [...filters.vehicleCategories, category]; onFiltersChange({ ...filters, vehicleCategories: newCategories }); } };
  const handleTransmissionTypeToggle = (transmissionType: string) => { const newTransmissionTypes = filters.transmissionTypes.includes(transmissionType) ? filters.transmissionTypes.filter(t => t !== transmissionType) : [...filters.transmissionTypes, transmissionType]; onFiltersChange({ ...filters, transmissionTypes: newTransmissionTypes }); };
  const clearFilters = () => { onFiltersChange({ yearSort: null, fuelTypes: [], passengerCounts: [], vehicleTypes: [], vehicleCategories: [], transmissionTypes: [] }); };
  const hasActiveFilters = filters.yearSort !== null || filters.fuelTypes.length > 0 || filters.passengerCounts.length > 0 || filters.vehicleTypes.length > 0 || filters.vehicleCategories.length > 0 || filters.transmissionTypes.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{t('common:filters')}</h4>
            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto py-1 px-2 text-xs text-muted-foreground">{t('common:clear')}</Button>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('fleet:vehicleType')}</Label>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.map(type => {
                const IconComponent = getVehicleIcon(type);
                return <Button key={type} variant={filters.vehicleTypes.includes(type) ? 'default' : 'outline'} size="sm" onClick={() => handleVehicleTypeToggle(type)} className="text-xs h-8 px-2">
                  <IconComponent className="h-3 w-3 mr-1" />
                  {t(`fleet:vehicleType_${type}`)}
                </Button>;
              })}
            </div>
          </div>

          {displayCategories.length > 0 && <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('fleet:category')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {displayCategories.slice(0, 8).map(cat => (
                <Button key={cat.value} variant={filters.vehicleCategories.includes(cat.value) ? 'default' : 'outline'} size="sm" onClick={() => handleCategoryChange(cat.value)} className={`text-xs h-7 px-2 ${cat.isCustom ? 'border-dashed' : ''}`}>{cat.label}</Button>
              ))}
            </div>
            {displayCategories.length > 8 && <Select value="" onValueChange={(value) => handleCategoryChange(value)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t('fleet:more')} /></SelectTrigger>
              <SelectContent>{displayCategories.slice(8).map(cat => <SelectItem key={cat.value} value={cat.value} className="text-xs">{cat.label}</SelectItem>)}</SelectContent>
            </Select>}
          </div>}

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('fleet:year')}</Label>
            <div className="flex gap-2">
              <Button variant={filters.yearSort === 'desc' ? 'default' : 'outline'} size="sm" onClick={() => handleYearSortChange('desc')} className="flex-1 text-xs h-8">
                <ChevronDown className="h-3 w-3 mr-1" />{t('fleet:newest')}
              </Button>
              <Button variant={filters.yearSort === 'asc' ? 'default' : 'outline'} size="sm" onClick={() => handleYearSortChange('asc')} className="flex-1 text-xs h-8">
                <ChevronUp className="h-3 w-3 mr-1" />{t('fleet:oldest')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('fleet:fuelType')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {FUEL_TYPES.map(fuelType => (
                <label key={fuelType} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={filters.fuelTypes.includes(fuelType)} onCheckedChange={() => handleFuelTypeToggle(fuelType)} />
                  <span>{t(`fleet:${fuelType}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('fleet:transmission')}</Label>
            <div className="flex gap-2">
              {TRANSMISSION_TYPES.map(tt => (
                <Button key={tt} variant={filters.transmissionTypes.includes(tt) ? 'default' : 'outline'} size="sm" onClick={() => handleTransmissionTypeToggle(tt)} className="flex-1 text-xs h-8">
                  {TRANSMISSION_TYPE_LABELS[tt][langKey]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('fleet:numberOfPeople')}</Label>
            <div className="flex flex-wrap gap-2">
              {PASSENGER_COUNTS.map(count => (
                <Button key={count} variant={filters.passengerCounts.includes(count) ? 'default' : 'outline'} size="sm" onClick={() => handlePassengerCountToggle(count)} className="h-8 min-w-[2.5rem] text-xs">
                  {count === 7 ? '7+' : count}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
