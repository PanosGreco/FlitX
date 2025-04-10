
import React from "react";
import { PlusCircle, Sailboat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BoatCard } from "./BoatCard";
import { BoatData } from "@/lib/boatData";
import { useLanguage } from "@/contexts/LanguageContext";

interface BoatGridProps {
  boats: BoatData[];
  onAddBoat?: () => void;
}

export function BoatGrid({ boats, onAddBoat }: BoatGridProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.ourFleet || "Our Fleet"}</h1>
        
        <Button
          onClick={onAddBoat}
          className="bg-flitx-blue hover:bg-flitx-blue-600"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          {t.addNewBoat || "Add New Boat"}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {boats.map((boat) => (
          <BoatCard key={boat.id} boat={boat} />
        ))}
        
        {boats.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center bg-gray-50 rounded-lg p-10 text-center">
            <Sailboat className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium mb-2">{t.noBoats || "No boats yet"}</h3>
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
    </div>
  );
}
