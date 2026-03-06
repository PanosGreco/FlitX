import { useState, useRef, useEffect, useMemo } from "react";
import { format, differenceInDays, differenceInHours, isBefore, isAfter, parseISO, isWithinInterval } from "date-fns";
import { CalendarIcon, Camera, Upload, X, MapPin, Clock, Plus, Trash2, Search, Filter, Car, AlertTriangle, Fuel, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { IncomeSourceSelector } from "@/components/finances/IncomeSourceSelector";
import { useAdditionalCosts, BookingAdditionalCost } from "@/hooks/useAdditionalCosts";
import { useInsuranceTypes } from "@/hooks/useInsuranceTypes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { validateFileSize, compressImage } from "@/utils/imageUtils";
import { useVatSettings } from "@/hooks/useVatSettings";
import { VatControl } from "@/components/finances/VatControl";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string | null;
  daily_rate: number;
  fuel_type: string | null;
  transmission_type: string | null;
  vehicle_type: string;
  type: string;
  status: string;
}

interface ExistingBooking {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  customer_name: string;
}

interface MaintenanceBlock {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  description: string | null;
}

interface VehicleAvailability {
  available: boolean;
  reason?: 'booked' | 'maintenance' | 'repair';
  conflictInfo?: string;
}

interface UnifiedBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedVehicleId?: string;
  preselectedStartDate?: Date;
  preselectedEndDate?: Date;
  embedded?: boolean;
}



