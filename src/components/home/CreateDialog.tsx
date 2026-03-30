import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Car, ClipboardList, Loader2 } from "lucide-react";
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
import { toast } from "sonner";
import { UnifiedBookingDialog } from "@/components/booking/UnifiedBookingDialog";
import { useTranslation } from "react-i18next";

interface CreateDialogProps { isOpen: boolean; onClose: () => void; onSuccess: () => void; }
interface Vehicle { id: string; make: string; model: string; license_plate: string | null; }

export function CreateDialog({ isOpen, onClose, onSuccess }: CreateDialogProps) {
  const { user } = useAuth();
  const { t } = useTranslation(['home', 'common']);
  const [activeTab, setActiveTab] = useState<'booking' | 'task'>('booking');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskDate, setTaskDate] = useState<Date>();
  const [taskTime, setTaskTime] = useState("");
  const [taskVehicleId, setTaskVehicleId] = useState<string>("");

  const timeOptions = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  useEffect(() => { if (isOpen && user) fetchVehicles(); }, [isOpen, user]);
  useEffect(() => { if (isOpen) setActiveTab('booking'); }, [isOpen]);

  const fetchVehicles = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('vehicles').select('id, make, model, license_plate').eq('user_id', user.id).eq('is_sold', false);
    if (!error) setVehicles(data || []);
  };

  const handleCreateTask = async () => {
    if (!user || !taskTitle.trim() || !taskDate) {
      toast.error(t('home:fillTitleAndDate'));
      return;
    }
    setIsSaving(true);
    try {
      await supabase.from('daily_tasks').insert({
        user_id: user.id, task_type: 'other', vehicle_id: taskVehicleId || null,
        due_date: format(taskDate, 'yyyy-MM-dd'), due_time: taskTime || null,
        location: null, title: taskTitle, description: taskNotes || null, status: 'pending'
      });
      toast.success(t('home:taskCreated'));
      resetTaskForm(); onSuccess(); onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error(t('home:taskCreateError'));
    } finally { setIsSaving(false); }
  };

  const resetTaskForm = () => { setTaskTitle(""); setTaskNotes(""); setTaskDate(undefined); setTaskTime(""); setTaskVehicleId(""); };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t('home:create')}</DialogTitle></DialogHeader>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'booking' | 'task')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="booking" className="flex items-center gap-2"><Car className="h-4 w-4" />{t('home:newBooking')}</TabsTrigger>
            <TabsTrigger value="task" className="flex items-center gap-2"><ClipboardList className="h-4 w-4" />{t('home:otherTask')}</TabsTrigger>
          </TabsList>
          <TabsContent value="booking" className="mt-4">
            <UnifiedBookingDialog isOpen={activeTab === 'booking' && isOpen} onClose={onClose} onSuccess={() => { onSuccess(); onClose(); }} embedded={true} />
          </TabsContent>
          <TabsContent value="task" className="space-y-4 mt-4">
            <div>
              <Label>{t('home:taskTitle')} *</Label>
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder={t('home:describeTask')} />
            </div>
            <div>
              <Label>{t('home:taskNotes')}</Label>
              <Textarea value={taskNotes} onChange={(e) => setTaskNotes(e.target.value)} placeholder={t('home:additionalDetails')} rows={2} />
            </div>
            <div>
              <Label>{t('home:taskDate')} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !taskDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {taskDate ? format(taskDate, 'PPP') : t('home:selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={taskDate} onSelect={setTaskDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>{t('home:taskTime')}</Label>
              <Select value={taskTime} onValueChange={setTaskTime}>
                <SelectTrigger><SelectValue placeholder={t('home:selectTime')} /></SelectTrigger>
                <SelectContent>{timeOptions.map(time => (<SelectItem key={time} value={time}>{time}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('home:vehicleOptional')}</Label>
              <Select value={taskVehicleId} onValueChange={setTaskVehicleId}>
                <SelectTrigger><SelectValue placeholder={t('home:selectVehicle')} /></SelectTrigger>
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
              <Button variant="outline" onClick={onClose}>{t('common:cancel')}</Button>
              <Button onClick={handleCreateTask} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('home:createTask')}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
