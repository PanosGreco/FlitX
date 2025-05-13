
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";

interface Vehicle {
  id: string;
  name: string;
  image?: string;
  licensePlate: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

interface LeafletMapProps {
  selectedVehicle: string | null;
  vehicles: Vehicle[];
  onVehiclePositionUpdate?: (vehicleId: string, lat: number, lng: number) => void;
}

export function LeafletMap({ selectedVehicle, vehicles, onVehiclePositionUpdate }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const mapContainer = useRef<HTMLDivElement>(null);
  
  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    
    // Create map instance
    const map = L.map(mapContainer.current).setView([37.7749, -122.4194], 12);
    
    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    
    // Add click handler for vehicle position updates
    map.on("click", (e) => {
      if (selectedVehicle && onVehiclePositionUpdate) {
        onVehiclePositionUpdate(
          selectedVehicle,
          e.latlng.lat,
          e.latlng.lng
        );
      }
    });
    
    // Store map instance in ref
    mapRef.current = map;
    
    // Cleanup function
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);
  
  // Update markers when vehicles or selected vehicle changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};
    
    // Add markers for vehicles with locations
    vehicles.forEach(vehicle => {
      if (vehicle.location) {
        // Create custom icon based on vehicle
        const isSelected = vehicle.id === selectedVehicle;
        
        // Create a custom icon element using DOM
        const iconHtml = `
          <div class="${isSelected ? 'animate-bounce' : ''}" style="display: flex; flex-direction: column; align-items: center;">
            <div style="
              width: 40px; 
              height: 40px; 
              border-radius: 50%; 
              display: flex; 
              justify-content: center;
              align-items: center;
              background-color: white;
              border: 2px solid ${isSelected ? '#2563eb' : '#d1d5db'};
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              overflow: hidden;
            ">
              ${vehicle.image 
                ? `<img src="${vehicle.image}" alt="${vehicle.name}" style="width: 100%; height: 100%; object-fit: cover;" />`
                : `<div style="
                    background-color: #2563eb; 
                    color: white; 
                    width: 100%; 
                    height: 100%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-weight: bold;
                  ">${vehicle.name.charAt(0)}</div>`
              }
            </div>
            ${isSelected ? `
              <div style="
                background-color: #2563eb; 
                color: white; 
                padding: 2px 6px; 
                border-radius: 4px; 
                font-size: 11px; 
                margin-top: 4px;
                font-weight: 500;
                box-shadow: 0 1px 2px rgba(0,0,0,0.1);
              ">${vehicle.name}</div>` : ''}
          </div>
        `;
        
        // Create icon
        const customIcon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [40, isSelected ? 65 : 40],
          iconAnchor: [20, isSelected ? 65 : 40]
        });
        
        // Create and add marker
        const marker = L.marker(
          [vehicle.location.lat, vehicle.location.lng],
          { icon: customIcon, draggable: false }
        ).addTo(map);
        
        // Add popup with vehicle info
        marker.bindPopup(`
          <strong>${vehicle.name}</strong><br>
          ${vehicle.licensePlate}<br>
          ${vehicle.location.address || "No address information"}
        `);
        
        // Store marker reference
        markersRef.current[vehicle.id] = marker;
        
        // If this is the selected vehicle, center map on it
        if (vehicle.id === selectedVehicle) {
          map.setView([vehicle.location.lat, vehicle.location.lng], 15);
        }
      }
    });
    
    // If we have vehicles with locations but none are selected,
    // fit the map bounds to include all vehicles
    const vehiclesWithLocations = vehicles.filter(v => v.location);
    if (vehiclesWithLocations.length > 0 && !selectedVehicle) {
      const bounds = L.latLngBounds(vehiclesWithLocations.map(v => 
        [v.location!.lat, v.location!.lng]
      ));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [vehicles, selectedVehicle]);
  
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      <div 
        ref={mapContainer} 
        className="h-full w-full z-10"
      />
      
      {selectedVehicle && (
        <div className="absolute top-4 left-4 z-20">
          <Badge variant="outline" className="bg-white shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Click on map to move selected vehicle
          </Badge>
        </div>
      )}
    </div>
  );
}
