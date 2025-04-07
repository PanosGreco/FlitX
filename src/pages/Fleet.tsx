
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
import { Upload, Image } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Fleet = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleAddVehicle = () => {
    setIsAddDialogOpen(true);
  };
  
  const handleVehicleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  
  const handleSubmitNewVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsAddDialogOpen(false);
      setVehicleImage(null); // Reset image after submit
      
      toast({
        title: t.vehicleAdded,
        description: t.vehicleAddedDesc,
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
              <DialogTitle>{t.addNewVehicle}</DialogTitle>
              <DialogDescription>
                {t.enterVehicleDetails}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmitNewVehicle} className="space-y-4">
              {/* Vehicle Image Upload */}
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="h-32 w-full bg-flitx-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {vehicleImage ? (
                    <img 
                      src={vehicleImage} 
                      alt="Vehicle preview" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image className="h-12 w-12 text-flitx-gray-300" />
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <label 
                    htmlFor="vehicle-photo-upload" 
                    className="flex items-center px-3 py-1.5 text-sm border border-input rounded-md bg-background hover:bg-accent cursor-pointer"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t.uploadPhoto}
                    <input
                      id="vehicle-photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleVehicleImageUpload}
                    />
                  </label>
                </div>
                <p className="text-xs text-flitx-gray-400 mt-1">
                  {t.photoRestrictions}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">{t.make}</Label>
                  <Input id="make" placeholder="e.g. Toyota" required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="model">{t.model}</Label>
                  <Input id="model" placeholder="e.g. Corolla" required />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">{t.year}</Label>
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
                  <Label htmlFor="type">{t.type}</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={t.type} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>{t.vehicleTypes}</SelectLabel>
                        <SelectItem value="sedan">{t.sedan}</SelectItem>
                        <SelectItem value="suv">{t.suv}</SelectItem>
                        <SelectItem value="economy">{t.economy}</SelectItem>
                        <SelectItem value="luxury">{t.luxury}</SelectItem>
                        <SelectItem value="van">{t.van}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="licensePlate">{t.licensePlate}</Label>
                  <Input id="licensePlate" placeholder="e.g. ABC-1234" required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dailyRate">{t.dailyRate}</Label>
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
                <Label htmlFor="mileage">{t.mileage}</Label>
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
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setVehicleImage(null);
                  }}
                >
                  {t.cancel}
                </Button>
                <Button 
                  type="submit" 
                  className="bg-flitx-blue hover:bg-flitx-blue-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t.adding : t.add}
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
