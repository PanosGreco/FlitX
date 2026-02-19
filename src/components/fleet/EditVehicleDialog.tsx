import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Image, Info } from "lucide-react";
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
  SelectGroup,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  VEHICLE_TYPES, 
  VEHICLE_CATEGORIES, 
  VEHICLE_TYPE_LABELS,
  VehicleType,
  normalizeCategory,
  isStandardCategory
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
    market_value_at_purchase?: number | null;  // NEW: For depreciation
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
  const [mileage, setMileage] = useState(vehicle.mileage ?? 0);
  const [dailyRate, setDailyRate] = useState(vehicle.daily_rate ?? 0);
  const [licensePlate, setLicensePlate] = useState(vehicle.license_plate ?? '');
  const [purchasePrice, setPurchasePrice] = useState<string>(vehicle.purchase_price?.toString() ?? '');
  const [purchaseDate, setPurchaseDate] = useState<string>(vehicle.purchase_date ?? '');
  const [initialMileage, setInitialMileage] = useState(vehicle.initial_mileage ?? 0);
  const [marketValueAtPurchase, setMarketValueAtPurchase] = useState<string>(vehicle.market_value_at_purchase?.toString() ?? '');
  const [vehicleImage, setVehicleImage] = useState<string | null>(vehicle.image ?? null);
  // Use nullish coalescing to only fallback if the value is null/undefined, NOT empty string
  const [fuelType, setFuelType] = useState(vehicle.fuel_type ?? 'petrol');
  const [transmissionType, setTransmissionType] = useState<TransmissionType>((vehicle.transmission_type as TransmissionType) ?? 'manual');
  const [passengerCapacity, setPassengerCapacity] = useState(vehicle.passenger_capacity?.toString() ?? '5');
  // CRITICAL: vehicle_type must be read from actual vehicle data, never default to 'car' if data exists
  const [vehicleType, setVehicleType] = useState<VehicleType>((vehicle.vehicle_type as VehicleType) ?? 'car');
  const [vehicleCategory, setVehicleCategory] = useState(vehicle.type ?? '');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Sync form values when vehicle prop changes - PRESERVES ALL existing values
  useEffect(() => {
    // Only update if vehicle.id changes to avoid resetting during edits
    setMileage(vehicle.mileage ?? 0);
    setDailyRate(vehicle.daily_rate ?? 0);
    setLicensePlate(vehicle.license_plate ?? '');
    setPurchasePrice(vehicle.purchase_price?.toString() ?? '');
    setPurchaseDate(vehicle.purchase_date ?? '');
    setInitialMileage(vehicle.initial_mileage ?? 0);
    setMarketValueAtPurchase(vehicle.market_value_at_purchase?.toString() ?? '');
    setVehicleImage(vehicle.image ?? null);
    // Use nullish coalescing to preserve falsy but valid values
    setFuelType(vehicle.fuel_type ?? 'petrol');
    setTransmissionType((vehicle.transmission_type as TransmissionType) ?? 'manual');
    setPassengerCapacity(vehicle.passenger_capacity?.toString() ?? '5');
    
    // CRITICAL FIX: Only use default if vehicle_type is truly undefined/null
    const vType = vehicle.vehicle_type as VehicleType;
    if (vType && VEHICLE_TYPES.includes(vType)) {
      setVehicleType(vType);
    } else {
      setVehicleType('car');
    }
    
    const category = vehicle.type ?? '';
    if (category && !isStandardCategory(category) && category !== 'atv') {
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
        toast({ title: language === 'el' ? 'Αρχείο πολύ μεγάλο' : 'File too large', description: sizeCheck.message, variant: 'destructive' });
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

  // Handle vehicle type change - reset category
  const handleVehicleTypeChange = (newType: VehicleType) => {
    setVehicleType(newType);
    setVehicleCategory('');
    setCustomCategory('');
    setIsCustomCategory(false);
  };

  // Handle category selection
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

  // Get final category value (normalized for custom)
  const getFinalCategory = () => {
    if (vehicleType === 'atv') {
      return 'atv';
    }
    if (isCustomCategory && customCategory.trim()) {
      return normalizeCategory(customCategory);
    }
    return vehicleCategory;
  };

  const handleSave = async () => {
    const finalCategory = getFinalCategory();
    
    if (!finalCategory && vehicleType !== 'atv') {
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Παρακαλώ επιλέξτε κατηγορία' : 'Please select a category',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          mileage: mileage,
          daily_rate: dailyRate,
          license_plate: licensePlate,
          purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
          purchase_date: purchaseDate || null,
          initial_mileage: initialMileage,
          market_value_at_purchase: marketValueAtPurchase ? parseFloat(marketValueAtPurchase) : null,
          image: vehicleImage,
          fuel_type: fuelType,
          transmission_type: transmissionType,
          passenger_capacity: parseInt(passengerCapacity),
          vehicle_type: vehicleType,
          type: finalCategory,
        })
        .eq('id', vehicle.id);

      if (error) {
        console.error('Error updating vehicle:', error);
        toast({
          title: language === 'el' ? 'Σφάλμα' : 'Error',
          description: language === 'el' ? 'Αποτυχία ενημέρωσης οχήματος' : 'Failed to update vehicle details',
          variant: "destructive"
        });
        return;
      }

      toast({
        title: language === 'el' ? 'Το όχημα ενημερώθηκε' : 'Vehicle Updated',
        description: language === 'el' ? 'Οι λεπτομέρειες του οχήματος αποθηκεύτηκαν' : 'Vehicle details have been saved successfully',
      });
      
      onSaved();
      onClose();
    } catch (err) {
      console.error('Exception updating vehicle:', err);
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Προέκυψε απρόσμενο σφάλμα' : 'An unexpected error occurred',
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
          <DialogTitle>{language === 'el' ? 'Επεξεργασία Οχήματος' : 'Edit Vehicle'}</DialogTitle>
          <DialogDescription>
            {language === 'el' ? 'Ενημέρωση στοιχείων και πληροφοριών οχήματος' : 'Update vehicle details and information'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Vehicle Image */}
          <div className="space-y-2">
            <Label>{language === 'el' ? 'Φωτογραφία Οχήματος' : 'Vehicle Photo'}</Label>
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
                {language === 'el' ? 'Αλλαγή Φωτογραφίας' : 'Change Photo'}
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

          {/* Vehicle Type */}
          <div className="space-y-2">
            <Label htmlFor="vehicle-type" className="font-semibold">
              {language === 'el' ? 'Τύπος Οχήματος' : 'Vehicle Type'}
            </Label>
            <Select value={vehicleType} onValueChange={(v) => handleVehicleTypeChange(v as VehicleType)}>
              <SelectTrigger className="font-medium">
                <SelectValue placeholder={language === 'el' ? 'Επιλέξτε τύπο...' : 'Select type...'} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {VEHICLE_TYPES.map((vt) => (
                    <SelectItem key={vt} value={vt} className="font-semibold">
                      {VEHICLE_TYPE_LABELS[vt][language === 'el' ? 'el' : 'en']}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Vehicle Category - Dynamic */}
          {vehicleType !== 'atv' && (
            <div className="space-y-2">
              <Label htmlFor="vehicle-category">
                {language === 'el' ? 'Κατηγορία' : 'Category'}
              </Label>
              {!isCustomCategory ? (
                <Select value={vehicleCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'el' ? 'Επιλέξτε κατηγορία...' : 'Select category...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {VEHICLE_CATEGORIES[vehicleType].map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label[language === 'el' ? 'el' : 'en']}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom" className="text-muted-foreground italic">
                        {language === 'el' ? 'Προσαρμοσμένη κατηγορία...' : 'Custom Category...'}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input 
                    placeholder={language === 'el' ? 'π.χ. BKJH' : 'e.g. BKJH'}
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsCustomCategory(false);
                      setCustomCategory('');
                    }}
                  >
                    {language === 'el' ? 'Ακύρωση' : 'Cancel'}
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fuel-type">{language === 'el' ? 'Τύπος Καυσίμου' : 'Fuel Type'}</Label>
            <Select value={fuelType} onValueChange={setFuelType}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'el' ? 'Επιλέξτε...' : 'Select fuel type'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="petrol">{language === 'el' ? 'Βενζίνη' : 'Petrol'}</SelectItem>
                <SelectItem value="diesel">{language === 'el' ? 'Diesel' : 'Diesel'}</SelectItem>
                <SelectItem value="electric">{language === 'el' ? 'Ηλεκτρικό' : 'Electric'}</SelectItem>
                <SelectItem value="hybrid">{language === 'el' ? 'Υβριδικό' : 'Hybrid'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transmission Type */}
          <div className="space-y-2">
            <Label htmlFor="transmission-type">{language === 'el' ? 'Κιβώτιο Ταχυτήτων' : 'Transmission Type'}</Label>
            <Select value={transmissionType} onValueChange={(v) => setTransmissionType(v as TransmissionType)}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'el' ? 'Επιλέξτε...' : 'Select transmission'} />
              </SelectTrigger>
              <SelectContent>
                {TRANSMISSION_TYPES.map((tt) => (
                  <SelectItem key={tt} value={tt}>
                    {TRANSMISSION_TYPE_LABELS[tt][language === 'el' ? 'el' : 'en']}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passenger-capacity">{language === 'el' ? 'Αριθμός Επιβατών' : 'Number of People'}</Label>
            <Select value={passengerCapacity} onValueChange={setPassengerCapacity}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'el' ? 'Επιλέξτε...' : 'Select...'} />
              </SelectTrigger>
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
            <Label htmlFor="license-plate">{language === 'el' ? 'Πινακίδα' : 'License Plate'}</Label>
            <Input
              id="license-plate"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="e.g. ABC-1234"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mileage">{language === 'el' ? 'Χιλιόμετρα' : 'Current Mileage (km)'}</Label>
            <Input
              id="mileage"
              type="number"
              value={mileage}
              onChange={(e) => setMileage(Number(e.target.value))}
              min={0}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="daily-rate">{language === 'el' ? 'Ημερήσια Τιμή (€)' : 'Daily Rate (€)'}</Label>
            <Input
              id="daily-rate"
              type="number"
              value={dailyRate}
              onChange={(e) => setDailyRate(Number(e.target.value))}
              min={0}
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              {language === 'el' ? 'Προεπιλεγμένη τιμή για νέες κρατήσεις' : 'Default rate for new bookings'}
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="purchase-price">{language === 'el' ? 'Τιμή Αγοράς (€)' : 'Purchase Price (€)'}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      {language === 'el' 
                        ? 'Η τιμή αγοράς βοηθά στη δημιουργία πιο ακριβούς οικονομικής ανάλυσης, insights και μετρήσεων μακροπρόθεσμης απόδοσης του στόλου.'
                        : 'The purchase price helps generate more accurate financial analysis, insights, and long-term fleet performance metrics.'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="purchase-price"
              type="text"
              inputMode="decimal"
              value={purchasePrice}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, '');
                setPurchasePrice(value);
              }}
              placeholder={language === 'el' ? 'Προαιρετικό' : 'Optional'}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Depreciation Data Section Divider */}
          <div className="pt-4 pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase tracking-wide">
                {language === 'el' ? 'Δεδομένα Απόσβεσης' : 'Depreciation Data'}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1">
              {language === 'el' 
                ? 'Χρησιμοποιείται για εκτίμηση μείωσης αξίας βάσει χρόνου και χιλιομέτρων.'
                : 'Used to estimate vehicle value loss over time and mileage.'}
            </p>
          </div>

          {/* Market Value at Purchase */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="market-value">{language === 'el' ? 'Αξία Αγοράς στην Αγορά (€)' : 'Market Value at Purchase (€)'}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      {language === 'el' 
                        ? 'Η ρεαλιστική αξία αγοράς του οχήματος όταν αποκτήθηκε. Χρησιμοποιείται ως βάση για υπολογισμούς απόσβεσης.'
                        : 'The realistic market value of the vehicle when acquired. Used as baseline for depreciation calculations.'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="market-value"
              type="text"
              inputMode="decimal"
              value={marketValueAtPurchase}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, '');
                setMarketValueAtPurchase(value);
              }}
              placeholder={language === 'el' ? 'π.χ. 20000' : 'e.g. 20000'}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Purchase Date - for depreciation calculation */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="purchase-date">{language === 'el' ? 'Ημερομηνία Αγοράς' : 'Purchase Date'}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      {language === 'el' 
                        ? 'Η ημερομηνία αγοράς χρησιμοποιείται για τον υπολογισμό απόσβεσης βάσει χρόνου.'
                        : 'The purchase date is used for calculating time-based depreciation.'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="purchase-date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Initial Mileage - for depreciation calculation */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="initial-mileage">{language === 'el' ? 'Χιλιόμετρα κατά την Αγορά' : 'Mileage at Purchase (km)'}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      {language === 'el' 
                        ? 'Τα χιλιόμετρα όταν αγοράστηκε το όχημα. Χρησιμοποιείται για τον υπολογισμό απόσβεσης βάσει χιλιομέτρων.'
                        : 'The mileage when the vehicle was purchased. Used for calculating mileage-based depreciation.'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="initial-mileage"
              type="number"
              value={initialMileage}
              onChange={(e) => setInitialMileage(Number(e.target.value))}
              min={0}
              placeholder="0"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {language === 'el' ? 'Ακύρωση' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (language === 'el' ? 'Αποθήκευση...' : 'Saving...') : (language === 'el' ? 'Αποθήκευση' : 'Save Changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}