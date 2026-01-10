import { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLanguage } from "@/contexts/LanguageContext";

export interface VehicleFilters {
  yearSort: 'asc' | 'desc' | null;
  fuelTypes: string[];
  passengerCounts: number[];
}

interface VehicleFilterPanelProps {
  filters: VehicleFilters;
  onFiltersChange: (filters: VehicleFilters) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
}

const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'hybrid'];
const PASSENGER_COUNTS = [1, 2, 3, 4, 5, 6, 7];

export function VehicleFilterPanel({ 
  filters, 
  onFiltersChange, 
  isOpen, 
  onOpenChange,
  trigger 
}: VehicleFilterPanelProps) {
  const { language } = useLanguage();

  const fuelTypeLabels: Record<string, string> = {
    petrol: language === 'el' ? 'Βενζίνη' : 'Petrol',
    diesel: 'Diesel',
    electric: language === 'el' ? 'Ηλεκτρικό' : 'Electric',
    hybrid: language === 'el' ? 'Υβριδικό' : 'Hybrid',
  };

  const handleYearSortChange = (sort: 'asc' | 'desc' | null) => {
    onFiltersChange({ ...filters, yearSort: filters.yearSort === sort ? null : sort });
  };

  const handleFuelTypeToggle = (fuelType: string) => {
    const newFuelTypes = filters.fuelTypes.includes(fuelType)
      ? filters.fuelTypes.filter(f => f !== fuelType)
      : [...filters.fuelTypes, fuelType];
    onFiltersChange({ ...filters, fuelTypes: newFuelTypes });
  };

  const handlePassengerCountToggle = (count: number) => {
    const newCounts = filters.passengerCounts.includes(count)
      ? filters.passengerCounts.filter(c => c !== count)
      : [...filters.passengerCounts, count];
    onFiltersChange({ ...filters, passengerCounts: newCounts });
  };

  const clearFilters = () => {
    onFiltersChange({ yearSort: null, fuelTypes: [], passengerCounts: [] });
  };

  const hasActiveFilters = filters.yearSort !== null || 
    filters.fuelTypes.length > 0 || 
    filters.passengerCounts.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">
              {language === 'el' ? 'Φίλτρα' : 'Filters'}
            </h4>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-auto py-1 px-2 text-xs text-muted-foreground"
              >
                {language === 'el' ? 'Καθαρισμός' : 'Clear'}
              </Button>
            )}
          </div>

          {/* Year Sort */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {language === 'el' ? 'Έτος' : 'Year'}
            </Label>
            <div className="flex gap-2">
              <Button
                variant={filters.yearSort === 'desc' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleYearSortChange('desc')}
                className="flex-1 text-xs h-8"
              >
                <ChevronDown className="h-3 w-3 mr-1" />
                {language === 'el' ? 'Νεότερα' : 'Newest'}
              </Button>
              <Button
                variant={filters.yearSort === 'asc' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleYearSortChange('asc')}
                className="flex-1 text-xs h-8"
              >
                <ChevronUp className="h-3 w-3 mr-1" />
                {language === 'el' ? 'Παλαιότερα' : 'Oldest'}
              </Button>
            </div>
          </div>

          {/* Fuel Type */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {language === 'el' ? 'Τύπος Καυσίμου' : 'Fuel Type'}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {FUEL_TYPES.map(fuelType => (
                <label
                  key={fuelType}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={filters.fuelTypes.includes(fuelType)}
                    onCheckedChange={() => handleFuelTypeToggle(fuelType)}
                  />
                  <span>{fuelTypeLabels[fuelType]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Passenger Count */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {language === 'el' ? 'Αριθμός Επιβατών' : 'Number of People'}
            </Label>
            <div className="flex flex-wrap gap-2">
              {PASSENGER_COUNTS.map(count => (
                <Button
                  key={count}
                  variant={filters.passengerCounts.includes(count) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePassengerCountToggle(count)}
                  className="h-8 min-w-[2.5rem] text-xs"
                >
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