import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Image, Info } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  VEHICLE_TYPES, VEHICLE_CATEGORIES,
  VehicleType, normalizeCategory, isStandardCategory
} from "@/constants/vehicleTypes";
import { TRANSMISSION_TYPES, TransmissionType } from "@/constants/transmissionTypes";
import { validateFileSize, compressImage } from "@/utils/imageUtils";
import { CamperFeaturesForm, CamperFeaturesState, defaultCamperFeatures } from "./CamperFeaturesForm";
import { useAuth } from "@/contexts/AuthContext";

interface EditVehicleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: {
    id: string;
    mileage: number;
    daily_rate: number;
    license_plate?: string;
    image?: string;
    purchase_price?: number | null;
    fuel_type?: string;
    transmission_type?: string;
    passenger_capacity?: number;
    vehicle_type?: string;
    type?: string;
  };
  onSaved: () => void;
}

export function EditVehicleDialog({ isOpen, onClose, vehicle, onSaved }: EditVehicleDialogProps) {
  const { language } = useLanguage();
  const { t } = useTranslation(['fleet', 'common']);
  const { user } = useAuth();
  const [mileage, setMileage] = useState(vehicle.mileage ?? 0);
  const [dailyRate, setDailyRate] = useState(vehicle.daily_rate ?? 0);
  const [licensePlate, setLicensePlate] = useState(vehicle.license_plate ?? '');
  const [purchasePrice, setPurchasePrice] = useState<string>(vehicle.purchase_price?.toString() ?? '');
  const [purchaseDate, setPurchaseDate] = useState<string>(vehicle.purchase_date ?? '');
  const [initialMileage, setInitialMileage] = useState(vehicle.initial_mileage ?? 0);
  const [marketValueAtPurchase, setMarketValueAtPurchase] = useState<string>(vehicle.market_value_at_purchase?.toString() ?? '');
  const [vehicleImage, setVehicleImage] = useState<string | null>(vehicle.image ?? null);
  const [fuelType, setFuelType] = useState(vehicle.fuel_type ?? 'petrol');
  const [transmissionType, setTransmissionType] = useState<TransmissionType>((vehicle.transmission_type as TransmissionType) ?? 'manual');
  const [passengerCapacity, setPassengerCapacity] = useState(vehicle.passenger_capacity?.toString() ?? '5');
  const [vehicleType, setVehicleType] = useState<VehicleType>((vehicle.vehicle_type as VehicleType) ?? 'car');
  const [vehicleCategory, setVehicleCategory] = useState(vehicle.type ?? '');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Camper features state
  const [camperFeatures, setCamperFeatures] = useState<CamperFeaturesState>({ ...defaultCamperFeatures });
  const [originalVehicleType, setOriginalVehicleType] = useState<string>('');
  const updateCamperFeatures = (updates: Partial<CamperFeaturesState>) => {
    setCamperFeatures(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    setMileage(vehicle.mileage ?? 0);
    setDailyRate(vehicle.daily_rate ?? 0);
    setLicensePlate(vehicle.license_plate ?? '');
    setPurchasePrice(vehicle.purchase_price?.toString() ?? '');
    setPurchaseDate(vehicle.purchase_date ?? '');
    setInitialMileage(vehicle.initial_mileage ?? 0);
    setMarketValueAtPurchase(vehicle.market_value_at_purchase?.toString() ?? '');
    setVehicleImage(vehicle.image ?? null);
    setFuelType(vehicle.fuel_type ?? 'petrol');
    setTransmissionType((vehicle.transmission_type as TransmissionType) ?? 'manual');
    setPassengerCapacity(vehicle.passenger_capacity?.toString() ?? '5');
    const vType = vehicle.vehicle_type as VehicleType;
    if (vType && VEHICLE_TYPES.includes(vType)) {
      setVehicleType(vType);
    } else {
      setVehicleType('car');
    }
    setOriginalVehicleType(vehicle.vehicle_type ?? 'car');
    const category = vehicle.type ?? '';
    if (category && !isStandardCategory(category)) {
      setIsCustomCategory(true);
      setCustomCategory(category.toUpperCase());
      setVehicleCategory('');
    } else {
      setIsCustomCategory(false);
      setCustomCategory('');
      setVehicleCategory(category);
    }

    // Fetch camper features if vehicle is a camper
    setCamperFeatures({ ...defaultCamperFeatures });
    if (vType === 'camper') {
      supabase.from('camper_features').select('*').eq('vehicle_id', vehicle.id).maybeSingle().then(({ data }) => {
        if (data) {
          setCamperFeatures({
            sleepingCapacity: data.sleeping_capacity ?? 0,
            numBeds: data.num_beds ?? 0,
            bedType: data.bed_type ?? '',
            hasKitchen: data.has_kitchen ?? false,
            numBurners: data.num_burners ?? 0,
            hasFridge: data.has_fridge ?? false,
            fridgeSizeLiters: data.fridge_size_liters ?? 0,
            hasSink: data.has_sink ?? false,
            hasOven: data.has_oven ?? false,
            hasMicrowave: data.has_microwave ?? false,
            hasToilet: data.has_toilet ?? false,
            toiletType: data.toilet_type ?? '',
            hasShower: data.has_shower ?? false,
            hasHotWater: data.has_hot_water ?? false,
            hasHeating: data.has_heating ?? false,
            hasAC: data.has_air_conditioning ?? false,
            hasAwning: data.has_awning ?? false,
            hasMosquitoScreens: data.has_mosquito_screens ?? false,
            hasBlackoutBlinds: data.has_blackout_blinds ?? false,
            hasSolarPanels: data.has_solar_panels ?? false,
            hasExternalPower: data.has_external_power_hookup ?? false,
            hasInverter: data.has_inverter ?? false,
            hasGenerator: data.has_generator ?? false,
            freshWaterCapacity: data.fresh_water_capacity_liters ?? 0,
            grayWaterCapacity: data.gray_water_capacity_liters ?? 0,
            vehicleLength: data.vehicle_length_meters?.toString() ?? '',
            vehicleHeight: data.vehicle_height_meters?.toString() ?? '',
            hasBikeRack: data.has_bike_rack ?? false,
            hasRearCamera: data.has_rear_camera ?? false,
            hasGPS: data.has_gps ?? false,
            hasTV: data.has_tv ?? false,
            hasWifi: data.has_wifi ?? false,
            hasPetFriendly: data.has_pet_friendly ?? false,
            additionalNotes: data.additional_notes ?? '',
          });
        }
      });
    }
  }, [vehicle.id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        if (event.target?.result) setVehicleImage(event.target.result.toString());
      };
      reader.readAsDataURL(processed);
    }
  };

  const handleVehicleTypeChange = (newType: VehicleType) => {
    setVehicleType(newType);
    setVehicleCategory('');
    setCustomCategory('');
    setIsCustomCategory(false);
    if (newType !== 'camper') {
      setCamperFeatures({ ...defaultCamperFeatures });
    }
  };

  const handleCategoryChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomCategory(true);
      setVehicleCategory('');
    } else {
      setIsCustomCategory(false);
      setVehicleCategory(value);
      setCustomCategory('');
    }
  };

  const getFinalCategory = () => {
    if (VEHICLE_CATEGORIES[vehicleType]?.length === 0 && customCategory.trim()) return normalizeCategory(customCategory);
    if (isCustomCategory && customCategory.trim()) return normalizeCategory(customCategory);
    return vehicleCategory;
  };

  const handleSave = async () => {
    const finalCategory = getFinalCategory();
    if (!finalCategory) {
      toast({ title: t('common:error'), description: t('fleet:selectCategoryError'), variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.from('vehicles').update({
        mileage, daily_rate: dailyRate, license_plate: licensePlate,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        purchase_date: purchaseDate || null, initial_mileage: initialMileage,
        market_value_at_purchase: marketValueAtPurchase ? parseFloat(marketValueAtPurchase) : null,
        image: vehicleImage, fuel_type: fuelType, transmission_type: transmissionType,
        passenger_capacity: parseInt(passengerCapacity), vehicle_type: vehicleType, type: finalCategory,
      }).eq('id', vehicle.id);

      if (error) {
        console.error('Error updating vehicle:', error);
        toast({ title: t('common:error'), description: t('fleet:vehicleUpdateFailed'), variant: "destructive" });
        return;
      }

      // Handle camper features
      if (vehicleType === 'camper' && user) {
        await supabase.from('camper_features').upsert({
          vehicle_id: vehicle.id,
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
        }, { onConflict: 'vehicle_id' });
      } else if (originalVehicleType === 'camper' && vehicleType !== 'camper') {
        // Type changed from camper — delete camper features
        await supabase.from('camper_features').delete().eq('vehicle_id', vehicle.id);
      }

      toast({ title: t('fleet:vehicleUpdated'), description: t('fleet:vehicleUpdateSuccess') });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Exception updating vehicle:', err);
      toast({ title: t('common:error'), description: t('fleet:unexpectedError'), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('fleet:editVehicle')}</DialogTitle>
          <DialogDescription>{t('fleet:editVehicleDesc')}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Vehicle Image */}
          <div className="space-y-2">
            <Label>{t('fleet:vehiclePhoto')}</Label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-28 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {vehicleImage ? <img src={vehicleImage} alt="Vehicle" className="h-full w-full object-cover" /> : <Image className="h-8 w-8 text-muted-foreground" />}
              </div>
              <label htmlFor="edit-vehicle-photo" className="flex items-center px-3 py-2 text-sm border border-input rounded-md bg-background hover:bg-accent cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {t('fleet:changePhoto')}
                <input id="edit-vehicle-photo" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          {/* Vehicle Type */}
          <div className="space-y-2">
            <Label htmlFor="vehicle-type" className="font-semibold">{t('fleet:vehicleType')}</Label>
            <Select value={vehicleType} onValueChange={(v) => handleVehicleTypeChange(v as VehicleType)}>
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

          {/* Vehicle Category */}
          <div className="space-y-2">
            <Label htmlFor="vehicle-category">{t('fleet:category')}</Label>
            {!isCustomCategory ? (
              VEHICLE_CATEGORIES[vehicleType]?.length > 0 ? (
                <Select value={vehicleCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger><SelectValue placeholder={t('fleet:selectCategoryPrompt')} /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {VEHICLE_CATEGORIES[vehicleType].map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{t(`fleet:category_${cat.value}`, cat.label.en)}</SelectItem>
                      ))}
                      <SelectItem value="custom" className="text-muted-foreground italic">{t('fleet:customCategory')}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder={t('fleet:customCategoryPlaceholder')} value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="flex-1" />
                </div>
              )
            ) : (
              <div className="flex gap-2">
                <Input placeholder={t('fleet:customCategoryPlaceholder')} value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={() => { setIsCustomCategory(false); setCustomCategory(''); }}>
                  {t('common:cancel')}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fuel-type">{t('fleet:fuelType')}</Label>
            <Select value={fuelType} onValueChange={setFuelType}>
              <SelectTrigger><SelectValue placeholder={t('fleet:selectFuelPrompt')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="petrol">{t('fleet:petrol')}</SelectItem>
                <SelectItem value="diesel">{t('fleet:diesel')}</SelectItem>
                <SelectItem value="electric">{t('fleet:electric')}</SelectItem>
                <SelectItem value="hybrid">{t('fleet:hybrid')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transmission-type">{t('fleet:transmissionType')}</Label>
            <Select value={transmissionType} onValueChange={(v) => setTransmissionType(v as TransmissionType)}>
              <SelectTrigger><SelectValue placeholder={t('fleet:selectTransmission')} /></SelectTrigger>
              <SelectContent>
                {TRANSMISSION_TYPES.map((tt) => (
                  <SelectItem key={tt} value={tt}>{t(`fleet:transmission_${tt}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passenger-capacity">{t('fleet:numberOfPeople')}</Label>
            <Select value={passengerCapacity} onValueChange={setPassengerCapacity}>
              <SelectTrigger><SelectValue placeholder={t('fleet:selectPrompt')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="7">7+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="license-plate">{t('fleet:licensePlate')}</Label>
            <Input id="license-plate" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="e.g. ABC-1234" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mileage">{t('fleet:mileageKm')}</Label>
            <Input id="mileage" type="number" value={mileage} onChange={(e) => setMileage(Number(e.target.value))} min={0} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="daily-rate">{t('fleet:dailyRateEuro')}</Label>
            <Input id="daily-rate" type="number" value={dailyRate} onChange={(e) => setDailyRate(Number(e.target.value))} min={0} step="0.01" />
            <p className="text-xs text-muted-foreground">{t('fleet:defaultRateDesc')}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="purchase-price">{t('fleet:purchasePrice')}</Label>
              <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent className="max-w-xs"><p className="text-xs">{t('fleet:purchasePriceTooltip')}</p></TooltipContent>
              </Tooltip></TooltipProvider>
            </div>
            <Input id="purchase-price" type="text" inputMode="decimal" value={purchasePrice}
              onChange={(e) => { const value = e.target.value.replace(/[^0-9.]/g, ''); setPurchasePrice(value); }}
              placeholder={t('fleet:optional')}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          </div>

          {/* Depreciation Data Section */}
          <div className="pt-4 pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase tracking-wide">{t('fleet:depreciationData')}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1">{t('fleet:depreciationDataDesc')}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="market-value">{t('fleet:marketValueAtPurchase')}</Label>
              <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent className="max-w-xs"><p className="text-xs">{t('fleet:marketValueTooltip')}</p></TooltipContent>
              </Tooltip></TooltipProvider>
            </div>
            <Input id="market-value" type="text" inputMode="decimal" value={marketValueAtPurchase}
              onChange={(e) => { const value = e.target.value.replace(/[^0-9.]/g, ''); setMarketValueAtPurchase(value); }}
              placeholder={t('fleet:customCategoryPlaceholder')}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="purchase-date">{t('fleet:purchaseDate')}</Label>
              <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent className="max-w-xs"><p className="text-xs">{t('fleet:purchaseDateTooltip')}</p></TooltipContent>
              </Tooltip></TooltipProvider>
            </div>
            <Input id="purchase-date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="w-full" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="initial-mileage">{t('fleet:mileageAtPurchase')}</Label>
              <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent className="max-w-xs"><p className="text-xs">{t('fleet:mileageAtPurchaseTooltip')}</p></TooltipContent>
              </Tooltip></TooltipProvider>
            </div>
            <Input id="initial-mileage" type="number" value={initialMileage} onChange={(e) => setInitialMileage(Number(e.target.value))} min={0} placeholder="0" />
          </div>

          {/* Camper Features */}
          {vehicleType === 'camper' && (
            <CamperFeaturesForm
              state={camperFeatures}
              onChange={updateCamperFeatures}
              disabled={isLoading}
            />
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>{t('common:cancel')}</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? t('common:saving') : t('fleet:saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
