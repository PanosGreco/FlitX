import { useState, useRef, useEffect } from "react";
import { format, differenceInDays, differenceInHours, eachDayOfInterval, isBefore, isAfter } from "date-fns";
import { CalendarIcon, Camera, Upload, X, MapPin, Clock, Plus, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContentManualScroll, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AdditionalCost {
  id: string;
  amount: number;
  note: string;
}

interface ExistingBooking {
  id: string;
  start_date: string;
  end_date: string;
  customer_name: string;
}

interface RentalBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  vehicleName: string;
  onBookingAdded: (booking: any) => void;
  vehicleDailyRate?: number;
  preselectedStartDate?: Date;
  preselectedEndDate?: Date;
}

export function RentalBookingDialog({ 
  isOpen, 
  onClose, 
  vehicleId, 
  vehicleName, 
  onBookingAdded,
  vehicleDailyRate = 0,
  preselectedStartDate,
  preselectedEndDate
}: RentalBookingDialogProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(preselectedStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(preselectedEndDate);
  const [pickupTime, setPickupTime] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [incomeSourceType, setIncomeSourceType] = useState("walk_in");
  const [incomeSourceSpecification, setIncomeSourceSpecification] = useState("");
  const [contractPhoto, setContractPhoto] = useState<File | null>(null);
  const [contractPhotoPreview, setContractPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pricingMode, setPricingMode] = useState<'fixed' | 'adjusted' | 'custom'>('fixed');
  const [adjustedRate, setAdjustedRate] = useState(vehicleDailyRate);
  const [customTotalPrice, setCustomTotalPrice] = useState(0);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([]);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch existing bookings for conflict detection
  useEffect(() => {
    if (isOpen && vehicleId) {
      fetchExistingBookings();
    }
  }, [isOpen, vehicleId]);

  const fetchExistingBookings = async () => {
    const { data } = await supabase
      .from('rental_bookings')
      .select('id, start_date, end_date, customer_name')
      .eq('vehicle_id', vehicleId)
      .in('status', ['confirmed', 'active', 'pending']);
    setExistingBookings(data || []);
  };

  // Check for conflicts when dates change
  useEffect(() => {
    if (startDate && endDate && existingBookings.length > 0) {
      const newStart = startDate;
      const newEnd = endDate;
      
      const conflict = existingBookings.find(booking => {
        const bookingStart = new Date(booking.start_date);
        const bookingEnd = new Date(booking.end_date);
        // Check if ranges overlap
        return !(isAfter(newStart, bookingEnd) || isBefore(newEnd, bookingStart));
      });
      
      if (conflict) {
        setConflictError(`This vehicle is already booked from ${format(new Date(conflict.start_date), 'dd MMM')} to ${format(new Date(conflict.end_date), 'dd MMM')} for ${conflict.customer_name}.`);
      } else {
        setConflictError(null);
      }
    } else {
      setConflictError(null);
    }
  }, [startDate, endDate, existingBookings]);

  // Update preselected dates when props change
  useEffect(() => {
    if (preselectedStartDate) setStartDate(preselectedStartDate);
    if (preselectedEndDate) setEndDate(preselectedEndDate);
  }, [preselectedStartDate, preselectedEndDate]);

  // Reset adjusted rate when vehicle rate changes
  useEffect(() => {
    setAdjustedRate(vehicleDailyRate);
  }, [vehicleDailyRate]);

  // Generate 24-hour time options (00:00 to 23:00)
  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  // Calculate rental days based on 24-HOUR CYCLES with 1-hour grace period
  // Base: end_date - start_date = number of days
  // With times: calculate exact hours, apply grace period
  const calculateRentalDays = () => {
    if (!startDate || !endDate) return 0;
    
    // Base calculation: difference in days
    const baseDays = differenceInDays(endDate, startDate);
    
    // If times are provided, calculate with precision
    if (pickupTime && returnTime) {
      const pickupDateTime = new Date(startDate);
      const [pickupHours, pickupMinutes] = pickupTime.split(':').map(Number);
      pickupDateTime.setHours(pickupHours, pickupMinutes, 0, 0);
      
      const returnDateTime = new Date(endDate);
      const [returnHours, returnMinutes] = returnTime.split(':').map(Number);
      returnDateTime.setHours(returnHours, returnMinutes, 0, 0);
      
      const totalHours = differenceInHours(returnDateTime, pickupDateTime);
      const fullDays = Math.floor(totalHours / 24);
      const remainderHours = totalHours % 24;
      
      // Grace period: up to 1 hour late = no extra charge
      // 2+ hours late = extra day charged
      // Early return = still charged for full 24h cycles
      if (remainderHours > 1) {
        return Math.max(1, fullDays + 1);
      }
      
      return Math.max(1, fullDays);
    }
    
    // Without times, use base date calculation
    return Math.max(1, baseDays);
  };

  const rentalDays = calculateRentalDays();
  
  const effectiveRate = pricingMode === 'fixed' ? vehicleDailyRate : adjustedRate;
  const baseAmount = rentalDays * effectiveRate;
  const additionalCostsTotal = additionalCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const totalAmount = pricingMode === 'custom' ? customTotalPrice : (baseAmount + additionalCostsTotal);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setContractPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setContractPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleRemovePhoto = () => {
    setContractPhoto(null);
    setContractPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const uploadContractPhoto = async (file: File, userId: string): Promise<string | null> => {
    // Sanitize filename to prevent path traversal
    const safeFilename = file.name
      .replace(/\.\./g, '') // Remove path traversal sequences
      .replace(/[\/\\]/g, '') // Remove path separators
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
      .substring(0, 100);
    
    const fileName = `${userId}/${Date.now()}_${safeFilename}`;
    const { data, error } = await supabase.storage
      .from('rental-contracts')
      .upload(fileName, file);

    if (error) {
      console.error('Error uploading photo:', error);
      return null;
    }

    return data.path;
  };

  const createDailyTasks = async (
    userId: string,
    bookingId: string,
    contractPath: string | null
  ) => {
    if (!startDate || !endDate) return;

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    // Create Delivery task (on pickup date)
    const deliveryTask = {
      user_id: userId,
      task_type: 'delivery',
      vehicle_id: vehicleId,
      due_date: startDateStr,
      due_time: pickupTime || null,
      description: notes || null,
      title: `${vehicleName} - ${customerName}`,
      status: 'pending' as const,
      location: pickupLocation || null,
      booking_id: bookingId,
      contract_path: contractPath
    };

    // Create Return task (on return date)
    const returnTask = {
      user_id: userId,
      task_type: 'return',
      vehicle_id: vehicleId,
      due_date: endDateStr,
      due_time: returnTime || null,
      description: notes || null,
      title: `${vehicleName} - ${customerName}`,
      status: 'pending' as const,
      location: dropoffLocation || null,
      booking_id: bookingId,
      contract_path: contractPath
    };

    const { error: deliveryError } = await supabase
      .from('daily_tasks')
      .insert([deliveryTask]);

    if (deliveryError) {
      console.error('Error creating delivery task:', deliveryError);
    }

    const { error: returnError } = await supabase
      .from('daily_tasks')
      .insert([returnTask]);

    if (returnError) {
      console.error('Error creating return task:', returnError);
    }
  };

  const handleSaveBooking = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive"
      });
      return;
    }

    if (!customerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter customer name",
        variant: "destructive"
      });
      return;
    }

    if (effectiveRate <= 0) {
      toast({
        title: "Error",
        description: "Please set a valid daily rate",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('User not authenticated');
      }

      let contractPhotoPath = null;
      if (contractPhoto) {
        contractPhotoPath = await uploadContractPhoto(contractPhoto, session.session.user.id);
      }

      const bookingData = {
        vehicle_id: vehicleId,
        user_id: session.session.user.id,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        pickup_time: pickupTime || null,
        return_time: returnTime || null,
        pickup_location: pickupLocation || null,
        dropoff_location: dropoffLocation || null,
        customer_name: customerName,
        notes: notes,
        total_amount: totalAmount,
        status: 'confirmed' as const,
        contract_photo_path: contractPhotoPath
      };

      const { data: booking, error: bookingError } = await supabase
        .from('rental_bookings')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) {
        throw bookingError;
      }

      // Create Daily Program tasks
      await createDailyTasks(session.session.user.id, booking.id, contractPhotoPath);

      // Automatically create income record for base rental amount
      const baseAmountToRecord = pricingMode === 'custom' ? customTotalPrice : baseAmount;
      const { error: incomeError } = await supabase.from('financial_records').insert({
        user_id: session.session.user.id,
        vehicle_id: vehicleId,
        booking_id: booking.id,
        type: 'income',
        category: 'rental',
        amount: baseAmountToRecord,
        date: format(startDate, 'yyyy-MM-dd'),
        description: pricingMode === 'custom' 
          ? `Rental: ${vehicleName} - ${customerName} (Custom price)`
          : `Rental: ${vehicleName} - ${customerName} (${rentalDays} days @ $${effectiveRate}/day)`,
        income_source_type: incomeSourceType,
        income_source_specification: incomeSourceSpecification || null,
        source_section: 'booking'
      });

      if (incomeError) {
        console.error('Error creating income record:', incomeError);
      }

      // Create separate income records for additional costs
      if (pricingMode !== 'custom' && additionalCosts.length > 0) {
        for (const cost of additionalCosts) {
          const { error: additionalIncomeError } = await supabase.from('financial_records').insert({
            user_id: session.session.user.id,
            vehicle_id: vehicleId,
            booking_id: booking.id,
            type: 'income',
            category: 'additional',
            amount: cost.amount,
            date: format(startDate, 'yyyy-MM-dd'),
            description: cost.note ? `Additional: ${cost.note}` : `Additional charge - ${vehicleName}`,
            income_source_type: incomeSourceType,
            income_source_specification: incomeSourceSpecification || null,
            source_section: 'booking'
          });

          if (additionalIncomeError) {
            console.error('Error creating additional income record:', additionalIncomeError);
          }
        }
      }

      toast({
        title: "Booking Created",
        description: `Rental booked: $${totalAmount.toFixed(2)}. Tasks added to Daily Program.`,
      });

      onBookingAdded(booking);
      onClose();
      
      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setPickupTime("");
      setReturnTime("");
      setPickupLocation("");
      setDropoffLocation("");
      setCustomerName("");
      setNotes("");
      setContractPhoto(null);
      setContractPhotoPreview(null);
      setPricingMode('fixed');
      setAdjustedRate(vehicleDailyRate);
      setCustomTotalPrice(0);
      setAdditionalCosts([]);
      setIncomeSourceType('walk_in');
      setIncomeSourceSpecification('');
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Rental Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source Field - Moved to top */}
          <div className="space-y-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <Label className="text-base font-semibold">Booking Source</Label>
            <Select value={incomeSourceType} onValueChange={(value) => {
              setIncomeSourceType(value);
              if (value !== 'collaboration' && value !== 'other') {
                setIncomeSourceSpecification('');
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk_in">Direct Booking</SelectItem>
                <SelectItem value="collaboration">Collaboration</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            
            {(incomeSourceType === 'collaboration' || incomeSourceType === 'other') && (
              <Input
                value={incomeSourceSpecification}
                onChange={(e) => setIncomeSourceSpecification(e.target.value)}
                placeholder={incomeSourceType === 'collaboration' ? 'Partner name...' : 'Specify source...'}
              />
            )}
          </div>

          <div>
            <Label htmlFor="customer-name">Customer Name</Label>
            <Input
              id="customer-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
            />
          </div>

          {/* Pickup Section */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-base font-semibold">Pickup</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMM dd") : <span>Pick date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Time (24h)
                </Label>
                <Select value={pickupTime} onValueChange={setPickupTime}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContentManualScroll scrollHeight="200px">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContentManualScroll>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Location
              </Label>
              <Input
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="Pick-up location"
              />
            </div>
          </div>

          {/* Return Section */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-base font-semibold">Return</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MMM dd") : <span>Pick date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Time (24h)
                </Label>
                <Select value={returnTime} onValueChange={setReturnTime}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContentManualScroll scrollHeight="200px">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContentManualScroll>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Location
              </Label>
              <Input
                value={dropoffLocation}
                onChange={(e) => setDropoffLocation(e.target.value)}
                placeholder="Drop-off location"
              />
            </div>
          </div>

          {/* Pricing Section */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <Label className="text-base font-semibold">Pricing</Label>
            
            <RadioGroup 
              value={pricingMode} 
              onValueChange={(v) => setPricingMode(v as 'fixed' | 'adjusted' | 'custom')}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="font-normal cursor-pointer">
                  Use vehicle rate (${vehicleDailyRate}/day)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="adjusted" id="adjusted" />
                <Label htmlFor="adjusted" className="font-normal cursor-pointer">
                  Custom rate
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">
                  Custom total price
                </Label>
              </div>
            </RadioGroup>

            {pricingMode === 'adjusted' && (
              <div className="pl-6">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={adjustedRate}
                    onChange={(e) => setAdjustedRate(Number(e.target.value))}
                    min={0}
                    step="0.01"
                    className="w-24"
                  />
                  <span className="text-muted-foreground">/day</span>
                </div>
              </div>
            )}

            {pricingMode === 'custom' && (
              <div className="pl-6">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={customTotalPrice}
                    onChange={(e) => setCustomTotalPrice(Number(e.target.value))}
                    min={0}
                    step="0.01"
                    className="w-32"
                    placeholder="Total price"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Overrides all calculations
                </p>
              </div>
            )}

            {/* Additional Costs (only shown when not using custom total) */}
            {pricingMode !== 'custom' && (
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Additional Costs</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAdditionalCosts([...additionalCosts, { id: crypto.randomUUID(), amount: 0, note: '' }])}
                    className="h-7 px-2"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>
                
                {additionalCosts.map((cost, index) => (
                  <div key={cost.id} className="flex items-center gap-2">
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-muted-foreground text-sm">$</span>
                      <Input
                        type="number"
                        value={cost.amount || ''}
                        onChange={(e) => {
                          const updated = [...additionalCosts];
                          updated[index].amount = Number(e.target.value);
                          setAdditionalCosts(updated);
                        }}
                        min={0}
                        step="0.01"
                        className="w-20 h-8"
                        placeholder="0"
                      />
                    </div>
                    <Input
                      value={cost.note}
                      onChange={(e) => {
                        const updated = [...additionalCosts];
                        updated[index].note = e.target.value;
                        setAdditionalCosts(updated);
                      }}
                      placeholder="Note (optional)"
                      className="h-8 flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAdditionalCosts(additionalCosts.filter(c => c.id !== cost.id))}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Total Summary */}
            {rentalDays > 0 && (
              <div className="pt-3 border-t space-y-1">
                {pricingMode !== 'custom' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>{rentalDays} day{rentalDays > 1 ? 's' : ''} × ${effectiveRate}/day</span>
                      <span>${baseAmount.toFixed(2)}</span>
                    </div>
                    {additionalCostsTotal > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Additional costs</span>
                        <span>+${additionalCostsTotal.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between text-sm font-semibold pt-1">
                  <span>Total</span>
                  <span className="text-green-600">${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Rental purpose, special instructions, etc."
              className="resize-none"
              rows={3}
            />
          </div>


          <div>
            <Label>Contract Photo</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCameraCapture}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>

              {contractPhotoPreview && (
                <Card>
                  <CardContent className="p-3">
                    <div className="relative">
                      <img 
                        src={contractPhotoPreview} 
                        alt="Contract preview" 
                        className="w-full h-32 object-cover rounded"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleRemovePhoto}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSaveBooking} disabled={isLoading}>
            {isLoading ? "Creating..." : `Create Booking ($${totalAmount.toFixed(2)})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
