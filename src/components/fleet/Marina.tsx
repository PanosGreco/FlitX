
import React, { useState } from 'react';
import { Sailboat, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { BoatData } from '@/lib/boatData';
import { Link } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface MarinaProps {
  boats: BoatData[];
  onAddBoat?: () => void;
}

export function Marina({ boats, onAddBoat }: MarinaProps) {
  const { t } = useLanguage();
  const [hoveredBoat, setHoveredBoat] = useState<string | null>(null);

  const statusColors = {
    available: "bg-green-100 text-green-800 border-green-200",
    rented: "bg-blue-100 text-blue-800 border-blue-200",
    maintenance: "bg-yellow-100 text-yellow-800 border-yellow-200",
    repair: "bg-red-100 text-red-800 border-red-200"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Marina Overview</h1>
        
        <Button
          onClick={onAddBoat}
          className="bg-flitx-blue hover:bg-flitx-blue-600"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          {t.addNewBoat || "Add New Boat"}
        </Button>
      </div>
      
      {boats.length > 0 ? (
        <div className="relative bg-blue-50 border-2 border-blue-200 rounded-lg p-6 overflow-hidden">
          {/* Marina header */}
          <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white py-2 px-4 flex items-center">
            <Sailboat className="h-5 w-5 mr-2" />
            <h3 className="font-medium">Marina Bay</h3>
          </div>
          
          {/* Water effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-200/30 to-blue-100/10 opacity-50" />
          
          {/* Grid of docks */}
          <div className="relative mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
            {boats.map((boat, index) => (
              <Link
                key={boat.id}
                to={`/vehicle/${boat.id}`}
                className={cn(
                  "relative bg-white rounded-lg transition-all transform hover:-translate-y-1",
                  "border-2",
                  statusColors[boat.status] || "border-gray-200",
                  hoveredBoat === boat.id ? "shadow-lg scale-105 z-10" : "shadow"
                )}
                onMouseEnter={() => setHoveredBoat(boat.id)}
                onMouseLeave={() => setHoveredBoat(null)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-800">{boat.name}</h3>
                    <Badge className={cn(statusColors[boat.status])}>
                      {boat.status}
                    </Badge>
                  </div>
                  
                  <div className="mt-2 flex items-center">
                    <Sailboat className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-sm text-gray-600">
                      {boat.make} {boat.model}
                    </span>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500">
                    {boat.length}ft • Slip #{index + 1}
                  </div>
                  
                  {/* Boat representation */}
                  <div className="mt-2 h-12 flex items-center justify-center">
                    <div className="relative">
                      <svg width="100" height="40" viewBox="0 0 100 40" className="text-blue-800 fill-current">
                        <path d="M20,20 L40,10 L60,10 L80,20 L80,30 L20,30 L20,20 Z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            
            {/* Empty dock spots */}
            {Array.from({ length: Math.max(0, 8 - boats.length) }).map((_, i) => (
              <div 
                key={`empty-${i}`} 
                className="bg-blue-100/50 border-2 border-dashed border-blue-200 rounded-lg p-4 flex flex-col items-center justify-center min-h-[140px]"
                onClick={onAddBoat}
              >
                <div className="text-blue-400 flex flex-col items-center cursor-pointer">
                  <PlusCircle className="h-8 w-8 mb-2" />
                  <span className="text-sm font-medium">Empty Slip</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Marina footer */}
          <div className="absolute bottom-0 left-0 right-0 bg-blue-100 h-2" />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-10 text-center">
          <Sailboat className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-medium mb-2">{t.noBoats || "No boats in your marina"}</h3>
          <p className="text-gray-500 mb-6">
            {t.noBoatsDesc || "Add your first boat to start managing your fleet"}
          </p>
          <Button onClick={onAddBoat} className="bg-flitx-blue hover:bg-flitx-blue-600">
            <PlusCircle className="h-4 w-4 mr-2" />
            {t.addYourFirstBoat || "Add Your First Boat"}
          </Button>
        </div>
      )}
    </div>
  );
}
