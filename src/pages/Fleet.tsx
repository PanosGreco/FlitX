import { useState, useEffect, useCallback } from "react";
import { VehicleGrid } from "@/components/fleet/VehicleGrid";
import { MobileLayout } from "@/components/layout/MobileLayout";
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
import { Upload, Image, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { VehicleData } from "@/components/fleet/VehicleCard";

const Fleet = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { t, language, isLanguageLoading } = useLanguage();
  const { user } = useAuth();
  
  // Form state
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [type, setType] = useState("");
  const [fuelType, setFuelType] = useState("petrol");
  const [passengerCapacity, setPassengerCapacity] = useState("5");
  const [licensePlate, setLicensePlate] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [mileage, setMileage] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  
  usePageTitle("fleet");

  const fetchVehicles = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vehicles:', error);
        toast({
          title: language === 'el' ? 'Σφάλμα' : 'Error',
          description: language === 'el' ? 'Αποτυχία φόρτωσης οχημάτων' : 'Failed to load vehicles',
          variant: 'destructive',
        });
        return;
      }

      // Transform backend data to VehicleData format
      const transformedVehicles: VehicleData[] = (data || []).map(v => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        type: v.type,
        mileage: v.mileage || 0,
        image: v.image || undefined,
        status: v.status as VehicleData['status'],
        licensePlate: v.license_plate || '',
        fuelLevel: v.fuel_level || 0,
        dailyRate: v.daily_rate || 0,
        fuelType: v.fuel_type || 'petrol',
      }));

      setVehicles(transformedVehicles);
    } catch (error) {
      console.error('Exception fetching vehicles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, language, toast]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Set up realtime subscription for vehicles
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('vehicles_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'vehicles' }, 
        () => {
          fetchVehicles();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchVehicles]);

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

  const resetForm = () => {
    setMake("");
    setModel("");
    setYear("");
    setType("");
    setFuelType("petrol");
    setPassengerCapacity("5");
    setLicensePlate("");
    setDailyRate("");
    setMileage("");
    setPurchasePrice("");
    setVehicleImage(null);
  };
  
  const handleSubmitNewVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Πρέπει να συνδεθείτε' : 'You must be logged in',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('vehicles')
        .insert({
          user_id: user.id,
          make,
          model,
          year: parseInt(year),
          type,
          fuel_type: fuelType,
          passenger_capacity: parseInt(passengerCapacity),
          license_plate: licensePlate,
          daily_rate: parseFloat(dailyRate),
          mileage: parseInt(mileage),
          purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
          image: vehicleImage,
          status: 'available',
          fuel_level: 100,
        });

      if (error) {
        console.error('Error adding vehicle:', error);
        toast({
          title: language === 'el' ? 'Σφάλμα' : 'Error',
          description: language === 'el' ? 'Αποτυχία προσθήκης οχήματος' : 'Failed to add vehicle',
          variant: 'destructive',
        });
        return;
      }

      // Refetch vehicles from backend after successful insert
      await fetchVehicles();
      
      setIsAddDialogOpen(false);
      resetForm();
      
      toast({
        title: t.vehicleAdded,
        description: t.vehicleAddedDesc,
      });
    } catch (error) {
      console.error('Exception adding vehicle:', error);
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Κάτι πήγε στραβά' : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <MobileLayout>
      <div className="container py-6">
        <VehicleGrid 
          vehicles={vehicles} 
          onAddVehicle={handleAddVehicle}
          isLoading={isLoading}
        />
        
        {/* Add Vehicle Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader className="pb-2">
              <DialogTitle>{t.addNewVehicle}</DialogTitle>
              <DialogDescription>
                {t.enterVehicleDetails}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmitNewVehicle} className="space-y-3">
              {/* Vehicle Image Upload */}
              <div className="flex flex-col items-center justify-center space-y-1">
                <div className="h-24 w-full bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  {vehicleImage ? (
                    <img 
                      src={vehicleImage} 
                      alt="Vehicle preview" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <label 
                    htmlFor="vehicle-photo-upload" 
                    className="flex items-center px-3 py-1 text-sm border border-input rounded-md bg-background hover:bg-accent cursor-pointer"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t.uploadPhoto}
                    <input
                      id="vehicle-photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleVehicleImageUpload}
                      disabled={isLanguageLoading}
                    />
                  </label>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="make">{t.make}</Label>
                  <Input 
                    id="make" 
                    placeholder="e.g. Toyota" 
                    required 
                    disabled={isLanguageLoading || isSubmitting}
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="model">{t.model}</Label>
                  <Input 
                    id="model" 
                    placeholder="e.g. Corolla" 
                    required 
                    disabled={isLanguageLoading || isSubmitting}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="year">{t.year}</Label>
                  <Input 
                    id="year" 
                    type="number" 
                    placeholder="e.g. 2023"
                    min={1950}
                    max={new Date().getFullYear() + 1}
                    required
                    disabled={isLanguageLoading || isSubmitting}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="type">{t.type}</Label>
                  <Select 
                    disabled={isLanguageLoading || isSubmitting}
                    value={type}
                    onValueChange={setType}
                  >
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="fuelType">{language === 'el' ? 'Τύπος Καυσίμου' : 'Fuel Type'}</Label>
                  <Select 
                    disabled={isLanguageLoading || isSubmitting}
                    value={fuelType}
                    onValueChange={setFuelType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'el' ? 'Επιλέξτε...' : 'Select...'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="petrol">{language === 'el' ? 'Βενζίνη' : 'Petrol'}</SelectItem>
                        <SelectItem value="diesel">{language === 'el' ? 'Diesel' : 'Diesel'}</SelectItem>
                        <SelectItem value="electric">{language === 'el' ? 'Ηλεκτρικό' : 'Electric'}</SelectItem>
                        <SelectItem value="hybrid">{language === 'el' ? 'Υβριδικό' : 'Hybrid'}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="passengerCapacity">{language === 'el' ? 'Αριθμός Επιβατών' : 'Number of People'}</Label>
                  <Select 
                    disabled={isLanguageLoading || isSubmitting}
                    value={passengerCapacity}
                    onValueChange={setPassengerCapacity}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'el' ? 'Επιλέξτε...' : 'Select...'} />
                    </SelectTrigger>
                <SelectContent>
                      <SelectGroup>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="7">7+</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="licensePlate">{t.licensePlate}</Label>
                  <Input 
                    id="licensePlate" 
                    placeholder="e.g. ABC-1234" 
                    required 
                    disabled={isLanguageLoading || isSubmitting}
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="dailyRate">{t.dailyRate}</Label>
                  <Input 
                    id="dailyRate" 
                    type="number" 
                    placeholder="e.g. 45.00"
                    min={0}
                    step="0.01"
                    required
                    disabled={isLanguageLoading || isSubmitting}
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="mileage">{t.mileage}</Label>
                  <Input 
                    id="mileage" 
                    type="number" 
                    placeholder="e.g. 15000"
                    min={0}
                    required
                    disabled={isLanguageLoading || isSubmitting}
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="purchasePrice">{language === 'el' ? 'Τιμή Αγοράς' : 'Purchase Price'}</Label>
                  <Input 
                    id="purchasePrice" 
                    type="number" 
                    placeholder={language === 'el' ? 'Προαιρετικό' : 'Optional'}
                    min={0}
                    step="0.01"
                    disabled={isLanguageLoading || isSubmitting}
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    resetForm();
                  }}
                  disabled={isLanguageLoading || isSubmitting}
                >
                  {t.cancel}
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || isLanguageLoading}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t.adding}
                    </>
                  ) : t.add}
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
