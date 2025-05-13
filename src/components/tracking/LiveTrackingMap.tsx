
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
  Filter, 
  AlertTriangle 
} from "lucide-react";
import { LeafletMap } from "./LeafletMap";
import { VehicleTrackingList } from "./VehicleTrackingList";
import { updateVehicleLocation, getLatestVehicleLocation } from "@/services/vehicleTrackingService";
import { supabase } from "@/integrations/supabase/client";
import { sampleVehicles } from "@/lib/data";

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
  
  // Fetch vehicles and their last known locations
  useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      
      try {
        // Try to get vehicles from Supabase
        const { data: supabaseVehicles, error } = await supabase
          .from('vehicles')
          .select('*');

        if (error) throw error;

        // Process vehicles and fetch their locations
        const processedVehicles = await Promise.all((supabaseVehicles || []).map(async (vehicle) => {
          // Get latest location from the tracking table
          const locationData = await getLatestVehicleLocation(vehicle.id);
          
          return {
            id: vehicle.id,
            name: `${vehicle.make} ${vehicle.model}`,
            licensePlate: vehicle.license_plate,
            status: vehicle.status || 'inactive',
            lastUpdate: locationData ? 
              new Date(locationData.timestamp).toLocaleString() : 
              'No data',
            image: vehicle.image_url,
            location: locationData ? {
              lat: parseFloat(locationData.latitude),
              lng: parseFloat(locationData.longitude),
              address: "Last recorded location"
            } : undefined
          };
        }));
        
        // If we have vehicles from Supabase, use them
        if (processedVehicles.length > 0) {
          setVehicles(processedVehicles);
        } else {
          // Otherwise, fall back to sample data
          const sampleData = sampleVehicles.map(v => ({
            id: v.id,
            name: `${v.make} ${v.model}`,
            licensePlate: v.licensePlate,
            status: Math.random() > 0.3 ? 'active' : 'inactive',
            lastUpdate: '2 min ago',
            image: v.image,
            location: Math.random() > 0.3 ? {
              // Generate random locations around Athens, Greece for demo
              lat: 37.9838 + (Math.random() - 0.5) * 0.1,
              lng: 23.7275 + (Math.random() - 0.5) * 0.1,
              address: "123 Example St, Athens, Greece"
            } : undefined
          }));
          
          setVehicles(sampleData);
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        
        // Fall back to sample data on error with Athens coordinates
        const sampleData = sampleVehicles.map(v => ({
          id: v.id,
          name: `${v.make} ${v.model}`,
          licensePlate: v.licensePlate,
          status: Math.random() > 0.3 ? 'active' : 'inactive',
          lastUpdate: '2 min ago',
          image: v.image,
          location: Math.random() > 0.3 ? {
            lat: 37.9838 + (Math.random() - 0.5) * 0.1,
            lng: 23.7275 + (Math.random() - 0.5) * 0.1,
            address: "123 Example St, Athens, Greece"
          } : undefined
        }));
        
        setVehicles(sampleData);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  // Handle updating vehicle position (when dropped on map)
  const handleVehiclePositionUpdate = async (vehicleId: string, lat: number, lng: number) => {
    // Find the vehicle to update
    const vehicleToUpdate = vehicles.find(v => v.id === vehicleId);
    if (!vehicleToUpdate) return;
    
    // Update the location in our local state
    const updatedVehicles = vehicles.map(v => {
      if (v.id === vehicleId) {
        return {
          ...v,
          location: {
            lat,
            lng,
            address: "Updated location"
          },
          lastUpdate: 'Just now'
        };
      }
      return v;
    });
    
    setVehicles(updatedVehicles);
    
    // Save to Supabase
    try {
      await updateVehicleLocation({
        vehicle_id: vehicleId,
        latitude: lat,
        longitude: lng
      });
    } catch (error) {
      console.error('Failed to update vehicle location in database', error);
      // We could add a toast notification here in the future
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
          
          <Button className="bg-flitx-blue hover:bg-flitx-blue-600">
            <Plus className="h-4 w-4 mr-2" />
            Add GPS Device
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Vehicle List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Vehicles</CardTitle>
          </CardHeader>
          <CardContent className="px-2 py-0">
            {loading ? (
              <div className="flex flex-col items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-flitx-blue mb-4"></div>
                <p className="text-flitx-gray-500">Loading vehicles...</p>
              </div>
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
        
        {/* Map Area */}
        <Card className="lg:col-span-3 h-[60vh]">
          <CardContent className="p-0 rounded-lg overflow-hidden h-full">
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center h-full bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flitx-blue mb-4"></div>
                <p className="text-flitx-gray-500">Loading map components...</p>
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
