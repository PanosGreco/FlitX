
import { useState } from "react";
import { VehicleGrid } from "@/components/fleet/VehicleGrid";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { sampleVehicles } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Fleet = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAddVehicle = () => {
    setIsAddDialogOpen(true);
  };
  
  const handleSubmitNewVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsAddDialogOpen(false);
      
      toast({
        title: "Vehicle Added",
        description: "New vehicle has been added to your fleet",
      });
    }, 1500);
  };
  
  return (
    <MobileLayout>
      <div className="container py-6">
        <VehicleGrid 
          vehicles={sampleVehicles} 
          onAddVehicle={handleAddVehicle}
        />
        
        {/* Add Vehicle Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
              <DialogDescription>
                Enter the details for the new vehicle.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmitNewVehicle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Make</Label>
                  <Input id="make" placeholder="e.g. Toyota" required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" placeholder="e.g. Corolla" required />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input 
                    id="year" 
                    type="number" 
                    placeholder="e.g. 2023"
                    min={1950}
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Vehicle Types</SelectLabel>
                        <SelectItem value="sedan">Sedan</SelectItem>
                        <SelectItem value="suv">SUV</SelectItem>
                        <SelectItem value="economy">Economy</SelectItem>
                        <SelectItem value="luxury">Luxury</SelectItem>
                        <SelectItem value="van">Van</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="licensePlate">License Plate</Label>
                  <Input id="licensePlate" placeholder="e.g. ABC-1234" required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dailyRate">Daily Rate ($)</Label>
                  <Input 
                    id="dailyRate" 
                    type="number" 
                    placeholder="e.g. 45.00"
                    min={0}
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mileage">Current Mileage</Label>
                <Input 
                  id="mileage" 
                  type="number" 
                  placeholder="e.g. 15000"
                  min={0}
                  required
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-flitx-blue hover:bg-flitx-blue-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Adding..." : "Add Vehicle"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default Fleet;
