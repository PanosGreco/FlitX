import { Car, Calendar, AlertTriangle, Wrench, Fuel, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { ComputedStatus } from "@/hooks/useVehicleStatus";
import { getVehicleCategoryLabel } from "@/constants/vehicleTypes";
import { getTransmissionTypeLabel } from "@/constants/transmissionTypes";

const FUEL_TYPE_LABELS: Record<string, { en: string; el: string }> = {
  petrol: { en: "Petrol", el: "Βενζίνη" },
  diesel: { en: "Diesel", el: "Diesel" },
  electric: { en: "Electric", el: "Ηλεκτρικό" },
  hybrid: { en: "Hybrid", el: "Υβριδικό" },
};

const getFuelTypeLabel = (fuelType: string, lang: string) => {
  return FUEL_TYPE_LABELS[fuelType]?.[lang === 'el' ? 'el' : 'en'] || fuelType;
};
export interface VehicleData {
  id: string;
  make: string;
  model: string;
  year: number;
  type: string;
  mileage: number;
  image?: string;
  status: 'available' | 'rented' | 'maintenance' | 'repair';
  licensePlate: string;
  dailyRate: number;
  rented_until?: string;
  fuelType?: string;
  passengerCapacity?: number;
  transmissionType?: string;
  vehicleType?: string;
  is_sold?: boolean;
  sale_price?: number;
  sale_date?: string;
}
interface VehicleCardProps {
  vehicle: VehicleData;
  computedStatus?: ComputedStatus;
}
export function VehicleCard({
  vehicle,
  computedStatus
}: VehicleCardProps) {
  const {
    t,
    language
  } = useLanguage();

  // Use computed status if provided, otherwise fall back to stored status
  const displayStatus = computedStatus || vehicle.status;
  const statusColors = {
    available: "bg-green-100 text-green-800 border-green-200",
    rented: "bg-red-100 text-red-800 border-red-200",
    maintenance: "bg-orange-100 text-orange-800 border-orange-200",
    repair: "bg-orange-100 text-orange-800 border-orange-200"
  };
  const statusLabels = {
    available: t.available,
    rented: t.rented,
    maintenance: t.maintenance,
    repair: t.repair
  };
  const statusIcons = {
    repair: <AlertTriangle className="h-3.5 w-3.5 mr-1" />,
    maintenance: <Wrench className="h-3.5 w-3.5 mr-1" />
  };
  return <Link to={`/vehicle/${vehicle.id}`} className="block bg-white rounded-lg shadow-card overflow-hidden transition-all hover:shadow-md active:shadow-sm focus:outline-none focus:ring-2 focus:ring-flitx-blue-200">
      <div className="relative">
        {vehicle.image ? <img src={vehicle.image} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} className={cn("h-40 w-full object-scale-down", vehicle.is_sold && "opacity-60")} /> : <div className={cn("h-40 w-full bg-flitx-gray-100 flex items-center justify-center", vehicle.is_sold && "opacity-60")}>
            <Car className="h-16 w-16 text-flitx-gray-300" />
          </div>}
        
        {vehicle.is_sold ? (
          <Badge className="absolute top-3 right-3 bg-red-600 text-white border-red-700 font-bold" variant="outline">
            {language === 'el' ? 'ΠΩΛΗΘΗΚΕ' : 'SOLD'}
          </Badge>
        ) : (
          <Badge className={cn("absolute top-3 right-3 flex items-center", statusColors[displayStatus])} variant="outline">
            {statusIcons[displayStatus as keyof typeof statusIcons]}
            {statusLabels[displayStatus]}
          </Badge>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-balance">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>
        
        <div className="mt-1 text-sm text-flitx-gray-500">
          {getVehicleCategoryLabel(vehicle.type, language)} • {vehicle.licensePlate}
          {vehicle.fuelType ? ` • ${getFuelTypeLabel(vehicle.fuelType, language)}` : ''}
          {vehicle.transmissionType ? ` • ${getTransmissionTypeLabel(vehicle.transmissionType, language)}` : ''}
          {vehicle.passengerCapacity ? ` • ${vehicle.passengerCapacity >= 7 ? '7+' : vehicle.passengerCapacity} ${language === 'el' ? 'άτομα' : 'people'}` : ''}
        </div>
        
        {vehicle.is_sold && vehicle.sale_price != null ? (
          <div className="mt-3 text-sm font-medium text-red-600">
            {language === 'el' ? 'Τιμή Πώλησης' : 'Sale Price'}: €{Number(vehicle.sale_price).toLocaleString()}
          </div>
        ) : (
          <div className="mt-3 flex justify-between items-center">
            <div className="text-xs text-flitx-gray-400">
              {vehicle.mileage.toLocaleString()} {language === 'el' ? 'χλμ' : 'km'}
            </div>
            
            <div className="flex items-center text-flitx-blue font-semibold">
              <Calendar className="w-4 h-4 mr-1" />
              <span>€{vehicle.dailyRate}/{t.day}</span>
            </div>
          </div>
        )}
      </div>
    </Link>;
}