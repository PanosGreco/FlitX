import { useState, useMemo } from "react";
import { VehicleCard, VehicleData } from "./VehicleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Filter, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useFleetStatuses } from "@/hooks/useVehicleStatus";

interface VehicleGridProps {
  vehicles: VehicleData[];
  onAddVehicle: () => void;
  isLoading?: boolean;
}

export function VehicleGrid({ vehicles, onAddVehicle, isLoading = false }: VehicleGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { t, isLanguageLoading } = useLanguage();
  
  usePageTitle("fleet");

  // Get all vehicle IDs for status computation
  const vehicleIds = useMemo(() => vehicles.map(v => v.id), [vehicles]);
  
  // Compute statuses for all vehicles based on calendar data
  const { statuses: computedStatuses, isLoading: statusesLoading } = useFleetStatuses(vehicleIds);
  
  const filteredVehicles = vehicles.filter((vehicle) => {
    const searchTerms = searchQuery.toLowerCase().trim().split(" ");
    const vehicleText = `${vehicle.make} ${vehicle.model} ${vehicle.year} ${vehicle.licensePlate}`.toLowerCase();
    
    return searchTerms.every((term) => vehicleText.includes(term));
  });

  const showLoading = isLoading || statusesLoading;

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
        <Button 
          variant="outline" 
          size="icon" 
          aria-label="Filter"
          disabled={isLanguageLoading || showLoading}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>
      
      {showLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredVehicles.length > 0 ? (
            filteredVehicles.map((vehicle) => (
              <VehicleCard 
                key={vehicle.id} 
                vehicle={vehicle} 
                computedStatus={computedStatuses.get(vehicle.id)}
              />
            ))
          ) : (
            <div className="col-span-full py-8 text-center text-muted-foreground">
              {searchQuery ? (
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
