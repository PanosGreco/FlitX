import { useState, useRef, useEffect } from "react";
import { format, differenceInDays } from "date-fns";
import { CalendarIcon, Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [contractPhoto, setContractPhoto] = useState<File | null>(null);
  const [contractPhotoPreview, setContractPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pricingMode, setPricingMode] = useState<'fixed' | 'adjusted'>('fixed');
  const [adjustedRate, setAdjustedRate] = useState(vehicleDailyRate);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Update preselected dates when props change
  useEffect(() => {
    if (preselectedStartDate) setStartDate(preselectedStartDate);
    if (preselectedEndDate) setEndDate(preselectedEndDate);
  }, [preselectedStartDate, preselectedEndDate]);

  // Reset adjusted rate when vehicle rate changes
  useEffect(() => {
    setAdjustedRate(vehicleDailyRate);
  }, [vehicleDailyRate]);

  // Calculate rental days and total amount
  const rentalDays = startDate && endDate 
    ? Math.max(1, differenceInDays(endDate, startDate) + 1)
    : 0;
  
  const effectiveRate = pricingMode === 'fixed' ? vehicleDailyRate : adjustedRate;
  const totalAmount = rentalDays * effectiveRate;

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
    const fileName = `${userId}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('rental-contracts')
      .upload(fileName, file);

    if (error) {
      console.error('Error uploading photo:', error);
      return null;
    }

    return data.path;
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
        customer_name: customerName,
        notes: notes,
        total_amount: totalAmount,
        status: 'confirmed' as const
      };

      const { data: booking, error: bookingError } = await supabase
        .from('rental_bookings')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) {
        throw bookingError;
      }

      // Automatically create income record for this booking
      const { error: incomeError } = await supabase.from('financial_records').insert({
        user_id: session.session.user.id,
        vehicle_id: vehicleId,
        booking_id: booking.id,
        type: 'income',
        category: 'rental',
        amount: totalAmount,
        date: format(startDate, 'yyyy-MM-dd'),
        description: `Rental: ${vehicleName} - ${customerName} (${rentalDays} days @ $${effectiveRate}/day)`
      });

      if (incomeError) {
        console.error('Error creating income record:', incomeError);
        // Don't fail the booking, just log the error
      }

      // Update vehicle status to rented
      await supabase
        .from('vehicles')
        .update({ status: 'rented' })
        .eq('id', vehicleId);

      toast({
        title: "Booking Created",
        description: `Rental booked: $${totalAmount.toFixed(2)} (${rentalDays} days @ $${effectiveRate}/day)`,
      });

      onBookingAdded(booking);
      onClose();
      
      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setCustomerName("");
      setNotes("");
      setContractPhoto(null);
      setContractPhotoPreview(null);
      setPricingMode('fixed');
      setAdjustedRate(vehicleDailyRate);
      
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
          <div>
            <Label htmlFor="customer-name">Customer Name</Label>
            <Input
              id="customer-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
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
              <Label>End Date</Label>
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
          </div>

          {/* Pricing Section */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <Label className="text-base font-semibold">Pricing</Label>
            
            <RadioGroup 
              value={pricingMode} 
              onValueChange={(v) => setPricingMode(v as 'fixed' | 'adjusted')}
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

            {rentalDays > 0 && (
              <div className="pt-3 border-t">
                <div className="flex justify-between text-sm">
                  <span>{rentalDays} day{rentalDays > 1 ? 's' : ''} × ${effectiveRate}/day</span>
                  <span className="font-semibold text-green-600">${totalAmount.toFixed(2)}</span>
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