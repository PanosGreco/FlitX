
import { Sailboat, Calendar, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { BoatData } from "@/lib/boatData";

interface BoatCardProps {
  boat: BoatData;
}

export function BoatCard({ boat }: BoatCardProps) {
  const { t } = useLanguage();

  const statusColors = {
    available: "bg-green-100 text-green-800",
    rented: "bg-blue-100 text-blue-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    repair: "bg-red-100 text-red-800"
  };
  
  const statusLabels = {
    available: t.available || "Available",
    rented: t.rented || "Rented Out",
    maintenance: t.maintenance || "Maintenance",
    repair: t.repair || "Needs Repair"
  };
  
  const statusIcons = {
    repair: <AlertTriangle className="h-3.5 w-3.5 mr-1" />
  };

  return (
    <Link 
      to={`/vehicle/${boat.id}`} 
      className="block bg-white rounded-lg shadow-card overflow-hidden transition-all hover:shadow-md active:shadow-sm focus:outline-none focus:ring-2 focus:ring-flitx-blue-200"
    >
      <div className="relative">
        {boat.image ? (
          <img 
            src={boat.image} 
            alt={`${boat.year} ${boat.make} ${boat.model}`}
            className="h-40 w-full object-cover"
          />
        ) : (
          <div className="h-40 w-full bg-flitx-gray-100 flex items-center justify-center">
            <Sailboat className="h-16 w-16 text-flitx-gray-300" />
          </div>
        )}
        
        <Badge
          className={cn(
            "absolute top-3 right-3 flex items-center",
            statusColors[boat.status]
          )}
          variant="outline"
        >
          {statusIcons[boat.status as keyof typeof statusIcons]}
          {statusLabels[boat.status]}
        </Badge>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-balance">
          {boat.name} - {boat.year} {boat.make} {boat.model}
        </h3>
        
        <div className="mt-1 text-sm text-flitx-gray-500">
          {boat.type} • {boat.length}ft • {boat.capacity} people
        </div>
        
        <div className="mt-3 flex justify-between items-center">
          <div className="text-xs text-flitx-gray-400">
            {boat.engineHours} engine hours
          </div>
          
          <div className="flex items-center text-flitx-blue font-semibold">
            <Calendar className="w-4 h-4 mr-1" />
            <span>${boat.dailyRate}/day</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
