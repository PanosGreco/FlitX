
import { Car, Calendar, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

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
  fuelLevel: number;
  dailyRate: number;
}

interface VehicleCardProps {
  vehicle: VehicleData;
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const { t, language } = useLanguage();

  const statusColors = {
    available: "bg-green-100 text-green-800",
    rented: "bg-blue-100 text-blue-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    repair: "bg-red-100 text-red-800"
  };
  
  const statusLabels = {
    available: t.available,
    rented: t.rented,
    maintenance: t.maintenance,
    repair: t.repair
  };
  
  const statusIcons = {
    repair: <AlertTriangle className="h-3.5 w-3.5 mr-1" />
  };

  return (
    <Link 
      to={`/vehicle/${vehicle.id}`} 
      className="block bg-white rounded-lg shadow-card overflow-hidden transition-all hover:shadow-md active:shadow-sm focus:outline-none focus:ring-2 focus:ring-flitx-blue-200"
    >
      <div className="relative">
        {vehicle.image ? (
          <img 
            src={vehicle.image} 
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="h-40 w-full object-cover"
          />
        ) : (
          <div className="h-40 w-full bg-flitx-gray-100 flex items-center justify-center">
            <Car className="h-16 w-16 text-flitx-gray-300" />
          </div>
        )}
        
        <Badge
          className={cn(
            "absolute top-3 right-3 flex items-center",
            statusColors[vehicle.status]
          )}
          variant="outline"
        >
          {statusIcons[vehicle.status as keyof typeof statusIcons]}
          {statusLabels[vehicle.status]}
        </Badge>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-balance">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>
        
        <div className="mt-1 text-sm text-flitx-gray-500">
          {vehicle.type} • {vehicle.licensePlate}
        </div>
        
        <div className="mt-3 flex justify-between items-center">
          <div className="text-xs text-flitx-gray-400">
            {vehicle.mileage.toLocaleString()} {language === 'el' ? 'χλμ' : 'km'}
          </div>
          
          <div className="flex items-center text-flitx-blue font-semibold">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{language === 'el' ? '€' : '$'}{vehicle.dailyRate}/{t.day}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
