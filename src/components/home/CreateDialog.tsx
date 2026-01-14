import { useState, useEffect } from "react";
import { format, isBefore, isAfter, eachDayOfInterval } from "date-fns";
import { CalendarIcon, Car, ClipboardList, Loader2, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface CreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string | null;
  daily_rate: number;
}

interface ExistingBooking {
  id: string;
  start_date: string;
  end_date: string;
  customer_name: string;
}

export function CreateDialog({ isOpen, onClose, onSuccess }: CreateDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'booking' | 'task'>('booking');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Booking form state - in order: pickup date, pickup time, pickup location, return date, return time, return location, vehicle
  const [pickupDate, setPickupDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [returnDate, setReturnDate] = useState<Date>();
  const [returnTime, setReturnTime] = useState("");
  const [returnLocation, setReturnLocation] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Task form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskDate, setTaskDate] = useState<Date>();
  const [taskTime, setTaskTime] = useState("");
  const [taskVehicleId, setTaskVehicleId] = useState<string>("");
  const [taskLocation, setTaskLocation] = useState("");

  // Time options (00:00 to 23:00)
  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  useEffect(() => {
    if (isOpen && user) {
      fetchVehicles();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (selectedVehicleId) {
      fetchExistingBookings(selectedVehicleId);
    }
  }, [selectedVehicleId]);

  useEffect(() => {
    // Check for conflicts
    if (pickupDate && returnDate && existingBookings.length > 0) {
      const conflict = existingBookings.find(booking => {
        const bookingStart = new Date(booking.start_date);
        const bookingEnd = new Date(booking.end_date);
        return !(isAfter(pickupDate, bookingEnd) || isBefore(returnDate, bookingStart));
      });

      if (conflict) {
        setConflictError(
          language === 'el'
            ? `Αυτό το όχημα είναι ήδη κρατημένο από ${format(new Date(conflict.start_date), 'dd MMM')} έως ${format(new Date(conflict.end_date), 'dd MMM')} για ${conflict.customer_name}.`
            : `This vehicle is already booked from ${format(new Date(conflict.start_date), 'dd MMM')} to ${format(new Date(conflict.end_date), 'dd MMM')} for ${conflict.customer_name}.`
        );
      } else {
        setConflictError(null);
      }
    } else {
      setConflictError(null);
    }
  }, [pickupDate, returnDate, existingBookings, language]);

  const fetchVehicles = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('vehicles')
      .select('id, make, model, license_plate, daily_rate')
      .eq('user_id', user.id);

    if (!error) {
      setVehicles(data || []);
    }
  };

  const fetchExistingBookings = async (vehicleId: string) => {
    const { data } = await supabase
      .from('rental_bookings')
      .select('id, start_date, end_date, customer_name')
      .eq('vehicle_id', vehicleId)
      .in('status', ['confirmed', 'active', 'pending']);

    setExistingBookings(data || []);
  };

  const isVehicleAvailable = (vehicleId: string) => {
    if (!pickupDate || !returnDate) return true;
    
    const vehicleBookings = existingBookings.filter(b => 
      vehicles.find(v => v.id === vehicleId)
    );

    return !vehicleBookings.some(booking => {
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = new Date(booking.end_date);
      return !(isAfter(pickupDate, bookingEnd) || isBefore(returnDate, bookingStart));
    });
  };

  const handleCreateBooking = async () => {
    if (!user || !pickupDate || !returnDate || !selectedVehicleId || !customerName.trim()) {
      toast.error(language === 'el' ? 'Συμπληρώστε όλα τα απαραίτητα πεδία' : 'Please fill all required fields');
      return;
    }

    if (conflictError) {
      toast.error(language === 'el' ? 'Υπάρχει διένεξη ημερομηνιών' : 'There is a date conflict');
      return;
    }

    setIsSaving(true);

    try {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      const vehicleName = vehicle ? `${vehicle.make} ${vehicle.model}` : '';

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('rental_bookings')
        .insert({
          user_id: user.id,
          vehicle_id: selectedVehicleId,
          start_date: format(pickupDate, 'yyyy-MM-dd'),
          end_date: format(returnDate, 'yyyy-MM-dd'),
          pickup_time: pickupTime || null,
          return_time: returnTime || null,
          pickup_location: pickupLocation || null,
          dropoff_location: returnLocation || null,
          customer_name: customerName,
          notes: notes || null,
          status: 'confirmed'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create delivery task
      await supabase.from('daily_tasks').insert({
        user_id: user.id,
        task_type: 'delivery',
        vehicle_id: selectedVehicleId,
        due_date: format(pickupDate, 'yyyy-MM-dd'),
        due_time: pickupTime || null,
        location: pickupLocation || null,
        title: `${vehicleName} - ${customerName}`,
        description: notes || null,
        booking_id: booking.id,
        status: 'pending'
      });

      // Create return task
      await supabase.from('daily_tasks').insert({
        user_id: user.id,
        task_type: 'return',
        vehicle_id: selectedVehicleId,
        due_date: format(returnDate, 'yyyy-MM-dd'),
        due_time: returnTime || null,
        location: returnLocation || null,
        title: `${vehicleName} - ${customerName}`,
        description: notes || null,
        booking_id: booking.id,
        status: 'pending'
      });

      toast.success(language === 'el' ? 'Κράτηση δημιουργήθηκε' : 'Booking created');
      resetBookingForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(language === 'el' ? 'Σφάλμα δημιουργίας κράτησης' : 'Error creating booking');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTask = async () => {
    if (!user || !taskTitle.trim() || !taskDate) {
      toast.error(language === 'el' ? 'Συμπληρώστε τίτλο και ημερομηνία' : 'Please fill title and date');
      return;
    }

    setIsSaving(true);

    try {
      await supabase.from('daily_tasks').insert({
        user_id: user.id,
        task_type: 'other',
        vehicle_id: taskVehicleId || null,
        due_date: format(taskDate, 'yyyy-MM-dd'),
        due_time: taskTime || null,
        location: taskLocation || null,
        title: taskTitle,
        description: taskNotes || null,
        status: 'pending'
      });

      toast.success(language === 'el' ? 'Εργασία δημιουργήθηκε' : 'Task created');
      resetTaskForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error(language === 'el' ? 'Σφάλμα δημιουργίας εργασίας' : 'Error creating task');
    } finally {
      setIsSaving(false);
    }
  };

  const resetBookingForm = () => {
    setPickupDate(undefined);
    setPickupTime("");
    setPickupLocation("");
    setReturnDate(undefined);
    setReturnTime("");
    setReturnLocation("");
    setSelectedVehicleId("");
    setCustomerName("");
    setNotes("");
    setConflictError(null);
  };

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskNotes("");
    setTaskDate(undefined);
    setTaskTime("");
    setTaskVehicleId("");
    setTaskLocation("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === 'el' ? 'Δημιουργία' : 'Create'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'booking' | 'task')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="booking" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              {language === 'el' ? 'Κράτηση' : 'Booking'}
            </TabsTrigger>
            <TabsTrigger value="task" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              {language === 'el' ? 'Εργασία' : 'Task'}
            </TabsTrigger>
          </TabsList>

          {/* Booking Form */}
          <TabsContent value="booking" className="space-y-4 mt-4">
            {/* Pickup Date */}
            <div>
              <Label>{language === 'el' ? 'Ημερομηνία Παραλαβής' : 'Pickup Date'} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !pickupDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {pickupDate ? format(pickupDate, 'PPP') : (language === 'el' ? 'Επιλέξτε ημερομηνία' : 'Select date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={pickupDate}
                    onSelect={setPickupDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Pickup Time */}
            <div>
              <Label>{language === 'el' ? 'Ώρα Παραλαβής' : 'Pickup Time'}</Label>
              <Select value={pickupTime} onValueChange={setPickupTime}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'el' ? 'Επιλέξτε ώρα' : 'Select time'} />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pickup Location */}
            <div>
              <Label>{language === 'el' ? 'Τοποθεσία Παραλαβής' : 'Pickup Location'}</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="pl-10"
                  placeholder={language === 'el' ? 'Διεύθυνση παραλαβής' : 'Pickup address'}
                />
              </div>
            </div>

            {/* Return Date */}
            <div>
              <Label>{language === 'el' ? 'Ημερομηνία Επιστροφής' : 'Return Date'} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !returnDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {returnDate ? format(returnDate, 'PPP') : (language === 'el' ? 'Επιλέξτε ημερομηνία' : 'Select date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={returnDate}
                    onSelect={setReturnDate}
                    disabled={(date) => pickupDate ? isBefore(date, pickupDate) : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Return Time */}
            <div>
              <Label>{language === 'el' ? 'Ώρα Επιστροφής' : 'Return Time'}</Label>
              <Select value={returnTime} onValueChange={setReturnTime}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'el' ? 'Επιλέξτε ώρα' : 'Select time'} />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Return Location */}
            <div>
              <Label>{language === 'el' ? 'Τοποθεσία Επιστροφής' : 'Return Location'}</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={returnLocation}
                  onChange={(e) => setReturnLocation(e.target.value)}
                  className="pl-10"
                  placeholder={language === 'el' ? 'Διεύθυνση επιστροφής' : 'Return address'}
                />
              </div>
            </div>

            {/* Vehicle Selection */}
            <div>
              <Label>{language === 'el' ? 'Όχημα' : 'Vehicle'} *</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'el' ? 'Επιλέξτε όχημα' : 'Select vehicle'} />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(vehicle => {
                    const available = isVehicleAvailable(vehicle.id);
                    return (
                      <SelectItem 
                        key={vehicle.id} 
                        value={vehicle.id}
                        disabled={!available}
                        className={cn(!available && "opacity-50")}
                      >
                        {vehicle.make} {vehicle.model} {vehicle.license_plate && `(${vehicle.license_plate})`}
                        {!available && ` - ${language === 'el' ? 'Μη διαθέσιμο' : 'Unavailable'}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Conflict Error */}
            {conflictError && (
              <Alert variant="destructive">
                <AlertDescription>{conflictError}</AlertDescription>
              </Alert>
            )}

            {/* Customer Name */}
            <div>
              <Label>{language === 'el' ? 'Όνομα Πελάτη' : 'Customer Name'} *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={language === 'el' ? 'Πλήρες όνομα' : 'Full name'}
              />
            </div>

            {/* Notes */}
            <div>
              <Label>{language === 'el' ? 'Σημειώσεις' : 'Notes'}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={language === 'el' ? 'Προαιρετικές σημειώσεις...' : 'Optional notes...'}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                {language === 'el' ? 'Ακύρωση' : 'Cancel'}
              </Button>
              <Button onClick={handleCreateBooking} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {language === 'el' ? 'Δημιουργία Κράτησης' : 'Create Booking'}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Task Form */}
          <TabsContent value="task" className="space-y-4 mt-4">
            {/* Task Title */}
            <div>
              <Label>{language === 'el' ? 'Τίτλος' : 'Title'} *</Label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder={language === 'el' ? 'Περιγράψτε την εργασία' : 'Describe the task'}
              />
            </div>

            {/* Task Notes */}
            <div>
              <Label>{language === 'el' ? 'Σημειώσεις' : 'Notes'}</Label>
              <Textarea
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                placeholder={language === 'el' ? 'Επιπλέον λεπτομέρειες...' : 'Additional details...'}
                rows={2}
              />
            </div>

            {/* Task Date */}
            <div>
              <Label>{language === 'el' ? 'Ημερομηνία' : 'Date'} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !taskDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {taskDate ? format(taskDate, 'PPP') : (language === 'el' ? 'Επιλέξτε ημερομηνία' : 'Select date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={taskDate}
                    onSelect={setTaskDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Task Time */}
            <div>
              <Label>{language === 'el' ? 'Ώρα' : 'Time'}</Label>
              <Select value={taskTime} onValueChange={setTaskTime}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'el' ? 'Επιλέξτε ώρα' : 'Select time'} />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Task Location */}
            <div>
              <Label>{language === 'el' ? 'Τοποθεσία' : 'Location'}</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={taskLocation}
                  onChange={(e) => setTaskLocation(e.target.value)}
                  className="pl-10"
                  placeholder={language === 'el' ? 'Διεύθυνση' : 'Address'}
                />
              </div>
            </div>

            {/* Task Vehicle (optional) */}
            <div>
              <Label>{language === 'el' ? 'Όχημα (προαιρετικό)' : 'Vehicle (optional)'}</Label>
              <Select value={taskVehicleId} onValueChange={setTaskVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'el' ? 'Επιλέξτε όχημα' : 'Select vehicle'} />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model} {vehicle.license_plate && `(${vehicle.license_plate})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                {language === 'el' ? 'Ακύρωση' : 'Cancel'}
              </Button>
              <Button onClick={handleCreateTask} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {language === 'el' ? 'Δημιουργία Εργασίας' : 'Create Task'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
