import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditVehicleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: {
    id: string;
    mileage: number;
    daily_rate: number;
    fuel_level: number;
  };
  onSaved: () => void;
}

export function EditVehicleDialog({ isOpen, onClose, vehicle, onSaved }: EditVehicleDialogProps) {
  const [mileage, setMileage] = useState(vehicle.mileage || 0);
  const [dailyRate, setDailyRate] = useState(vehicle.daily_rate || 0);
  const [fuelLevel, setFuelLevel] = useState(vehicle.fuel_level || 100);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          mileage: mileage,
          daily_rate: dailyRate,
          fuel_level: fuelLevel,
        })
        .eq('id', vehicle.id);

      if (error) {
        console.error('Error updating vehicle:', error);
        toast({
          title: "Error",
          description: "Failed to update vehicle details",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Vehicle Updated",
        description: "Vehicle details have been saved successfully",
      });
      
      onSaved();
      onClose();
    } catch (err) {
      console.error('Exception updating vehicle:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Vehicle Details</DialogTitle>
          <DialogDescription>
            Update the operational details for this vehicle
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="mileage">Current Mileage (km)</Label>
            <Input
              id="mileage"
              type="number"
              value={mileage}
              onChange={(e) => setMileage(Number(e.target.value))}
              min={0}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="daily-rate">Daily Rate ($)</Label>
            <Input
              id="daily-rate"
              type="number"
              value={dailyRate}
              onChange={(e) => setDailyRate(Number(e.target.value))}
              min={0}
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              This rate will be used as the default for new bookings
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fuel-level">Fuel Level (%)</Label>
            <Input
              id="fuel-level"
              type="number"
              value={fuelLevel}
              onChange={(e) => setFuelLevel(Math.min(100, Math.max(0, Number(e.target.value))))}
              min={0}
              max={100}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
