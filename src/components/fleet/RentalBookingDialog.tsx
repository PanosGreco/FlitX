import { useState, useRef } from "react";
import { format } from "date-fns";
import { CalendarIcon, Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RentalBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  vehicleName: string;
  onBookingAdded: (booking: any) => void;
}

export function RentalBookingDialog({ 
  isOpen, 
  onClose, 
  vehicleId, 
  vehicleName, 
  onBookingAdded 
}: RentalBookingDialogProps) {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [contractPhoto, setContractPhoto] = useState<File | null>(null);
  const [contractPhotoPreview, setContractPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const createDailyProgramEntries = async (booking: any) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      // Create delivery entry for start date
      const deliveryTask = {
        id: crypto.randomUUID(),
        type: 'delivery',
        vehicleId: vehicleId,
        vehicleName: vehicleName,
        scheduledTime: '09:00',
        notes: `Rental delivery to ${customerName}. ${notes}`,
        completed: false,
        date: format(booking.start_date, 'yyyy-MM-dd'),
        rental_booking_id: booking.id
      };

      // Create return entry for end date
      const returnTask = {
        id: crypto.randomUUID(),
        type: 'return',
        vehicleId: vehicleId,
        vehicleName: vehicleName,
        scheduledTime: '17:00',
        notes: `Rental return from ${customerName}. ${notes}`,
        completed: false,
        date: format(booking.end_date, 'yyyy-MM-dd'),
        rental_booking_id: booking.id
      };

      // Store in localStorage for now (would be better to have a proper daily_tasks table)
      const existingTasks = JSON.parse(localStorage.getItem('dailyTasks') || '[]');
      const updatedTasks = [...existingTasks, deliveryTask, returnTask];
      localStorage.setItem('dailyTasks', JSON.stringify(updatedTasks));

      toast({
        title: "Daily Program Updated",
        description: "Rental entries added to Daily Program",
      });
    } catch (error) {
      console.error('Error creating daily program entries:', error);
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
        contract_photo_path: contractPhotoPath
      };

      const { data, error } = await supabase
        .from('rental_bookings')
        .insert(bookingData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Create daily program entries
      await createDailyProgramEntries(data);

      // Record rental income
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const totalAmount = days * 50; // Default daily rate - should get from vehicle data

      await supabase.from('financial_records').insert({
        user_id: session.session.user.id,
        vehicle_id: vehicleId,
        type: 'income',
        category: 'rental',
        amount: totalAmount,
        date: startDate.toISOString().split('T')[0],
        description: `Rental booking for ${vehicleName} - ${customerName}`
      });

      toast({
        title: "Booking Created",
        description: `Rental booking created for ${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`,
      });

      onBookingAdded(data);
      onClose();
      
      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setCustomerName("");
      setNotes("");
      setContractPhoto(null);
      setContractPhotoPreview(null);
      
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
            {isLoading ? "Creating..." : "Create Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}