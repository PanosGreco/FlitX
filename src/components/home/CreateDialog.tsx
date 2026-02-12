import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Car, ClipboardList, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { UnifiedBookingDialog } from "@/components/booking/UnifiedBookingDialog";

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
}

export function CreateDialog({ isOpen, onClose, onSuccess }: CreateDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'booking' | 'task'>('booking');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showBookingDialog, setShowBookingDialog] = useState(false);

  // Task form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskDate, setTaskDate] = useState<Date>();
  const [taskTime, setTaskTime] = useState("");
  const [taskVehicleId, setTaskVehicleId] = useState<string>("");

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

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('booking');
      setShowBookingDialog(false);
    }
  }, [isOpen]);

  const fetchVehicles = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, make, model, license_plate')
      .eq('user_id', user.id);
    if (!error) {
      setVehicles(data || []);
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
        location: null,
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

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskNotes("");
    setTaskDate(undefined);
    setTaskTime("");
    setTaskVehicleId("");
  };

  const handleBookingDialogClose = () => {
    setShowBookingDialog(false);
    // Return to the tabbed dialog, don't close everything
  };

  const handleBookingSuccess = () => {
    setShowBookingDialog(false);
    onSuccess();
    onClose();
  };

  const handleTabChange = (val: string) => {
    const tab = val as 'booking' | 'task';
    setActiveTab(tab);
    if (tab === 'booking') {
      // Don't auto-open booking dialog, let user click
    } else {
      setShowBookingDialog(false);
    }
  };

  // If booking dialog is open, show it (main dialog stays hidden behind it)
  if (showBookingDialog) {
    return (
      <UnifiedBookingDialog
        isOpen={true}
        onClose={handleBookingDialogClose}
        onSuccess={handleBookingSuccess}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === 'el' ? 'Δημιουργία' : 'Create'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="booking" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              {language === 'el' ? 'Κράτηση' : 'New Booking'}
            </TabsTrigger>
            <TabsTrigger value="task" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              {language === 'el' ? 'Εργασία' : 'Other Task'}
            </TabsTrigger>
          </TabsList>

          {/* Booking Tab */}
          <TabsContent value="booking" className="mt-4">
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <Car className="h-10 w-10 text-primary" />
              <p className="text-sm text-muted-foreground text-center">
                {language === 'el' ? 'Δημιουργήστε μια νέα κράτηση οχήματος' : 'Create a new vehicle rental booking'}
              </p>
              <Button className="w-full" onClick={() => setShowBookingDialog(true)}>
                {language === 'el' ? 'Συνέχεια στη Κράτηση' : 'Continue to Booking'}
              </Button>
            </div>
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
