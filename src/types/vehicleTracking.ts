
export interface VehicleLocation {
  id?: string;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp?: string;
}

export interface TrackableVehicle {
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
