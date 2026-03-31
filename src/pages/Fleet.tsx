import { useState, useEffect, useCallback } from "react";
import { VehicleGrid } from "@/components/fleet/VehicleGrid";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image, Loader2, Info, Plus, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { VehicleData } from "@/components/fleet/VehicleCard";
import { 
  VEHICLE_TYPES, 
  VEHICLE_CATEGORIES, 
  VehicleType,
  normalizeCategory,
  formatCustomCategory
} from "@/constants/vehicleTypes";
import { TRANSMISSION_TYPES, TransmissionType } from "@/constants/transmissionTypes";
import { validateFileSize, compressImage } from "@/utils/imageUtils";
import { CamperFeaturesForm, CamperFeaturesState, defaultCamperFeatures } from "@/components/fleet/CamperFeaturesForm";

const Fleet = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { language, isLanguageLoading } = useLanguage();
  const { t } = useTranslation(['fleet', 'common']);
  const { user } = useAuth();
  
  
  // Form state
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [vehicleCategory, setVehicleCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [fuelType, setFuelType] = useState("petrol");
  const [transmissionType, setTransmissionType] = useState<TransmissionType>("manual");
  const [passengerCapacity, setPassengerCapacity] = useState("5");
  const [licensePlate, setLicensePlate] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [mileage, setMileage] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");

  // Camper features state
  const [camperFeatures, setCamperFeatures] = useState<CamperFeaturesState>({ ...defaultCamperFeatures });
  const updateCamperFeatures = (updates: Partial<CamperFeaturesState>) => {
    setCamperFeatures(prev => ({ ...prev, ...updates }));
  };
  
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
          title: t('common:error'),
          description: t('fleet:failedLoadVehicles'),
          variant: 'destructive',
        });
        return;
      }

      // Transform backend data to VehicleData format - PRESERVE ALL database values
      const transformedVehicles: VehicleData[] = (data || []).map(v => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        type: v.type,
        mileage: v.mileage ?? 0,
        image: v.image || undefined,
        status: v.status as VehicleData['status'],
        licensePlate: v.license_plate ?? '',
        dailyRate: v.daily_rate ?? 0,
        fuelType: v.fuel_type ?? 'petrol',
        transmissionType: v.transmission_type ?? 'manual',
        passengerCapacity: v.passenger_capacity ?? undefined,
        vehicleType: v.vehicle_type ?? 'car',
        is_sold: (v as any).is_sold ?? false,
        sale_price: (v as any).sale_price ?? undefined,
        sale_date: (v as any).sale_date ?? undefined,
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
  
  const handleVehicleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      const sizeCheck = validateFileSize(file);
      if (!sizeCheck.valid) {
        toast({ title: t('common:fileTooLarge'), description: sizeCheck.message, variant: 'destructive' });
        return;
      }

      const processed = await compressImage(file);
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          setVehicleImage(event.target.result.toString());
        }
      };
      
      reader.readAsDataURL(processed);
    }
  };

  const resetForm = () => {
    setMake("");
    setModel("");
    setYear("");
    setVehicleType("car");
    setVehicleCategory("");
    setCustomCategory("");
    setIsCustomCategory(false);
    setFuelType("petrol");
    setTransmissionType("manual");
    setPassengerCapacity("5");
    setLicensePlate("");
    setDailyRate("");
    setMileage("");
    setPurchasePrice("");
    setVehicleImage(null);
    setAdditionalImages([]);
    setAdditionalImagePreviews([]);
    setCamperFeatures({ ...defaultCamperFeatures });
  };

  // Handle vehicle type change - reset category
  const handleVehicleTypeChange = (newType: VehicleType) => {
    setVehicleType(newType);
    setVehicleCategory("");
    setCustomCategory("");
    setIsCustomCategory(false);
    if (newType !== 'camper') {
      setCamperFeatures({ ...defaultCamperFeatures });
    }
  };

  // Handle category selection
  const handleCategoryChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomCategory(true);
      setVehicleCategory("");
    } else {
      setIsCustomCategory(false);
      setVehicleCategory(value);
      setCustomCategory("");
    }
  };

  // Get final category value (normalized for custom)
  const getFinalCategory = () => {
    // For types with no predefined categories, customCategory is always used
    if (VEHICLE_CATEGORIES[vehicleType]?.length === 0 && customCategory.trim()) {
      return normalizeCategory(customCategory);
    }
    if (isCustomCategory && customCategory.trim()) {
      return normalizeCategory(customCategory);
    }
    return vehicleCategory;
  };
  
  const handleSubmitNewVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: t('common:error'),
        description: t('fleet:mustBeLoggedIn'),
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const finalCategory = getFinalCategory();
      
      if (!finalCategory) {
        toast({
          title: t('common:error'),
          description: t('fleet:selectCategoryError'),
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const { data: vehicleData, error } = await supabase
        .from('vehicles')
        .insert({
          user_id: user.id,
          make,
          model,
          year: parseInt(year),
          vehicle_type: vehicleType,
          type: finalCategory,
          fuel_type: fuelType,
          transmission_type: transmissionType,
          passenger_capacity: parseInt(passengerCapacity),
          license_plate: licensePlate,
          daily_rate: parseFloat(dailyRate),
          mileage: parseInt(mileage),
          purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
          initial_mileage: mileage ? parseInt(mileage) : 0,
          image: vehicleImage,
          status: 'available',
        })
        .select()
        .single();

      if (error || !vehicleData) {
        console.error('Error adding vehicle:', error);
        toast({
          title: t('common:error'),
          description: t('fleet:failedAddVehicle'),
          variant: 'destructive',
        });
        return;
      }

      // Save camper features if vehicle type is camper
      if (vehicleType === 'camper') {
        const { error: camperError } = await supabase
          .from('camper_features')
          .insert({
            vehicle_id: vehicleData.id,
            user_id: user.id,
            sleeping_capacity: camperFeatures.sleepingCapacity,
            num_beds: camperFeatures.numBeds,
            bed_type: camperFeatures.bedType,
            has_kitchen: camperFeatures.hasKitchen,
            num_burners: camperFeatures.numBurners,
            has_fridge: camperFeatures.hasFridge,
            fridge_size_liters: camperFeatures.fridgeSizeLiters,
            has_sink: camperFeatures.hasSink,
            has_oven: camperFeatures.hasOven,
            has_microwave: camperFeatures.hasMicrowave,
            has_toilet: camperFeatures.hasToilet,
            toilet_type: camperFeatures.toiletType,
            has_shower: camperFeatures.hasShower,
            has_hot_water: camperFeatures.hasHotWater,
            has_heating: camperFeatures.hasHeating,
            has_air_conditioning: camperFeatures.hasAC,
            has_awning: camperFeatures.hasAwning,
            has_mosquito_screens: camperFeatures.hasMosquitoScreens,
            has_blackout_blinds: camperFeatures.hasBlackoutBlinds,
            has_solar_panels: camperFeatures.hasSolarPanels,
            has_external_power_hookup: camperFeatures.hasExternalPower,
            has_inverter: camperFeatures.hasInverter,
            has_generator: camperFeatures.hasGenerator,
            fresh_water_capacity_liters: camperFeatures.freshWaterCapacity,
            gray_water_capacity_liters: camperFeatures.grayWaterCapacity,
            vehicle_length_meters: camperFeatures.vehicleLength ? parseFloat(camperFeatures.vehicleLength) : 0,
            vehicle_height_meters: camperFeatures.vehicleHeight ? parseFloat(camperFeatures.vehicleHeight) : 0,
            has_bike_rack: camperFeatures.hasBikeRack,
            has_rear_camera: camperFeatures.hasRearCamera,
            has_gps: camperFeatures.hasGPS,
            has_tv: camperFeatures.hasTV,
            has_wifi: camperFeatures.hasWifi,
            has_pet_friendly: camperFeatures.hasPetFriendly,
            additional_notes: camperFeatures.additionalNotes,
          });

        if (camperError) {
          console.error('Error saving camper features:', camperError);
          toast({
            title: t('common:warning', 'Warning'),
            description: "Vehicle was created but camper features could not be saved. Please edit the vehicle to add camper details.",
          });
        }
      }

      // Upload additional images to vehicle-images bucket
      if (additionalImages.length > 0) {
        for (let i = 0; i < additionalImages.length; i++) {
          const file = additionalImages[i];
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
          const filePath = `${user.id}/${vehicleData.id}/${Date.now()}_${safeName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('vehicle-images')
            .upload(filePath, file, { contentType: file.type });
          
          if (!uploadError) {
            await supabase.from('vehicle_images' as any).insert({
              vehicle_id: vehicleData.id,
              user_id: user.id,
              file_path: filePath,
              sort_order: i,
            });
          }
        }
      }

      // Refetch vehicles from backend after successful insert
      await fetchVehicles();
      
      setIsAddDialogOpen(false);
      resetForm();
      
      toast({
        title: t('fleet:vehicleAdded'),
        description: t('fleet:vehicleAddedDesc'),
      });
    } catch (error) {
      console.error('Exception adding vehicle:', error);
      toast({
        title: t('common:error'),
        description: t('fleet:somethingWentWrong'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <AppLayout>
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
              <DialogTitle>{t('fleet:addNewVehicle')}</DialogTitle>
              <DialogDescription>
                {t('fleet:enterVehicleDetails')}
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
                    {t('fleet:uploadPhoto')}
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
                
                {/* Additional Photos Grid (up to 4) */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('fleet:additionalPhotos')}</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((idx) => {
                      const preview = additionalImagePreviews[idx];
                      return (
                        <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-dashed border-muted-foreground/30">
                          {preview ? (
                            <>
                              <img src={preview} alt={`Additional ${idx + 1}`} className="h-full w-full object-cover" />
                              <button
                                type="button"
                                className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                                onClick={() => {
                                  const newImages = [...additionalImages];
                                  const newPreviews = [...additionalImagePreviews];
                                  newImages.splice(idx, 1);
                                  newPreviews.splice(idx, 1);
                                  setAdditionalImages(newImages);
                                  setAdditionalImagePreviews(newPreviews);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : idx === additionalImages.length ? (
                            <label className="flex items-center justify-center h-full w-full cursor-pointer hover:bg-muted/50 transition-colors">
                              <Plus className="h-5 w-5 text-muted-foreground" />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    const sizeCheck = validateFileSize(file);
                                    if (!sizeCheck.valid) {
                                      toast({ title: t('common:fileTooLarge'), description: sizeCheck.message, variant: 'destructive' });
                                      return;
                                    }
                                    const processed = await compressImage(file);
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      if (ev.target?.result) {
                                        setAdditionalImages(prev => [...prev, processed]);
                                        setAdditionalImagePreviews(prev => [...prev, ev.target!.result!.toString()]);
                                      }
                                    };
                                    reader.readAsDataURL(processed);
                                  }
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          ) : (
                            <div className="flex items-center justify-center h-full w-full bg-muted/20" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Vehicle Type - FIRST and PROMINENT */}
              <div className="space-y-1">
                <Label htmlFor="vehicleType" className="font-semibold text-foreground">
                  {t('fleet:vehicleType')}
                </Label>
                <Select 
                  disabled={isLanguageLoading || isSubmitting}
                  value={vehicleType}
                  onValueChange={(v) => handleVehicleTypeChange(v as VehicleType)}
                >
                  <SelectTrigger className="font-medium">
                    <SelectValue placeholder={t('fleet:selectTypePrompt')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {VEHICLE_TYPES.map((vt) => (
                        <SelectItem key={vt} value={vt} className="font-semibold">
                          {t(`fleet:vehicleType_${vt}`)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Vehicle Category - Universal for all types */}
              {(
                <div className="space-y-1">
                  <Label htmlFor="vehicleCategory">
                    {t('fleet:category')}
                  </Label>
                  {!isCustomCategory ? (
                    VEHICLE_CATEGORIES[vehicleType]?.length > 0 ? (
                      <Select 
                        disabled={isLanguageLoading || isSubmitting}
                        value={vehicleCategory}
                        onValueChange={handleCategoryChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('fleet:selectCategoryPrompt')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {VEHICLE_CATEGORIES[vehicleType].map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {t(`fleet:category_${cat.value}`, cat.label.en)}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom" className="text-muted-foreground italic">
                              {t('fleet:customCategory')}
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    ) : (
                      // No predefined categories - show custom input directly with option to use it
                      <div className="flex gap-2">
                        <Input 
                          placeholder={t('fleet:customCategoryPlaceholder')}
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          disabled={isLanguageLoading || isSubmitting}
                          className="flex-1"
                        />
                      </div>
                    )
                  ) : (
                    <div className="flex gap-2">
                      <Input 
                        placeholder={t('fleet:customCategoryPlaceholder')}
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        disabled={isLanguageLoading || isSubmitting}
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setIsCustomCategory(false);
                          setCustomCategory("");
                        }}
                        disabled={isSubmitting}
                      >
                        {t('common:cancel')}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Make & Model - Primary Identification Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="make">{t('fleet:make')}</Label>
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
                  <Label htmlFor="model">{t('fleet:model')}</Label>
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
                  <Label htmlFor="year">{t('fleet:year')}</Label>
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
                  <Label htmlFor="fuelType">{t('fleet:fuelType')}</Label>
                  <Select 
                    disabled={isLanguageLoading || isSubmitting}
                    value={fuelType}
                    onValueChange={setFuelType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('fleet:selectPrompt')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="petrol">{t('fleet:petrol')}</SelectItem>
                        <SelectItem value="diesel">{t('fleet:diesel')}</SelectItem>
                        <SelectItem value="electric">{t('fleet:electric')}</SelectItem>
                        <SelectItem value="hybrid">{t('fleet:hybrid')}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Transmission Type */}
              <div className="space-y-1">
                <Label htmlFor="transmissionType">{t('fleet:transmissionType')}</Label>
                <Select 
                  disabled={isLanguageLoading || isSubmitting}
                  value={transmissionType}
                  onValueChange={(v) => setTransmissionType(v as TransmissionType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('fleet:selectPrompt')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {TRANSMISSION_TYPES.map((tt) => (
                        <SelectItem key={tt} value={tt}>
                          {t(`fleet:transmission_${tt}`)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Passengers */}
              <div className="space-y-1">
                <Label htmlFor="passengerCapacity">{t('fleet:numberOfPeople')}</Label>
                <Select 
                  disabled={isLanguageLoading || isSubmitting}
                  value={passengerCapacity}
                  onValueChange={setPassengerCapacity}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('fleet:selectPrompt')} />
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
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="licensePlate">{t('fleet:licensePlate')}</Label>
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
                  <Label htmlFor="dailyRate">{t('fleet:dailyRate')}</Label>
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
                  <Label htmlFor="mileage">{t('fleet:mileage')}</Label>
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
                  <div className="flex items-center gap-1">
                    <Label htmlFor="purchasePrice">{t('fleet:purchasePrice')}</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            {t('fleet:purchasePriceTooltip')}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input 
                    id="purchasePrice" 
                    type="text"
                    inputMode="decimal"
                    placeholder={t('fleet:optional')}
                    disabled={isLanguageLoading || isSubmitting}
                    value={purchasePrice}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setPurchasePrice(value);
                    }}
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Depreciation Data Section */}
              <div className="pt-4 pb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {t('fleet:depreciationData')}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {t('fleet:depreciationDataDesc')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Market Value at Purchase */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="marketValue">{t('fleet:marketValueAtPurchase')}</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            {t('fleet:marketValueTooltip')}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input 
                    id="marketValue" 
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 20000"
                    disabled={isLanguageLoading || isSubmitting}
                    value={marketValueAtPurchase}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setMarketValueAtPurchase(value);
                    }}
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* Purchase Date */}
                <div className="space-y-1">
                  <Label htmlFor="purchaseDate">{t('fleet:purchaseDate')}</Label>
                  <Input 
                    id="purchaseDate" 
                    type="date"
                    disabled={isLanguageLoading || isSubmitting}
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Initial Mileage */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Label htmlFor="initialMileage">{t('fleet:mileageAtPurchase')}</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          {t('fleet:mileageAtPurchaseTooltip')}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input 
                  id="initialMileage" 
                  type="number"
                  placeholder="0"
                  min={0}
                  disabled={isLanguageLoading || isSubmitting}
                  value={initialMileage}
                  onChange={(e) => setInitialMileage(e.target.value)}
                />
              </div>

              {/* Camper Features - only for camper type */}
              {vehicleType === 'camper' && (
                <CamperFeaturesForm
                  state={camperFeatures}
                  onChange={updateCamperFeatures}
                  disabled={isSubmitting}
                />
              )}
              
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
                  {t('common:cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || isLanguageLoading}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common:adding')}
                    </>
                  ) : t('common:add')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Fleet;
