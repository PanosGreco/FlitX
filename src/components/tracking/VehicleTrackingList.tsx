
import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Car } from "lucide-react";

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

interface VehicleTrackingListProps {
  vehicles: Vehicle[];
  selectedVehicle: string | null;
  onSelectVehicle: (id: string | null) => void;
  onDragStart?: (vehicleId: string) => void;
}

export function VehicleTrackingList({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  onDragStart
}: VehicleTrackingListProps) {
  return (
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
          onClick={() => onSelectVehicle(vehicle.id)}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", vehicle.id);
            onDragStart && onDragStart(vehicle.id);
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-md overflow-hidden flex items-center justify-center bg-flitx-gray-100">
                {vehicle.image ? (
                  <img
                    src={vehicle.image}
                    alt={vehicle.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Car className="h-5 w-5 text-flitx-gray-500" />
                )}
              </div>

              <div className="ml-3 flex-1">
                <div className="font-medium">{vehicle.name}</div>
                <div className="text-xs text-flitx-gray-400">
                  {vehicle.licensePlate}
                </div>
              </div>
            </div>

            <Badge
              variant="outline"
              className={
                vehicle.status === "active"
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-100"
              }
            >
              {vehicle.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="mt-2 flex justify-between text-xs text-flitx-gray-400">
            <span>
              {vehicle.location
                ? "Location available"
                : "No location data"}
            </span>
            <span>{vehicle.lastUpdate}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
