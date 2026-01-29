import { useState, useMemo } from "react";
import { VehicleCard, VehicleData } from "./VehicleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Filter, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useFleetStatuses } from "@/hooks/useVehicleStatus";
import { VehicleFilterPanel, VehicleFilters } from "./VehicleFilterPanel";
import { Badge } from "@/components/ui/badge";

interface VehicleGridProps {
  vehicles: VehicleData[];
  onAddVehicle: () => void;
  isLoading?: boolean;
}

export function VehicleGrid({ vehicles, onAddVehicle, isLoading = false }: VehicleGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<VehicleFilters>({
    yearSort: null,
    fuelTypes: [],
    passengerCounts: [],
    vehicleTypes: [],
    vehicleCategories: [],
    transmissionTypes: [],
  });
  const { t, language, isLanguageLoading } = useLanguage();
  
  usePageTitle("fleet");

  // Get all vehicle IDs for status computation
  const vehicleIds = useMemo(() => vehicles.map(v => v.id), [vehicles]);
  
  // Compute statuses for all vehicles based on calendar data
  const { statuses: computedStatuses, isLoading: statusesLoading } = useFleetStatuses(vehicleIds);
  
  // Get all unique categories from vehicles for filter panel
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    vehicles.forEach(v => {
      if (v.type) cats.add(v.type);
    });
    return Array.from(cats);
  }, [vehicles]);

  const filteredAndSortedVehicles = useMemo(() => {
    // First filter by search
    let result = vehicles.filter((vehicle) => {
      const searchTerms = searchQuery.toLowerCase().trim().split(" ");
      const vehicleText = `${vehicle.make} ${vehicle.model} ${vehicle.year} ${vehicle.licensePlate}`.toLowerCase();
      return searchTerms.every((term) => vehicleText.includes(term));
    });

    // Filter by vehicle type (car, motorbike, atv)
    if (filters.vehicleTypes.length > 0) {
      result = result.filter(v => {
        const vehicleType = (v as any).vehicle_type || 'car';
        return filters.vehicleTypes.includes(vehicleType);
      });
    }

    // Filter by vehicle category
    if (filters.vehicleCategories.length > 0) {
      result = result.filter(v => {
        const category = v.type?.toLowerCase() || '';
        return filters.vehicleCategories.some(c => c.toLowerCase() === category);
      });
    }

    // Filter by fuel type
    if (filters.fuelTypes.length > 0) {
      result = result.filter(v => v.fuelType && filters.fuelTypes.includes(v.fuelType));
    }

    // Filter by transmission type
    if (filters.transmissionTypes.length > 0) {
      result = result.filter(v => {
        const transmissionType = v.transmissionType || 'manual';
        return filters.transmissionTypes.includes(transmissionType);
      });
    }

    // Filter by passenger count
    if (filters.passengerCounts.length > 0) {
      result = result.filter(v => {
        if (!v.passengerCapacity) return false;
        if (filters.passengerCounts.includes(7) && v.passengerCapacity >= 7) {
          return true;
        }
        return filters.passengerCounts.includes(v.passengerCapacity);
      });
    }

    // Sort by year
    if (filters.yearSort) {
      result = [...result].sort((a, b) => 
        filters.yearSort === 'asc' ? a.year - b.year : b.year - a.year
      );
    }

    return result;
  }, [vehicles, searchQuery, filters]);

  const showLoading = isLoading || statusesLoading;

  const activeFilterCount = 
    (filters.yearSort ? 1 : 0) + 
    filters.fuelTypes.length + 
    filters.passengerCounts.length +
    filters.vehicleTypes.length +
    filters.vehicleCategories.length +
    filters.transmissionTypes.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t.fleet}</h1>
        
        <Button 
          onClick={onAddVehicle}
          disabled={isLanguageLoading}
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          {t.addVehicle}
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t.searchVehicles}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            disabled={isLanguageLoading || showLoading}
          />
        </div>
        <VehicleFilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          isOpen={isFilterOpen}
          onOpenChange={setIsFilterOpen}
          availableCategories={availableCategories}
          trigger={
            <Button 
              variant="outline" 
              size="icon" 
              aria-label="Filter"
              disabled={isLanguageLoading || showLoading}
              className="relative"
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <Badge 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  variant="default"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          }
        />
      </div>
      
      {showLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredAndSortedVehicles.length > 0 ? (
            filteredAndSortedVehicles.map((vehicle) => (
              <VehicleCard 
                key={vehicle.id} 
                vehicle={vehicle} 
                computedStatus={computedStatuses.get(vehicle.id)}
              />
            ))
          ) : (
            <div className="col-span-full py-8 text-center text-muted-foreground">
              {searchQuery || activeFilterCount > 0 ? (
                <p>{t.noSearchResults}</p>
              ) : (
                <p>{t.noVehicles}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}