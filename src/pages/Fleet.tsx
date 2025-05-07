
import { useState, useEffect } from "react";
import { VehicleGrid } from "@/components/fleet/VehicleGrid";
import { Marina } from "@/components/fleet/Marina";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { sampleVehicles } from "@/lib/data";
import { sampleBoats } from "@/lib/boatData";
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
import { Upload, Image, Ship } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { isBoatBusiness, getVehicleTypeDisplayName } from "@/utils/businessTypeUtils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTestMode } from "@/contexts/TestModeContext";
import { addVehicle, fetchVehicles, VehicleFormData } from "@/services/vehicleService";
import { VehicleData } from "@/components/fleet/VehicleCard";
import { toast } from "sonner";

const Fleet = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);
  const [vehicleImageFile, setVehicleImageFile] = useState<File | null>(null);
  const [vehicles, setVehicles] = useState<VehicleData[]>(sampleVehicles);
  const [vehicleForm, setVehicleForm] = useState<Partial<VehicleFormData>>({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    type: "",
    licensePlate: "",
    dailyRate: 0,
    mileage: 0,
  });
  
  // Fix: Remove the incorrect reference to 't' from useToast
  const { toast: showToast } = useToast();
  // Use the translation object from useLanguage instead
  const { t: translate } = useLanguage();
  const isBoatMode = isBoatBusiness();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isTestMode } = useTestMode();

  // Redirect to boat home if in boat mode
  useEffect(() => {
    if (isBoatMode) {
      navigate('/boats');
    }
  }, [isBoatMode, navigate]);
  
  // Load vehicles from Supabase
  useEffect(() => {
    const loadVehicles = async () => {
      try {
        if (user || isTestMode) {
          const userId = user?.id;
          const loadedVehicles = await fetchVehicles(userId);
          
          // Only replace sample vehicles if we got actual vehicles
          if (loadedVehicles && loadedVehicles.length > 0) {
            setVehicles(loadedVehicles);
          }
        }
      } catch (error) {
        console.error("Error loading vehicles:", error);
        // Keep using sample vehicles as fallback
      }
    };
    
    loadVehicles();
  }, [user, isTestMode]);

  const handleAddVehicle = () => {
    setIsAddDialogOpen(true);
    resetVehicleForm();
  };
  
  const resetVehicleForm = () => {
    setVehicleForm({
      make: "",
      model: "",
      year: new Date().getFullYear(),
      type: "",
      licensePlate: "",
      dailyRate: 0,
      mileage: 0,
    });
    setVehicleImage(null);
    setVehicleImageFile(null);
  };
  
  const handleVehicleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setVehicleImageFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setVehicleImage(event.target.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleFormChange = (field: keyof VehicleFormData, value: any) => {
    setVehicleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSubmitNewVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (user || isTestMode) {
        const userId = user?.id || 'test-user-id';
        const vehicleData: VehicleFormData = {
          make: vehicleForm.make!,
          model: vehicleForm.model!,
          year: Number(vehicleForm.year),
          type: vehicleForm.type!,
          licensePlate: vehicleForm.licensePlate!,
          dailyRate: Number(vehicleForm.dailyRate),
          mileage: Number(vehicleForm.mileage),
          image: vehicleImageFile,
        };
        
        let newVehicle: VehicleData;
        
        if (isTestMode || !user) {
          // In test mode, create a mock vehicle
          newVehicle = {
            id: `test-${Date.now()}`,
            make: vehicleData.make,
            model: vehicleData.model,
            year: vehicleData.year,
            type: vehicleData.type,
            mileage: vehicleData.mileage,
            image: vehicleImage,
            status: 'available',
            licensePlate: vehicleData.licensePlate,
            fuelLevel: 100,
            dailyRate: vehicleData.dailyRate,
          };
        } else {
          // Add to Supabase
          newVehicle = await addVehicle(vehicleData, userId);
        }
        
        // Add the new vehicle to our local state
        setVehicles(prev => [...prev, newVehicle]);
        
        toast.success("Vehicle added successfully!");
        setIsAddDialogOpen(false);
        resetVehicleForm();
      }
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error("Failed to add vehicle. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isFormValid = () => {
    return (
      vehicleForm.make &&
      vehicleForm.model &&
      vehicleForm.year &&
      vehicleForm.type &&
      vehicleForm.licensePlate &&
      vehicleForm.dailyRate &&
      vehicleForm.mileage
    );
  };
  
  return (
    <MobileLayout>
      <div className="container py-6">
        <VehicleGrid 
          vehicles={vehicles} 
          onAddVehicle={handleAddVehicle}
        />
        
        {/* Add Vehicle Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{translate.addNewVehicle}</DialogTitle>
              <DialogDescription>
                {translate.enterVehicleDetails}
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
                    {translate.uploadPhoto}
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
                  {translate.photoRestrictions}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">{translate.make}</Label>
                  <Input 
                    id="make" 
                    placeholder="e.g. Toyota" 
                    required 
                    value={vehicleForm.make || ''}
                    onChange={(e) => handleFormChange('make', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="model">{translate.model}</Label>
                  <Input 
                    id="model" 
                    placeholder="e.g. Corolla" 
                    required
                    value={vehicleForm.model || ''}
                    onChange={(e) => handleFormChange('model', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">{translate.year}</Label>
                  <Input 
                    id="year" 
                    type="number" 
                    placeholder="e.g. 2023"
                    min={1950}
                    max={new Date().getFullYear() + 1}
                    required
                    value={vehicleForm.year || ''}
                    onChange={(e) => handleFormChange('year', Number(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">{translate.type}</Label>
                  <Select 
                    value={vehicleForm.type} 
                    onValueChange={(value) => handleFormChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={translate.type} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>{translate.vehicleTypes}</SelectLabel>
                        <SelectItem value="Sedan">{translate.sedan}</SelectItem>
                        <SelectItem value="SUV">{translate.suv}</SelectItem>
                        <SelectItem value="Economy">{translate.economy}</SelectItem>
                        <SelectItem value="Luxury">{translate.luxury}</SelectItem>
                        <SelectItem value="Van">{translate.van}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="licensePlate">{translate.licensePlate}</Label>
                  <Input 
                    id="licensePlate" 
                    placeholder="e.g. ABC-1234" 
                    required
                    value={vehicleForm.licensePlate || ''}
                    onChange={(e) => handleFormChange('licensePlate', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dailyRate">{translate.dailyRate}</Label>
                  <Input 
                    id="dailyRate" 
                    type="number" 
                    placeholder="e.g. 45.00"
                    min={0}
                    step="0.01"
                    required
                    value={vehicleForm.dailyRate || ''}
                    onChange={(e) => handleFormChange('dailyRate', Number(e.target.value))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mileage">{translate.mileage}</Label>
                <Input 
                  id="mileage" 
                  type="number" 
                  placeholder="e.g. 15000"
                  min={0}
                  required
                  value={vehicleForm.mileage || ''}
                  onChange={(e) => handleFormChange('mileage', Number(e.target.value))}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    resetVehicleForm();
                  }}
                >
                  {translate.cancel}
                </Button>
                <Button 
                  type="submit" 
                  className="bg-flitx-blue hover:bg-flitx-blue-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? translate.adding : translate.add}
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
