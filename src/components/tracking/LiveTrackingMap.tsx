
import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Map, 
  Plus, 
  Filter, 
  AlertTriangle, 
  Car,
  Crosshair 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Vehicle {
  id: string;
  name: string;
  licensePlate: string;
  status: string;
  lastUpdate: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
}

export function LiveTrackingMap() {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [mapError, setMapError] = useState<boolean>(false);
  
  const vehicles: Vehicle[] = [
    {
      id: "1",
      name: "Toyota Corolla",
      licensePlate: "ABC-1234",
      status: "active",
      lastUpdate: "2 min ago",
      location: {
        lat: 37.7749,
        lng: -122.4194,
        address: "123 Market St, San Francisco, CA"
      }
    },
    {
      id: "2",
      name: "Fiat Panda",
      licensePlate: "XYZ-5678",
      status: "inactive",
      lastUpdate: "3 hours ago",
      location: {
        lat: 37.7833,
        lng: -122.4167,
        address: "456 Mission St, San Francisco, CA"
      }
    },
    {
      id: "3",
      name: "Honda Civic",
      licensePlate: "DEF-9012",
      status: "active",
      lastUpdate: "5 min ago",
      location: {
        lat: 37.7694,
        lng: -122.4862,
        address: "789 Golden Gate Ave, San Francisco, CA"
      }
    }
  ];

  useEffect(() => {
    // Simulate map loading failure to show error state
    const timer = setTimeout(() => {
      setMapError(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

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
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {vehicles.map((vehicle) => (
                <div 
                  key={vehicle.id}
                  className={cn(
                    "p-3 rounded-md cursor-pointer transition-colors",
                    selectedVehicle === vehicle.id 
                      ? "bg-flitx-blue-50" 
                      : "hover:bg-gray-50"
                  )}
                  onClick={() => setSelectedVehicle(vehicle.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-flitx-gray-100 p-2 rounded">
                        <Car className="h-4 w-4 text-flitx-gray-500" />
                      </div>
                      
                      <div className="ml-3">
                        <div className="font-medium">{vehicle.name}</div>
                        <div className="text-xs text-flitx-gray-400">
                          {vehicle.licensePlate}
                        </div>
                      </div>
                    </div>
                    
                    <Badge variant="outline" className={
                      vehicle.status === "active" 
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                    }>
                      {vehicle.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  
                  <div className="mt-2 flex justify-between text-xs text-flitx-gray-400">
                    <span>Last updated: {vehicle.lastUpdate}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Map Area */}
        <Card className="lg:col-span-3">
          <CardContent className="p-0 rounded-lg overflow-hidden">
            {mapError ? (
              <div className="flex flex-col items-center justify-center h-[60vh] bg-gray-50">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">Map could not be loaded</h3>
                <p className="text-sm text-flitx-gray-500 text-center max-w-md mb-4">
                  To view live vehicle tracking, please connect a Mapbox API key or other map provider.
                </p>
                <Button 
                  className="bg-flitx-blue hover:bg-flitx-blue-600"
                >
                  Connect Map API
                </Button>
              </div>
            ) : (
              <div className="relative h-[60vh] flex items-center justify-center bg-flitx-gray-100">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Crosshair className="h-8 w-8 text-flitx-gray-400" />
                </div>
                <Map className="h-12 w-12 text-flitx-gray-300 mb-3" />
                <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-lg shadow-md">
                  {selectedVehicle ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">
                          {vehicles.find(v => v.id === selectedVehicle)?.name}
                        </div>
                        <Badge variant="outline" className={
                          vehicles.find(v => v.id === selectedVehicle)?.status === "active"
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                        }>
                          {vehicles.find(v => v.id === selectedVehicle)?.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-sm text-flitx-gray-500">
                        {vehicles.find(v => v.id === selectedVehicle)?.location?.address}
                      </div>
                      <div className="flex justify-between items-center text-xs text-flitx-gray-400">
                        <span>Last updated: {vehicles.find(v => v.id === selectedVehicle)?.lastUpdate}</span>
                        <button className="text-flitx-blue hover:underline">Get Directions</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-flitx-gray-500">
                      Select a vehicle to view its location
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
