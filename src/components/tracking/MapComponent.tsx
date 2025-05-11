
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

// Use a placeholder API key first, we'll update this with environmental configuration
// Note: This is a public token that can be visible in the client-side code
const MAPBOX_TOKEN = "pk.eyJ1IjoibG92YWJsZS1kZXYiLCJhIjoiY2xwcnB5cGVzMDAxdDJqcG5mZGp3OWR3NCJ9.lRghplAEilD7XsOizdV4Gw";

mapboxgl.accessToken = MAPBOX_TOKEN;

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

interface MapComponentProps {
  selectedVehicle: string | null;
  vehicles: Vehicle[];
  onVehiclePositionUpdate?: (vehicleId: string, lat: number, lng: number) => void;
}

export function MapComponent({ selectedVehicle, vehicles, onVehiclePositionUpdate }: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [0, 0],
        zoom: 2,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      
      map.current.on("load", () => {
        setMapLoaded(true);
      });

      map.current.on("error", () => {
        setError("Could not load the map. Please check your connection.");
      });

      // Enable drop functionality for vehicles
      map.current.on("click", (e) => {
        if (selectedVehicle && onVehiclePositionUpdate) {
          onVehiclePositionUpdate(
            selectedVehicle, 
            e.lngLat.lat, 
            e.lngLat.lng
          );
        }
      });
    } catch (err) {
      setError("Failed to initialize map");
      console.error("Map initialization error:", err);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers when vehicles or selected vehicle changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    Object.values(markers.current).forEach(marker => marker.remove());
    markers.current = {};

    // Add markers for vehicles with locations
    vehicles.forEach(vehicle => {
      if (vehicle.location) {
        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'flex flex-col items-center';
        
        // Create vehicle image element if available
        if (vehicle.image) {
          const img = document.createElement('img');
          img.className = 'w-10 h-10 object-contain rounded-full bg-white p-1 shadow-lg';
          img.src = vehicle.image;
          img.alt = vehicle.name;
          el.appendChild(img);
        } else {
          // Fallback if no image
          const iconDiv = document.createElement('div');
          iconDiv.className = 'w-10 h-10 bg-flitx-blue rounded-full flex items-center justify-center text-white font-bold shadow-lg';
          iconDiv.textContent = vehicle.name.charAt(0);
          el.appendChild(iconDiv);
        }

        // Add label if this is the selected vehicle
        if (vehicle.id === selectedVehicle) {
          const label = document.createElement('div');
          label.className = 'text-xs font-medium bg-flitx-blue text-white px-2 py-1 rounded-md mt-1 shadow-md';
          label.textContent = vehicle.name;
          el.appendChild(label);
        }

        // Create and add the marker
        const marker = new mapboxgl.Marker(el)
          .setLngLat([vehicle.location.lng, vehicle.location.lat])
          .addTo(map.current!);

        markers.current[vehicle.id] = marker;

        // If this is the selected vehicle, center map on it
        if (vehicle.id === selectedVehicle && map.current) {
          map.current.flyTo({
            center: [vehicle.location.lng, vehicle.location.lat],
            zoom: 15,
            essential: true
          });
        }
      }
    });
  }, [vehicles, selectedVehicle, mapLoaded]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] bg-gray-50">
        <div className="text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">Map could not be loaded</h3>
        <p className="text-sm text-flitx-gray-500 text-center max-w-md mb-4">
          {error}
        </p>
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
          API Key Required
        </Badge>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      <div 
        ref={mapContainer} 
        className="h-full w-full"
      />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flitx-blue mb-4"></div>
            <p className="text-flitx-gray-500">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
