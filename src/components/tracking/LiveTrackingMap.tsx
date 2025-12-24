import { useState, useEffect, Suspense } from "react";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Filter
} from "lucide-react";
import { LeafletMap } from "./LeafletMap";
import { VehicleTrackingList } from "./VehicleTrackingList";
import { updateVehicleLocation } from "@/services/vehicleTrackingService";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Vehicle {
  id: string;
  name: string;
  licensePlate: string;
  status: string;
  lastUpdate: string;
  image?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

export function LiveTrackingMap() {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    const fetchVehicles = async () => {
      setLoading(true);
      
      try {
        const { data: supabaseVehicles, error } = await supabase
          .from('vehicles')
          .select('*');

        if (error) throw error;

        const processedVehicles = (supabaseVehicles || []).map((vehicle) => ({
          id: vehicle.id,
          name: `${vehicle.make} ${vehicle.model}`,
          licensePlate: vehicle.license_plate || 'N/A',
          status: vehicle.status || 'inactive',
          lastUpdate: 'No tracking data',
          image: vehicle.image,
          location: {
            lat: 37.9838 + (Math.random() - 0.5) * 0.1,
            lng: 23.7275 + (Math.random() - 0.5) * 0.1,
            address: "Demo location"
          }
        }));
        
        setVehicles(processedVehicles);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [user]);

  const handleVehiclePositionUpdate = async (vehicleId: string, lat: number, lng: number) => {
    const vehicleToUpdate = vehicles.find(v => v.id === vehicleId);
    if (!vehicleToUpdate) return;
    
    const updatedVehicles = vehicles.map(v => {
      if (v.id === vehicleId) {
        return {
          ...v,
          location: { lat, lng, address: "Updated location" },
          lastUpdate: 'Just now'
        };
      }
      return v;
    });
    
    setVehicles(updatedVehicles);
    
    try {
      await updateVehicleLocation({
        vehicle_id: vehicleId,
        latitude: lat,
        longitude: lng
      });
    } catch (error) {
      console.error('Failed to update vehicle location', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Live Tracking</h1>
        
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add GPS Device
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Vehicles</CardTitle>
          </CardHeader>
          <CardContent className="px-2 py-0">
            {loading ? (
              <div className="flex flex-col items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Loading vehicles...</p>
              </div>
            ) : vehicles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No vehicles found</p>
            ) : (
              <VehicleTrackingList
                vehicles={vehicles}
                selectedVehicle={selectedVehicle}
                onSelectVehicle={setSelectedVehicle}
                onDragStart={(id) => setSelectedVehicle(id)}
              />
            )}
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 h-[60vh]">
          <CardContent className="p-0 rounded-lg overflow-hidden h-full">
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center h-full bg-muted">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Loading map...</p>
              </div>
            }>
              <LeafletMap 
                selectedVehicle={selectedVehicle}
                vehicles={vehicles}
                onVehiclePositionUpdate={handleVehiclePositionUpdate}
              />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
