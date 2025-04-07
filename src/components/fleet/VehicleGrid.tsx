
import { useState } from "react";
import { VehicleCard, VehicleData } from "./VehicleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Filter } from "lucide-react";

interface VehicleGridProps {
  vehicles: VehicleData[];
  onAddVehicle: () => void;
}

export function VehicleGrid({ vehicles, onAddVehicle }: VehicleGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredVehicles = vehicles.filter((vehicle) => {
    const searchTerms = searchQuery.toLowerCase().trim().split(" ");
    const vehicleText = `${vehicle.make} ${vehicle.model} ${vehicle.year} ${vehicle.licensePlate}`.toLowerCase();
    
    return searchTerms.every((term) => vehicleText.includes(term));
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Fleet</h1>
        
        <Button 
          onClick={onAddVehicle}
          className="bg-flitx-blue hover:bg-flitx-blue-600"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-flitx-gray-400 h-4 w-4" />
          <Input
            placeholder="Search vehicles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" aria-label="Filter">
          <Filter className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredVehicles.length > 0 ? (
          filteredVehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))
        ) : (
          <div className="col-span-full py-8 text-center text-flitx-gray-500">
            {searchQuery ? (
              <p>No vehicles match your search criteria.</p>
            ) : (
              <p>No vehicles found. Add your first vehicle to get started.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
