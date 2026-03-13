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
  VEHICLE_TYPES, VEHICLE_CATEGORIES, VEHICLE_TYPE_LABELS,
  VehicleType, normalizeCategory, isStandardCategory
} from "@/constants/vehicleTypes";
import { TRANSMISSION_TYPES, TRANSMISSION_TYPE_LABELS, TransmissionType } from "@/constants/transmissionTypes";
import { validateFileSize, compressImage } from "@/utils/imageUtils";

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
    purchase_date?: string | null;
    initial_mileage?: number;
    market_value_at_purchase?: number | null;
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
                        <SelectItem key={cat.value} value={cat.value}>{cat.label[langKey]}</SelectItem>
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
                  <SelectItem key={tt} value={tt}>{TRANSMISSION_TYPE_LABELS[tt][langKey]}</SelectItem>
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
