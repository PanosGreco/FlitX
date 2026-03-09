import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, CalendarIcon, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DailyTask } from "@/hooks/useDailyTasks";
import { useTranslation } from "react-i18next";

interface AddTaskDialogProps {
  isOpen: boolean; onClose: () => void;
  onAddTask: (task: Omit<DailyTask, 'id' | 'date'>) => void;
  vehicles: { id: string; name: string; licensePlate: string | null; }[];
  selectedDate: Date; onDateChange?: (date: Date) => void;
}

export function AddTaskDialog({ isOpen, onClose, onAddTask, vehicles, selectedDate, onDateChange }: AddTaskDialogProps) {
  const { t } = useTranslation(['dailyProgram', 'common']);
  const [formData, setFormData] = useState({
    type: 'return' as 'return' | 'delivery' | 'other', vehicleId: '' as string | null, vehicleName: '' as string | null,
    scheduledTime: '', notes: '', completed: false, location: '' as string | null,
    bookingId: null as string | null, contractPath: null as string | null, title: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isVehicleRequired = formData.type === 'return' || formData.type === 'delivery';
  const showLocationField = formData.type === 'return' || formData.type === 'delivery';
  const isOtherTask = formData.type === 'other';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.scheduledTime) return;
    if (isVehicleRequired && !formData.vehicleId) return;
    if (isOtherTask && !formData.title.trim()) return;
    setIsSubmitting(true);
    await onAddTask(formData);
    setIsSubmitting(false);
    resetForm();
  };

  const resetForm = () => setFormData({ type: 'return', vehicleId: '', vehicleName: '', scheduledTime: '', notes: '', completed: false, location: '', bookingId: null, contractPath: null, title: '' });
  const handleClose = () => { resetForm(); onClose(); };

  const handleVehicleChange = (vehicleId: string) => {
    if (vehicleId === 'none') { setFormData({ ...formData, vehicleId: null, vehicleName: null }); return; }
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setFormData({ ...formData, vehicleId, vehicleName: vehicle ? `${vehicle.name}${vehicle.licensePlate ? ` (${vehicle.licensePlate})` : ''}` : '' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>{t('dailyProgram:addNewTask')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('common:date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />{format(selectedDate, 'MMMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && onDateChange?.(date)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">{t('dailyProgram:taskType')}</Label>
            <Select value={formData.type} onValueChange={(value: 'return' | 'delivery' | 'other') => {
              setFormData({ ...formData, type: value, vehicleId: '', vehicleName: '', location: '', title: '' });
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="return">{t('dailyProgram:dropOffs')}</SelectItem>
                <SelectItem value="delivery">{t('dailyProgram:pickUps')}</SelectItem>
                <SelectItem value="other">{t('dailyProgram:otherTasks')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isOtherTask && (
            <div className="space-y-2">
              <Label htmlFor="title">{t('dailyProgram:titleLabel')} *</Label>
              <Input id="title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder={t('dailyProgram:enterTaskTitle')} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="vehicle">{isVehicleRequired ? t('dailyProgram:vehicle') : t('dailyProgram:vehicleOptional')}</Label>
            <Select value={formData.vehicleId || ''} onValueChange={handleVehicleChange}>
              <SelectTrigger><SelectValue placeholder={isVehicleRequired ? t('dailyProgram:selectVehicle') : t('dailyProgram:selectVehicleOptional')} /></SelectTrigger>
              <SelectContent>
                {!isVehicleRequired && <SelectItem value="none">{t('dailyProgram:noVehicle')}</SelectItem>}
                {vehicles.map(vehicle => (<SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.name} {vehicle.licensePlate ? `(${vehicle.licensePlate})` : ''}</SelectItem>))}
              </SelectContent>
            </Select>
            {vehicles.length === 0 && <p className="text-xs text-muted-foreground">{t('dailyProgram:noVehiclesFound')}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduledTime">{t('dailyProgram:scheduledTime')}</Label>
            <Select value={formData.scheduledTime} onValueChange={(value) => setFormData({ ...formData, scheduledTime: value })}>
              <SelectTrigger><SelectValue placeholder={t('dailyProgram:selectTime')} /></SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`).map(time => (<SelectItem key={time} value={time}>{time}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {showLocationField && (
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t('dailyProgram:locationOptional')}</Label>
              <Input id="location" value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder={formData.type === 'delivery' ? t('dailyProgram:pickUpLocation') : t('dailyProgram:dropOffLocation')} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('dailyProgram:notesLabel')}</Label>
            <Textarea id="notes" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder={t('dailyProgram:notesPlaceholder')} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>{t('common:cancel')}</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t('common:adding') : t('dailyProgram:addTask')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
