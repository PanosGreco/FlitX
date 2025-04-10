
import React, { useState } from 'react';
import { Sailboat, PlusCircle, MapPin, Anchor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { BoatData } from '@/lib/boatData';
import { Link } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";

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

  // Group boats by marina sections
  const marinaSection = {
    sectionA: boats.filter((_, i) => i % 5 === 0),
    sectionB: boats.filter((_, i) => i % 5 === 1),
    sectionC: boats.filter((_, i) => i % 5 === 2),
    sectionD: boats.filter((_, i) => i % 5 === 3),
    sectionE: boats.filter((_, i) => i % 5 === 4),
  };

  // Render boat icon with appropriate styling based on status
  const renderBoatIcon = (boat: BoatData, sectionIndex: number) => {
    const statusColor = boat.status === 'available' ? 'text-green-600' : 
                        boat.status === 'rented' ? 'text-blue-600' :
                        boat.status === 'maintenance' ? 'text-yellow-600' : 'text-red-600';
    
    return (
      <Link
        key={boat.id}
        to={`/vehicle/${boat.id}`}
        className={cn(
          "group relative flex flex-col items-center transition-all duration-200",
          hoveredBoat === boat.id ? "scale-110 z-10" : ""
        )}
        onMouseEnter={() => setHoveredBoat(boat.id)}
        onMouseLeave={() => setHoveredBoat(null)}
      >
        <div className={cn(
          "relative",
          statusColor
        )}>
          <div className="rotate-90">
            <svg width="40" height="20" viewBox="0 0 100 50" className="fill-current">
              <path d="M10,25 L25,10 L75,10 L90,25 L75,40 L25,40 Z" />
            </svg>
          </div>
          
          {boat.status === 'maintenance' && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
          )}
          {boat.status === 'repair' && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
        
        <span className="text-xs font-medium mt-1 max-w-16 text-center leading-tight text-balance">
          {boat.name}
        </span>
        
        {hoveredBoat === boat.id && (
          <div className="absolute -bottom-16 bg-white rounded-md shadow-lg p-2 w-36 z-20">
            <p className="text-xs font-semibold">{boat.make} {boat.model}</p>
            <p className="text-xs">{boat.length}ft • Slip #{sectionIndex}</p>
            <Badge className={cn(
              "mt-1 text-xs w-full justify-center",
              statusColors[boat.status]
            )}>
              {boat.status}
            </Badge>
          </div>
        )}
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.marinaOverview || "Marina Overview"}</h1>
        
        <Button
          onClick={onAddBoat}
          className="bg-flitx-blue hover:bg-flitx-blue-600"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          {t.addNewBoat || "Add New Boat"}
        </Button>
      </div>
      
      {boats.length > 0 ? (
        <Card className="overflow-hidden border-2 border-blue-200">
          <CardContent className="p-0">
            <div className="w-full relative bg-gradient-to-b from-blue-200 to-blue-400">
              {/* Marina Header */}
              <div className="bg-blue-700 text-white py-2 px-4 flex items-center">
                <Anchor className="h-5 w-5 mr-2" />
                <h3 className="font-medium">Marina Bay</h3>
              </div>
              
              {/* Main Marina Area */}
              <div className="relative p-8 bg-[url('public/lovable-uploads/63c57374-db37-4424-af53-823ff6974e5f.png')] bg-cover bg-center min-h-[420px]">
                {/* Docks and Sections */}
                <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left side docks */}
                  <div className="relative flex flex-col justify-around">
                    <div className="marina-section">
                      <div className="bg-gray-700 w-full h-2 mb-1"></div>
                      <div className="flex justify-around">
                        {marinaSection.sectionA.map((boat, i) => renderBoatIcon(boat, i + 1))}
                      </div>
                      <div className="bg-blue-900/20 backdrop-blur-sm rounded px-2 py-1 text-xs text-white font-bold absolute -top-6 left-0">
                        <MapPin className="h-3 w-3 inline mr-1" /> Section A
                      </div>
                    </div>
                    
                    <div className="marina-section">
                      <div className="bg-gray-700 w-full h-2 mb-1"></div>
                      <div className="flex justify-around">
                        {marinaSection.sectionB.map((boat, i) => renderBoatIcon(boat, i + 10))}
                      </div>
                      <div className="bg-blue-900/20 backdrop-blur-sm rounded px-2 py-1 text-xs text-white font-bold absolute -top-6 left-0">
                        <MapPin className="h-3 w-3 inline mr-1" /> Section B
                      </div>
                    </div>
                  </div>
                  
                  {/* Center - Main dock */}
                  <div className="relative flex flex-col justify-center items-center">
                    <div className="marina-section">
                      <div className="bg-gray-700 w-full h-2 mb-1"></div>
                      <div className="flex justify-around">
                        {marinaSection.sectionC.map((boat, i) => renderBoatIcon(boat, i + 20))}
                      </div>
                      <div className="bg-blue-900/20 backdrop-blur-sm rounded px-2 py-1 text-xs text-white font-bold absolute -top-6 left-0">
                        <MapPin className="h-3 w-3 inline mr-1" /> Section C
                      </div>
                    </div>
                  </div>
                  
                  {/* Right side docks */}
                  <div className="relative flex flex-col justify-around">
                    <div className="marina-section">
                      <div className="bg-gray-700 w-full h-2 mb-1"></div>
                      <div className="flex justify-around">
                        {marinaSection.sectionD.map((boat, i) => renderBoatIcon(boat, i + 30))}
                      </div>
                      <div className="bg-blue-900/20 backdrop-blur-sm rounded px-2 py-1 text-xs text-white font-bold absolute -top-6 left-0">
                        <MapPin className="h-3 w-3 inline mr-1" /> Section D
                      </div>
                    </div>
                    
                    <div className="marina-section">
                      <div className="bg-gray-700 w-full h-2 mb-1"></div>
                      <div className="flex justify-around">
                        {marinaSection.sectionE.map((boat, i) => renderBoatIcon(boat, i + 40))}
                      </div>
                      <div className="bg-blue-900/20 backdrop-blur-sm rounded px-2 py-1 text-xs text-white font-bold absolute -top-6 left-0">
                        <MapPin className="h-3 w-3 inline mr-1" /> Section E
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Empty dock spots - add button */}
                {boats.length < 8 && (
                  <div 
                    className="absolute bottom-4 right-4 bg-blue-100/70 border-2 border-dashed border-blue-200 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100/90 transition-colors"
                    onClick={onAddBoat}
                  >
                    <PlusCircle className="h-6 w-6 text-blue-400 mb-1" />
                    <span className="text-xs font-medium text-blue-600">
                      {t.newBoatSlip || "New Slip"}
                    </span>
                  </div>
                )}
                
                {/* Marina facilities */}
                <div className="absolute bottom-4 left-4 bg-blue-900/20 backdrop-blur-sm rounded px-2 py-1">
                  <span className="text-xs text-white">Marina Facilities</span>
                </div>
              </div>
              
              {/* Marina Legend */}
              <div className="bg-white p-3 border-t border-blue-200">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-600 mr-1"></div>
                      <span>{t.available || "Available"}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-600 mr-1"></div>
                      <span>{t.rented || "Rented"}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-yellow-600 mr-1"></div>
                      <span>{t.maintenance || "Maintenance"}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-600 mr-1"></div>
                      <span>{t.repair || "Repair"}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">{boats.length} boats • Click on boat for details</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
