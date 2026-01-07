import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Image } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    license_plate?: string;
    image?: string;
    purchase_price?: number | null;
    fuel_type?: string;
  };
  onSaved: () => void;
}

export function EditVehicleDialog({ isOpen, onClose, vehicle, onSaved }: EditVehicleDialogProps) {
  const [mileage, setMileage] = useState(vehicle.mileage || 0);
  const [dailyRate, setDailyRate] = useState(vehicle.daily_rate || 0);
  const [fuelLevel, setFuelLevel] = useState(vehicle.fuel_level || 100);
  const [licensePlate, setLicensePlate] = useState(vehicle.license_plate || '');
  const [purchasePrice, setPurchasePrice] = useState<string>(vehicle.purchase_price?.toString() || '');
  const [vehicleImage, setVehicleImage] = useState<string | null>(vehicle.image || null);
  const [fuelType, setFuelType] = useState(vehicle.fuel_type || 'petrol');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Reset form values when vehicle changes
  useEffect(() => {
    setMileage(vehicle.mileage || 0);
    setDailyRate(vehicle.daily_rate || 0);
    setFuelLevel(vehicle.fuel_level || 100);
    setLicensePlate(vehicle.license_plate || '');
    setPurchasePrice(vehicle.purchase_price?.toString() || '');
    setVehicleImage(vehicle.image || null);
    setFuelType(vehicle.fuel_type || 'petrol');
  }, [vehicle]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setVehicleImage(event.target.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          mileage: mileage,
          daily_rate: dailyRate,
          fuel_level: fuelLevel,
          license_plate: licensePlate,
          purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
          image: vehicleImage,
          fuel_type: fuelType,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
          <DialogDescription>
            Update vehicle details and information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Vehicle Image */}
          <div className="space-y-2">
            <Label>Vehicle Photo</Label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-28 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {vehicleImage ? (
                  <img 
                    src={vehicleImage} 
                    alt="Vehicle" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Image className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <label 
                htmlFor="edit-vehicle-photo" 
                className="flex items-center px-3 py-2 text-sm border border-input rounded-md bg-background hover:bg-accent cursor-pointer"
              >
                <Upload className="h-4 w-4 mr-2" />
                Change Photo
                <input
                  id="edit-vehicle-photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fuel-type">Fuel Type</Label>
            <Select value={fuelType} onValueChange={setFuelType}>
              <SelectTrigger>
                <SelectValue placeholder="Select fuel type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="petrol">Petrol</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="electric">Electric</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="license-plate">License Plate</Label>
            <Input
              id="license-plate"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="e.g. ABC-1234"
            />
          </div>

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
              Default rate for new bookings
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

          <div className="space-y-2">
            <Label htmlFor="purchase-price">Purchase Price ($)</Label>
            <Input
              id="purchase-price"
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              min={0}
              step="0.01"
              placeholder="Optional"
            />
            <p className="text-xs text-muted-foreground">
              Used to calculate break-even and profit
            </p>
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