export function UnifiedBookingDialog({ 
  isOpen, 
  onClose, 
  onSuccess,
  preselectedVehicleId,
  preselectedStartDate,
  preselectedEndDate,
  embedded = false
}: UnifiedBookingDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { savedCategories, saveBookingCosts, fetchCategories } = useAdditionalCosts();
  const { insuranceTypes, fetchInsuranceTypes, findOrCreateInsuranceType } = useInsuranceTypes();
  const [addingNewInsuranceType, setAddingNewInsuranceType] = useState(false);
  const [newInsuranceTypeName, setNewInsuranceTypeName] = useState("");
  const [vatEnabled, setVatEnabled] = useState(false);
  const { vatRate, setVatRate } = useVatSettings();
  
  // Form state
  const [startDate, setStartDate] = useState<Date | undefined>(preselectedStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(preselectedEndDate);
  const [pickupTime, setPickupTime] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(preselectedVehicleId || "");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [incomeSourceType, setIncomeSourceType] = useState("walk_in");
  const [incomeSourceSpecification, setIncomeSourceSpecification] = useState("");
  const [contractPhoto, setContractPhoto] = useState<File | null>(null);
  const [contractPhotoPreview, setContractPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pricing state
  const [pricingMode, setPricingMode] = useState<'fixed' | 'adjusted' | 'custom'>('fixed');
  const [adjustedRate, setAdjustedRate] = useState(0);
  const [customTotalPrice, setCustomTotalPrice] = useState(0);
  
  // NEW: Structured additional costs
  const [insuranceType, setInsuranceType] = useState("");
  const [insuranceAmount, setInsuranceAmount] = useState<number>(0);
  const [dynamicCosts, setDynamicCosts] = useState<BookingAdditionalCost[]>([]);
  
  // Payment & Fuel state
  const [paymentStatus, setPaymentStatus] = useState<'paid_in_full' | 'balance_due'>('paid_in_full');
  const [balanceDueAmount, setBalanceDueAmount] = useState(0);
  const [fuelLevel, setFuelLevel] = useState("");
  
  // Additional Information state
  const [additionalInfoRows, setAdditionalInfoRows] = useState<{ categoryName: string; subcategoryValue: string; isDefault: boolean }[]>([
    { categoryName: 'Insurance', subcategoryValue: '', isDefault: true }
  ]);
  
  // Data state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allBookings, setAllBookings] = useState<ExistingBooking[]>([]);
  const [allMaintenanceBlocks, setAllMaintenanceBlocks] = useState<MaintenanceBlock[]>([]);
  const [conflictError, setConflictError] = useState<string | null>(null);
  
  // Vehicle search & filter state
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleFilterOpen, setVehicleFilterOpen] = useState(false);
  const [fuelTypeFilter, setFuelTypeFilter] = useState<string[]>([]);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string[]>([]);
  const [transmissionTypeFilter, setTransmissionTypeFilter] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  useEffect(() => {
    if (isOpen && user) {
      fetchAllData();
      fetchCategories();
      fetchInsuranceTypes();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (preselectedVehicleId) setSelectedVehicleId(preselectedVehicleId);
    if (preselectedStartDate) setStartDate(preselectedStartDate);
    if (preselectedEndDate) setEndDate(preselectedEndDate);
  }, [preselectedVehicleId, preselectedStartDate, preselectedEndDate]);

  useEffect(() => {
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (vehicle) {
      setAdjustedRate(vehicle.daily_rate || 0);
    }
  }, [selectedVehicleId, vehicles]);

  // Auto-sync insurance to Additional Information
  useEffect(() => {
    setAdditionalInfoRows(prev => {
      const updated = [...prev];
      const insuranceIdx = updated.findIndex(r => r.categoryName === 'Insurance' && r.isDefault);
      if (insuranceIdx >= 0) {
        updated[insuranceIdx].subcategoryValue = insuranceType ? `${insuranceType}${insuranceAmount > 0 ? ` (€${insuranceAmount})` : ''}` : '';
      }
      return updated;
    });
  }, [insuranceType, insuranceAmount]);

  // Auto-sync dynamic costs to Additional Information
  useEffect(() => {
    setAdditionalInfoRows(prev => {
      // Keep Insurance row and any manually-added non-dynamic rows
      const insuranceRow = prev.find(r => r.categoryName === 'Insurance' && r.isDefault);
      const manualRows = prev.filter(r => !r.isDefault && !dynamicCosts.some(dc => dc.name === r.categoryName));
      
      const dynamicRows = dynamicCosts
        .filter(dc => dc.name && dc.amount > 0)
        .map(dc => ({
          categoryName: dc.name,
          subcategoryValue: `€${dc.amount}`,
          isDefault: false
        }));

      return [
        insuranceRow || { categoryName: 'Insurance', subcategoryValue: '', isDefault: true },
        ...dynamicRows,
        ...manualRows
      ];
    });
  }, [dynamicCosts]);

  const fetchAllData = async () => {
    if (!user) return;
    try {
      const [vehiclesResult, bookingsResult, maintenanceResult] = await Promise.all([
        supabase.from('vehicles').select('id, make, model, year, license_plate, daily_rate, fuel_type, transmission_type, vehicle_type, type, status, is_sold').eq('user_id', user.id),
        supabase.from('rental_bookings').select('id, vehicle_id, start_date, end_date, customer_name').eq('user_id', user.id).in('status', ['confirmed', 'active', 'pending']),
        supabase.from('maintenance_blocks').select('id, vehicle_id, start_date, end_date, description').eq('user_id', user.id)
      ]);
      if (!vehiclesResult.error) setVehicles((vehiclesResult.data || []).filter((v: any) => !v.is_sold));
      if (!bookingsResult.error) setAllBookings(bookingsResult.data || []);
      if (!maintenanceResult.error) setAllMaintenanceBlocks(maintenanceResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const getVehicleAvailability = (vehicleId: string): VehicleAvailability => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle?.status === 'repair') {
      return { available: false, reason: 'repair', conflictInfo: language === 'el' ? 'Μη διαθέσιμο – Χρειάζεται Επισκευή' : 'Unavailable – Needs Repair' };
    }
    if (!startDate || !endDate) return { available: true };
    const vehicleBookings = allBookings.filter(b => b.vehicle_id === vehicleId);
    for (const booking of vehicleBookings) {
      const bookingStart = parseISO(booking.start_date);
      const bookingEnd = parseISO(booking.end_date);
      if (!(isAfter(startDate, bookingEnd) || isBefore(endDate, bookingStart))) {
        return { available: false, reason: 'booked', conflictInfo: language === 'el' ? `Κρατημένο: ${format(bookingStart, 'dd/MM')} - ${format(bookingEnd, 'dd/MM')} (${booking.customer_name})` : `Booked: ${format(bookingStart, 'dd/MM')} - ${format(bookingEnd, 'dd/MM')} (${booking.customer_name})` };
      }
    }
    const vehicleMaintenance = allMaintenanceBlocks.filter(m => m.vehicle_id === vehicleId);
    for (const block of vehicleMaintenance) {
      const maintenanceStart = parseISO(block.start_date);
      const maintenanceEnd = parseISO(block.end_date);
      if (!(isAfter(startDate, maintenanceEnd) || isBefore(endDate, maintenanceStart))) {
        return { available: false, reason: 'maintenance', conflictInfo: language === 'el' ? `Συντήρηση: ${format(maintenanceStart, 'dd/MM')} - ${format(maintenanceEnd, 'dd/MM')}` : `Maintenance: ${format(maintenanceStart, 'dd/MM')} - ${format(maintenanceEnd, 'dd/MM')}` };
      }
    }
    return { available: true };
  };

  const filteredAndSortedVehicles = useMemo(() => {
    let filtered = vehicles;
    if (vehicleSearch.trim()) {
      const search = vehicleSearch.toLowerCase();
      filtered = filtered.filter(v => v.make.toLowerCase().includes(search) || v.model.toLowerCase().includes(search) || v.year.toString().includes(search) || (v.license_plate && v.license_plate.toLowerCase().includes(search)));
    }
    if (fuelTypeFilter.length > 0) filtered = filtered.filter(v => v.fuel_type && fuelTypeFilter.includes(v.fuel_type));
    if (vehicleTypeFilter.length > 0) filtered = filtered.filter(v => vehicleTypeFilter.includes(v.vehicle_type));
    if (transmissionTypeFilter.length > 0) filtered = filtered.filter(v => { const t = v.transmission_type || 'manual'; return transmissionTypeFilter.includes(t); });
    return filtered.sort((a, b) => {
      const aa = getVehicleAvailability(a.id);
      const ab = getVehicleAvailability(b.id);
      if (aa.available && !ab.available) return -1;
      if (!aa.available && ab.available) return 1;
      return 0;
    });
  }, [vehicles, vehicleSearch, fuelTypeFilter, vehicleTypeFilter, transmissionTypeFilter, startDate, endDate, allBookings, allMaintenanceBlocks]);

  const hasActiveFilters = fuelTypeFilter.length > 0 || vehicleTypeFilter.length > 0 || transmissionTypeFilter.length > 0;

  useEffect(() => {
    if (selectedVehicleId && startDate && endDate) {
      const availability = getVehicleAvailability(selectedVehicleId);
      setConflictError(!availability.available ? (availability.conflictInfo || (language === 'el' ? 'Όχημα μη διαθέσιμο' : 'Vehicle unavailable')) : null);
    } else {
      setConflictError(null);
    }
  }, [selectedVehicleId, startDate, endDate, allBookings, allMaintenanceBlocks]);

  const calculateRentalDays = () => {
    if (!startDate || !endDate) return 0;
    const baseDays = differenceInDays(endDate, startDate);
    if (pickupTime && returnTime) {
      const pickupDateTime = new Date(startDate);
      const [pH, pM] = pickupTime.split(':').map(Number);
      pickupDateTime.setHours(pH, pM, 0, 0);
      const returnDateTime = new Date(endDate);
      const [rH, rM] = returnTime.split(':').map(Number);
      returnDateTime.setHours(rH, rM, 0, 0);
      const totalHours = differenceInHours(returnDateTime, pickupDateTime);
      const fullDays = Math.floor(totalHours / 24);
      return Math.max(1, totalHours % 24 > 1 ? fullDays + 1 : fullDays);
    }
    return Math.max(1, baseDays);
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const vehicleDailyRate = selectedVehicle?.daily_rate || 0;
  const rentalDays = calculateRentalDays();
  const effectiveRate = pricingMode === 'fixed' ? vehicleDailyRate : adjustedRate;
  const baseAmount = rentalDays * effectiveRate;
  
  // Insurance cost (only if both type and amount are set)
  const effectiveInsuranceCost = (insuranceType && insuranceAmount > 0) ? insuranceAmount : 0;
  // Dynamic costs total
  const dynamicCostsTotal = dynamicCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
  // All additional costs total
  const allAdditionalCostsTotal = effectiveInsuranceCost + dynamicCostsTotal;
  const totalAmount = pricingMode === 'custom' ? (customTotalPrice + allAdditionalCostsTotal) : (baseAmount + allAdditionalCostsTotal);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const sizeCheck = validateFileSize(file);
      if (!sizeCheck.valid) { toast.error(sizeCheck.message); return; }
      const processed = await compressImage(file);
      setContractPhoto(processed);
      const reader = new FileReader();
      reader.onload = (e) => setContractPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(processed);
    }
  };

  const handleRemovePhoto = () => {
    setContractPhoto(null);
    setContractPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const uploadContractPhoto = async (file: File, userId: string): Promise<string | null> => {
    const safeFilename = file.name.replace(/\.\./g, '').replace(/[\/\\]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
    const fileName = `${userId}/${Date.now()}_${safeFilename}`;
    const { data, error } = await supabase.storage.from('rental-contracts').upload(fileName, file, { contentType: file.type });
    if (error) { console.error('Error uploading photo:', error); return null; }
    return data.path;
  };

  const createDailyTasks = async (userId: string, bookingId: string, contractPath: string | null) => {
    if (!startDate || !endDate || !selectedVehicle) return;
    const vehicleName = `${selectedVehicle.make} ${selectedVehicle.model}`;
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    const deliveryTask = { user_id: userId, task_type: 'delivery', vehicle_id: selectedVehicleId, due_date: startDateStr, due_time: pickupTime || null, description: notes || null, title: `${vehicleName} - ${customerName}`, status: 'pending' as const, location: pickupLocation || null, booking_id: bookingId, contract_path: contractPath };
    const returnTask = { user_id: userId, task_type: 'return', vehicle_id: selectedVehicleId, due_date: endDateStr, due_time: returnTime || null, description: notes || null, title: `${vehicleName} - ${customerName}`, status: 'pending' as const, location: dropoffLocation || null, booking_id: bookingId, contract_path: contractPath };
    await Promise.all([supabase.from('daily_tasks').insert([deliveryTask]), supabase.from('daily_tasks').insert([returnTask])]);
  };

  const addDynamicCost = (name: string = '', amount: number = 0) => {
    setDynamicCosts(prev => [...prev, { id: crypto.randomUUID(), name, amount, isNew: true }]);
  };

  const handleSaveBooking = async () => {
    if (!user || !startDate || !endDate || !selectedVehicleId || !customerName.trim()) {
      toast.error(language === 'el' ? 'Συμπληρώστε όλα τα απαραίτητα πεδία' : 'Please fill all required fields');
      return;
    }
    if (conflictError) {
      toast.error(language === 'el' ? 'Το όχημα δεν είναι διαθέσιμο για αυτές τις ημερομηνίες' : 'Vehicle is not available for these dates');
      return;
    }
    if (effectiveRate <= 0 && pricingMode !== 'custom') {
      toast.error(language === 'el' ? 'Παρακαλώ ορίστε έγκυρη ημερήσια τιμή' : 'Please set a valid daily rate');
      return;
    }

    setIsLoading(true);
    try {
      let contractPhotoPath = null;
      if (contractPhoto) contractPhotoPath = await uploadContractPhoto(contractPhoto, user.id);

      const vehicleName = selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : '';
      const bookingData: any = {
        vehicle_id: selectedVehicleId, user_id: user.id,
        start_date: format(startDate, 'yyyy-MM-dd'), end_date: format(endDate, 'yyyy-MM-dd'),
        pickup_time: pickupTime || null, return_time: returnTime || null,
        pickup_location: pickupLocation || null, dropoff_location: dropoffLocation || null,
        customer_name: customerName, notes,
        total_amount: totalAmount, status: 'confirmed' as const,
        contract_photo_path: contractPhotoPath, fuel_level: fuelLevel || null,
        payment_status: paymentStatus,
        balance_due_amount: paymentStatus === 'balance_due' ? balanceDueAmount : null
      };

      const { data: booking, error: bookingError } = await supabase.from('rental_bookings').insert(bookingData).select().single();
      if (bookingError) throw bookingError;

      await createDailyTasks(user.id, booking.id, contractPhotoPath);

      // Create base rental income record
      const baseAmountToRecord = pricingMode === 'custom' ? customTotalPrice : baseAmount;
      const recordDescription = pricingMode === 'custom' 
          ? `Rental: ${vehicleName} - ${customerName} (Custom price)`
          : `Rental: ${vehicleName} - ${customerName} (${rentalDays} days × €${effectiveRate}/day)`;
      await supabase.from('financial_records').insert({
        user_id: user.id, vehicle_id: selectedVehicleId, booking_id: booking.id,
        type: 'income', category: 'rental', amount: baseAmountToRecord,
        date: format(startDate, 'yyyy-MM-dd'),
        description: recordDescription,
        income_source_type: incomeSourceType,
        income_source_specification: incomeSourceSpecification || null,
        source_section: 'booking'
      });

      // Create SEPARATE income records for each additional cost (always, including custom total)
      // Save insurance type to DB for reuse
      if (insuranceType) {
        await findOrCreateInsuranceType(insuranceType);
      }
      if (effectiveInsuranceCost > 0) {
        await supabase.from('financial_records').insert({
          user_id: user.id, vehicle_id: selectedVehicleId, booking_id: booking.id,
          type: 'income', category: 'additional',
          amount: effectiveInsuranceCost,
          date: format(startDate, 'yyyy-MM-dd'),
          description: `Insurance - ${insuranceType} (Additional Cost) - ${vehicleName}`,
          income_source_type: incomeSourceType,
          income_source_specification: incomeSourceSpecification || null,
          source_section: 'booking'
        });
      }

      for (const cost of dynamicCosts) {
        if (cost.amount > 0 && cost.name) {
          await supabase.from('financial_records').insert({
            user_id: user.id, vehicle_id: selectedVehicleId, booking_id: booking.id,
            type: 'income', category: 'additional',
            amount: cost.amount,
            date: format(startDate, 'yyyy-MM-dd'),
            description: `${cost.name} (Additional Cost) - ${vehicleName}`,
            income_source_type: incomeSourceType,
            income_source_specification: incomeSourceSpecification || null,
            source_section: 'booking'
          });
        }
      }

      // Save additional costs to booking_additional_costs table
      const allCostsToSave: BookingAdditionalCost[] = [];
      if (effectiveInsuranceCost > 0) {
        allCostsToSave.push({ id: 'insurance', name: 'Insurance', amount: effectiveInsuranceCost, insurance_type: insuranceType });
      }
      for (const dc of dynamicCosts) {
        if (dc.amount > 0 && dc.name) {
          allCostsToSave.push(dc);
        }
      }
      if (allCostsToSave.length > 0) {
        await saveBookingCosts(booking.id, allCostsToSave);
      }

      // Save additional information
      const rowsToSave = additionalInfoRows.filter(row => row.subcategoryValue.trim() !== '');
      if (rowsToSave.length > 0) {
        for (const row of rowsToSave) {
          let categoryId: string | null = null;
          const { data: existingCat } = await supabase.from('additional_info_categories').select('id').eq('user_id', user.id).eq('name', row.categoryName.trim()).maybeSingle();
          if (existingCat) {
            categoryId = existingCat.id;
          } else {
            const { data: newCat } = await supabase.from('additional_info_categories').insert({ user_id: user.id, name: row.categoryName.trim(), is_default: row.isDefault }).select('id').single();
            categoryId = newCat?.id || null;
          }
          if (categoryId) {
            await supabase.from('booking_additional_info').insert({ booking_id: booking.id, user_id: user.id, category_id: categoryId, subcategory_value: row.subcategoryValue.trim() });
          }
        }
      }

      toast.success(language === 'el' ? `Κράτηση δημιουργήθηκε: €${totalAmount.toFixed(2)}` : `Booking created: €${totalAmount.toFixed(2)}`);
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(language === 'el' ? 'Σφάλμα δημιουργίας κράτησης' : 'Error creating booking');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStartDate(undefined); setEndDate(undefined);
    setPickupTime(""); setReturnTime("");
    setPickupLocation(""); setDropoffLocation("");
    setSelectedVehicleId(""); setCustomerName(""); setNotes("");
    setContractPhoto(null); setContractPhotoPreview(null);
    setPricingMode('fixed'); setAdjustedRate(0); setCustomTotalPrice(0);
    setInsuranceType(""); setInsuranceAmount(0); setDynamicCosts([]);
    setIncomeSourceType('walk_in'); setIncomeSourceSpecification('');
    setConflictError(null);
    setPaymentStatus('paid_in_full'); setBalanceDueAmount(0); setFuelLevel("");
    setAdditionalInfoRows([{ categoryName: 'Insurance', subcategoryValue: '', isDefault: true }]);
    setVehicleSearch(""); setFuelTypeFilter([]); setVehicleTypeFilter([]); setTransmissionTypeFilter([]);
    setVatEnabled(false);
  };

  const formContent = (
    <>
      <div>
        <div className="space-y-4">
          {/* Booking Source */}
          <div className="space-y-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <IncomeSourceSelector
              incomeSourceType={incomeSourceType}
              incomeSourceSpecification={incomeSourceSpecification}
              onSourceChange={(type, spec) => { setIncomeSourceType(type); setIncomeSourceSpecification(spec); }}
            />
          </div>

          {/* Customer Name */}
          <div>
            <Label>{language === 'el' ? 'Όνομα Πελάτη' : 'Customer Name'} *</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={language === 'el' ? 'Πλήρες όνομα' : 'Full name'} />
          </div>

          {/* Pickup Section */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-base font-semibold">{language === 'el' ? 'Παραλαβή' : 'Pick-Up'}</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{language === 'el' ? 'Ημερομηνία' : 'Date'}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd MMM") : (language === 'el' ? 'Επιλέξτε' : 'Pick date')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{language === 'el' ? 'Ώρα' : 'Time'}</Label>
                <Select value={pickupTime} onValueChange={setPickupTime}>
                  <SelectTrigger><SelectValue placeholder={language === 'el' ? 'Ώρα' : 'Time'} /></SelectTrigger>
                  <SelectContent>{timeOptions.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{language === 'el' ? 'Τοποθεσία' : 'Location'}</Label>
              <Input value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} placeholder={language === 'el' ? 'Διεύθυνση παραλαβής' : 'Pickup location'} />
            </div>
          </div>

          {/* Return Section */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-base font-semibold">{language === 'el' ? 'Επιστροφή' : 'Drop-Off'}</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{language === 'el' ? 'Ημερομηνία' : 'Date'}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd MMM") : (language === 'el' ? 'Επιλέξτε' : 'Pick date')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => startDate ? isBefore(date, startDate) : false} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{language === 'el' ? 'Ώρα' : 'Time'}</Label>
                <Select value={returnTime} onValueChange={setReturnTime}>
                  <SelectTrigger><SelectValue placeholder={language === 'el' ? 'Ώρα' : 'Time'} /></SelectTrigger>
                  <SelectContent>{timeOptions.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{language === 'el' ? 'Τοποθεσία' : 'Location'}</Label>
              <Input value={dropoffLocation} onChange={(e) => setDropoffLocation(e.target.value)} placeholder={language === 'el' ? 'Διεύθυνση επιστροφής' : 'Drop-off location'} />
            </div>
          </div>

          {/* Vehicle Selection with Search and Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">{language === 'el' ? 'Όχημα' : 'Vehicle'} *</Label>
              <Popover open={vehicleFilterOpen} onOpenChange={setVehicleFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <Filter className="h-3.5 w-3.5 mr-1" />
                    {language === 'el' ? 'Φίλτρα' : 'Filters'}
                    {hasActiveFilters && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{fuelTypeFilter.length + vehicleTypeFilter.length}</Badge>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{language === 'el' ? 'Φίλτρα' : 'Filters'}</span>
                      {hasActiveFilters && <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setFuelTypeFilter([]); setVehicleTypeFilter([]); setTransmissionTypeFilter([]); }}>{language === 'el' ? 'Καθαρισμός' : 'Clear'}</Button>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{language === 'el' ? 'Τύπος' : 'Type'}</Label>
                      <div className="flex gap-2">
                        {['car', 'motorbike'].map(type => (
                          <Button key={type} variant={vehicleTypeFilter.includes(type) ? 'default' : 'outline'} size="sm" onClick={() => setVehicleTypeFilter(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])} className="flex-1 text-xs h-7">
                            {type === 'car' ? (language === 'el' ? 'Αυτοκίνητο' : 'Car') : (language === 'el' ? 'Μηχανή' : 'Motorbike')}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{language === 'el' ? 'Καύσιμο' : 'Fuel'}</Label>
                      <div className="grid grid-cols-2 gap-1">
                        {['petrol', 'diesel', 'electric', 'hybrid'].map(fuel => (
                          <label key={fuel} className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox checked={fuelTypeFilter.includes(fuel)} onCheckedChange={() => setFuelTypeFilter(prev => prev.includes(fuel) ? prev.filter(f => f !== fuel) : [...prev, fuel])} className="h-3.5 w-3.5" />
                            <span className="capitalize">{fuel === 'petrol' ? (language === 'el' ? 'Βενζίνη' : 'Petrol') : fuel}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{language === 'el' ? 'Κιβώτιο' : 'Transmission'}</Label>
                      <div className="flex gap-2">
                        {['manual', 'automatic'].map(transmission => (
                          <Button key={transmission} variant={transmissionTypeFilter.includes(transmission) ? 'default' : 'outline'} size="sm" onClick={() => setTransmissionTypeFilter(prev => prev.includes(transmission) ? prev.filter(t => t !== transmission) : [...prev, transmission])} className="flex-1 text-xs h-7">
                            {transmission === 'manual' ? (language === 'el' ? 'Χειροκίνητο' : 'Manual') : (language === 'el' ? 'Αυτόματο' : 'Automatic')}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={vehicleSearch} onChange={(e) => setVehicleSearch(e.target.value)} className="pl-9" placeholder={language === 'el' ? 'Αναζήτηση οχήματος...' : 'Search vehicle...'} />
            </div>

            <Select value={selectedVehicleId} onValueChange={(value) => { const a = getVehicleAvailability(value); if (a.available) setSelectedVehicleId(value); }}>
              <SelectTrigger className={cn(conflictError && "border-destructive")}>
                <SelectValue placeholder={language === 'el' ? 'Επιλέξτε όχημα' : 'Select vehicle'} />
              </SelectTrigger>
              <SelectContent>
                <TooltipProvider>
                  {filteredAndSortedVehicles.map(vehicle => {
                    const availability = getVehicleAvailability(vehicle.id);
                    const isUnavailable = !availability.available;
                    return (
                      <Tooltip key={vehicle.id}>
                        <TooltipTrigger asChild>
                          <SelectItem value={vehicle.id} disabled={isUnavailable} className={cn(isUnavailable && "cursor-not-allowed")}>
                            <div className="flex items-center gap-2">
                              {isUnavailable && <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
                              <span className={cn(isUnavailable && "line-through")}>{vehicle.make} {vehicle.model} {vehicle.year}{vehicle.license_plate && ` (${vehicle.license_plate})`}</span>
                              {isUnavailable && <Badge variant={availability.reason === 'booked' ? 'destructive' : 'secondary'} className={cn("text-[11px] h-5 px-1.5 ml-auto", availability.reason === 'repair' && "bg-orange-100 text-orange-800 border-orange-200")}>{availability.reason === 'booked' ? (language === 'el' ? 'Κρατημένο' : 'Booked') : availability.reason === 'repair' ? (language === 'el' ? 'Επισκευή' : 'Needs Repair') : (language === 'el' ? 'Συντήρηση' : 'Maintenance')}</Badge>}
                              {!isUnavailable && vehicle.daily_rate > 0 && <span className="text-muted-foreground text-xs ml-auto">€{vehicle.daily_rate}/day</span>}
                            </div>
                          </SelectItem>
                        </TooltipTrigger>
                        {isUnavailable && <TooltipContent side="left"><p>{availability.conflictInfo}</p></TooltipContent>}
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
                {filteredAndSortedVehicles.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">{language === 'el' ? 'Δεν βρέθηκαν οχήματα' : 'No vehicles found'}</div>}
              </SelectContent>
            </Select>
          </div>

          {/* Conflict Error */}
          {conflictError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{conflictError}</AlertDescription></Alert>}

          {/* Pricing Section */}
          {selectedVehicleId && rentalDays > 0 && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <Label className="text-base font-semibold">{language === 'el' ? 'Τιμολόγηση' : 'Pricing'}</Label>
              
              <RadioGroup value={pricingMode} onValueChange={(v) => setPricingMode(v as 'fixed' | 'adjusted' | 'custom')} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed" className="font-normal cursor-pointer">{language === 'el' ? 'Τιμή οχήματος' : 'Vehicle rate'} (€{vehicleDailyRate}/{language === 'el' ? 'ημέρα' : 'day'})</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="adjusted" id="adjusted" />
                  <Label htmlFor="adjusted" className="font-normal cursor-pointer">{language === 'el' ? 'Προσαρμοσμένη τιμή' : 'Custom rate'}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="font-normal cursor-pointer">{language === 'el' ? 'Συνολική τιμή' : 'Custom total'}</Label>
                </div>
              </RadioGroup>

              {pricingMode === 'adjusted' && (
                <div className="pl-6 flex items-center gap-2">
                  <span className="text-muted-foreground">€</span>
                  <Input type="number" value={adjustedRate} onChange={(e) => setAdjustedRate(Number(e.target.value))} min={0} step="0.01" className="w-24" />
                  <span className="text-muted-foreground">/{language === 'el' ? 'ημέρα' : 'day'}</span>
                </div>
              )}

              {pricingMode === 'custom' && (
                <div className="pl-6 flex items-center gap-2">
                  <span className="text-muted-foreground">€</span>
                  <Input type="number" value={customTotalPrice} onChange={(e) => setCustomTotalPrice(Number(e.target.value))} min={0} step="0.01" className="w-32" placeholder={language === 'el' ? 'Σύνολο' : 'Total'} />
                </div>
              )}

              {/* Additional Costs Section - always visible */}
              {(
                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{language === 'el' ? 'Επιπλέον Χρεώσεις' : 'Additional Costs'}</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => addDynamicCost()} className="h-7 px-2">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      {language === 'el' ? 'Προσθήκη' : 'Add'}
                    </Button>
                  </div>

                  {/* Insurance (always visible) */}
                  <div className="space-y-2 p-2.5 bg-background/60 rounded-md border border-border/50">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-sm font-medium">{language === 'el' ? 'Ασφάλεια' : 'Insurance'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {addingNewInsuranceType ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            value={newInsuranceTypeName}
                            onChange={(e) => setNewInsuranceTypeName(e.target.value)}
                            placeholder={language === 'el' ? 'Νέος τύπος...' : 'New type...'}
                            className="h-8 flex-1"
                            autoFocus
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter' && newInsuranceTypeName.trim()) {
                                const created = await findOrCreateInsuranceType(newInsuranceTypeName.trim());
                                if (created) setInsuranceType(created.name_original);
                                setNewInsuranceTypeName("");
                                setAddingNewInsuranceType(false);
                              } else if (e.key === 'Escape') {
                                setNewInsuranceTypeName("");
                                setAddingNewInsuranceType(false);
                              }
                            }}
                          />
                          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={async () => {
                            if (newInsuranceTypeName.trim()) {
                              const created = await findOrCreateInsuranceType(newInsuranceTypeName.trim());
                              if (created) setInsuranceType(created.name_original);
                            }
                            setNewInsuranceTypeName("");
                            setAddingNewInsuranceType(false);
                          }}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setNewInsuranceTypeName(""); setAddingNewInsuranceType(false); }}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Select value={insuranceType} onValueChange={(val) => {
                          if (val === '__add_new__') {
                            setAddingNewInsuranceType(true);
                          } else {
                            setInsuranceType(val);
                          }
                        }}>
                          <SelectTrigger className="h-8 flex-1">
                            <SelectValue placeholder={language === 'el' ? 'Τύπος ασφάλειας' : 'Insurance type'} />
                          </SelectTrigger>
                          <SelectContent>
                            {insuranceTypes.map(type => (
                              <SelectItem key={type.id} value={type.name_original}>{type.name_original}</SelectItem>
                            ))}
                            <SelectItem value="__add_new__" className="text-primary font-medium">
                              <span className="flex items-center gap-1"><Plus className="h-3 w-3" />{language === 'el' ? 'Προσθήκη Νέου' : 'Add New'}</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-muted-foreground text-sm">€</span>
                        <Input type="number" value={insuranceAmount || ''} onChange={(e) => setInsuranceAmount(Number(e.target.value))} min={0} step="0.01" className="w-20 h-8" placeholder="0" />
                      </div>
                    </div>
                    {(!insuranceType || insuranceAmount <= 0) && (insuranceType || insuranceAmount > 0) && (
                      <p className="text-[11px] text-muted-foreground">{language === 'el' ? 'Συμπληρώστε τύπο και ποσό για να συμπεριληφθεί' : 'Fill both type and amount to include'}</p>
                    )}
                  </div>

                  {/* Dynamic costs */}
                  {dynamicCosts.map((cost, index) => (
                    <div key={cost.id} className="flex items-center gap-2">
                      <Input
                        value={cost.name}
                        onChange={(e) => {
                          const updated = [...dynamicCosts];
                          updated[index] = { ...updated[index], name: e.target.value };
                          setDynamicCosts(updated);
                        }}
                        placeholder={language === 'el' ? 'Όνομα χρέωσης' : 'Cost name'}
                        className="h-8 flex-1"
                      />
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-muted-foreground text-sm">€</span>
                        <Input
                          type="number"
                          value={cost.amount || ''}
                          onChange={(e) => {
                            const updated = [...dynamicCosts];
                            updated[index] = { ...updated[index], amount: Number(e.target.value) };
                            setDynamicCosts(updated);
                          }}
                          min={0} step="0.01" className="w-20 h-8" placeholder="0"
                        />
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setDynamicCosts(dynamicCosts.filter(c => c.id !== cost.id))} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}

                  {/* Saved Additional Cost Categories */}
                  {savedCategories.length > 0 && dynamicCosts.length === 0 && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{language === 'el' ? 'Αποθηκευμένες Χρεώσεις' : 'Saved Additional Costs'}</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {savedCategories.map(cat => (
                            <Button
                              key={cat.id}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => addDynamicCost(cat.name)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {cat.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Show saved categories when there are existing dynamic costs too */}
                  {savedCategories.length > 0 && dynamicCosts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {savedCategories
                        .filter(cat => !dynamicCosts.some(dc => dc.name.toLowerCase() === cat.name.toLowerCase()))
                        .map(cat => (
                          <Button
                            key={cat.id}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-[11px] opacity-70"
                            onClick={() => addDynamicCost(cat.name)}
                          >
                            <Plus className="h-2.5 w-2.5 mr-0.5" />
                            {cat.name}
                          </Button>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* VAT Control */}
              <VatControl
                vatEnabled={vatEnabled}
                onVatEnabledChange={setVatEnabled}
                vatRate={vatRate}
                onVatRateChange={setVatRate}
              />

              {/* Analytical Price Breakdown */}
              <div className="pt-3 border-t space-y-1">
                {pricingMode === 'custom' ? (
                  <div className="flex justify-between text-sm">
                    <span>{language === 'el' ? 'Συνολική τιμή' : 'Custom total'}</span>
                    <span>€{customTotalPrice.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span>{rentalDays} {rentalDays > 1 ? (language === 'el' ? 'ημέρες' : 'days') : (language === 'el' ? 'ημέρα' : 'day')} × €{effectiveRate}/{language === 'el' ? 'ημέρα' : 'day'}</span>
                    <span>€{baseAmount.toFixed(2)}</span>
                  </div>
                )}
                {effectiveInsuranceCost > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{language === 'el' ? 'Ασφάλεια' : 'Insurance'} ({insuranceType})</span>
                    <span>+€{effectiveInsuranceCost.toFixed(2)}</span>
                  </div>
                )}
                {dynamicCosts.filter(c => c.amount > 0 && c.name).map(cost => (
                  <div key={cost.id} className="flex justify-between text-sm text-muted-foreground">
                    <span>{cost.name}</span>
                    <span>+€{cost.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold pt-1">
                  <span>{language === 'el' ? 'Σύνολο' : 'Total'}</span>
                  <span className="text-green-600">€{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Status */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-base font-semibold">{language === 'el' ? 'Κατάσταση Πληρωμής' : 'Payment Status'}</Label>
            <RadioGroup value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as 'paid_in_full' | 'balance_due')} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paid_in_full" id="paid_in_full" />
                <Label htmlFor="paid_in_full" className="font-normal cursor-pointer">{language === 'el' ? 'Εξοφλημένο' : 'Paid in Full'}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="balance_due" id="balance_due" />
                <Label htmlFor="balance_due" className="font-normal cursor-pointer">{language === 'el' ? 'Υπόλοιπο' : 'Balance Due'}</Label>
              </div>
            </RadioGroup>
            {paymentStatus === 'balance_due' && (
              <div className="pl-6 flex items-center gap-2">
                <span className="text-muted-foreground">€</span>
                <Input type="number" value={balanceDueAmount || ''} onChange={(e) => setBalanceDueAmount(Number(e.target.value))} min={0} step="0.01" className="w-32" placeholder={language === 'el' ? 'Ποσό' : 'Amount'} />
              </div>
            )}
          </div>

          {/* Fuel Level */}
          <div>
            <Label className="text-base font-semibold flex items-center gap-1"><Fuel className="h-4 w-4" /> {language === 'el' ? 'Επίπεδο Καυσίμου' : 'Fuel Level'}</Label>
            <Input value={fuelLevel} onChange={(e) => setFuelLevel(e.target.value)} placeholder={language === 'el' ? 'π.χ. Full, 75%, 3/4' : 'e.g. Full, 75%, 3/4'} className="placeholder:text-muted-foreground/50" />
          </div>

          {/* Additional Information */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-base font-semibold">{language === 'el' ? 'Πρόσθετες Πληροφορίες' : 'Additional Information'}</Label>
            {additionalInfoRows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                {row.isDefault ? (
                  <div className="w-[100px] flex-shrink-0"><span className="text-sm font-semibold text-foreground">{row.categoryName}</span></div>
                ) : (
                  <Input value={row.categoryName} onChange={(e) => { const u = [...additionalInfoRows]; u[index].categoryName = e.target.value; setAdditionalInfoRows(u); }} placeholder={language === 'el' ? 'Κατηγορία' : 'Category'} className="w-[100px] flex-shrink-0" />
                )}
                <Input
                  value={row.subcategoryValue}
                  onChange={(e) => { const u = [...additionalInfoRows]; u[index].subcategoryValue = e.target.value; setAdditionalInfoRows(u); }}
                  placeholder={row.isDefault ? (language === 'el' ? 'π.χ. Premium' : 'e.g. Premium') : (language === 'el' ? 'Τιμή' : 'Value')}
                  className="flex-1 placeholder:text-muted-foreground/50"
                  disabled={row.isDefault && !!insuranceType}
                />
                {!row.isDefault && (
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => setAdditionalInfoRows(additionalInfoRows.filter((_, i) => i !== index))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setAdditionalInfoRows([...additionalInfoRows, { categoryName: '', subcategoryValue: '', isDefault: false }])} className="w-full">
              <Plus className="h-4 w-4 mr-1" />{language === 'el' ? 'Προσθήκη Κατηγορίας' : 'Add Category'}
            </Button>
          </div>

          {/* Notes */}
          <div>
            <Label>{language === 'el' ? 'Σημειώσεις' : 'Notes'}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={language === 'el' ? 'Σκοπός ενοικίασης, ειδικές οδηγίες...' : 'Rental purpose, special instructions...'} className="resize-none" rows={2} />
          </div>

          {/* Contract Photo */}
          <div>
            <Label>{language === 'el' ? 'Φωτογραφία Συμβολαίου' : 'Contract Photo'}</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />{language === 'el' ? 'Λήψη' : 'Take Photo'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1">
                  <Upload className="h-4 w-4 mr-2" />{language === 'el' ? 'Ανέβασμα' : 'Upload'}
                </Button>
              </div>
              {contractPhotoPreview && (
                <Card><CardContent className="p-3">
                  <div className="relative">
                    <img src={contractPhotoPreview} alt="Contract preview" className="w-full h-32 object-cover rounded" />
                    <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={handleRemovePhoto}><X className="h-4 w-4" /></Button>
                  </div>
                </CardContent></Card>
              )}
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
        </div>

        <div className="pt-4">
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); onClose(); }} disabled={isLoading}>{language === 'el' ? 'Ακύρωση' : 'Cancel'}</Button>
            <Button onClick={handleSaveBooking} disabled={isLoading || !!conflictError}>
              {isLoading ? (language === 'el' ? 'Δημιουργία...' : 'Creating...') : `${language === 'el' ? 'Δημιουργία' : 'Create'} (€${totalAmount.toFixed(2)})`}
            </Button>
          </DialogFooter>
        </div>
      </div>
    </>
  );

  if (embedded) return isOpen ? formContent : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{language === 'el' ? 'Νέα Κράτηση' : 'New Booking'}</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
