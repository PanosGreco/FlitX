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

interface AddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<DailyTask, 'id' | 'date'>) => void;
  vehicles: {
    id: string;
    name: string;
    licensePlate: string | null;
  }[];
  selectedDate: Date;
  onDateChange?: (date: Date) => void;
}

export function AddTaskDialog({
  isOpen,
  onClose,
  onAddTask,
  vehicles,
  selectedDate,
  onDateChange
}: AddTaskDialogProps) {
  const [formData, setFormData] = useState({
    type: 'return' as 'return' | 'delivery' | 'other',
    vehicleId: '' as string | null,
    vehicleName: '' as string | null,
    scheduledTime: '',
    notes: '',
    completed: false,
    location: '' as string | null,
    bookingId: null as string | null,
    contractPath: null as string | null,
    title: ''
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

    // Reset form
    setFormData({
      type: 'return',
      vehicleId: '',
      vehicleName: '',
      scheduledTime: '',
      notes: '',
      completed: false,
      location: '',
      bookingId: null,
      contractPath: null,
      title: ''
    });
  };

  const handleClose = () => {
    setFormData({
      type: 'return',
      vehicleId: '',
      vehicleName: '',
      scheduledTime: '',
      notes: '',
      completed: false,
      location: '',
      bookingId: null,
      contractPath: null,
      title: ''
    });
    onClose();
  };

  const handleVehicleChange = (vehicleId: string) => {
    if (vehicleId === 'none') {
      setFormData({ ...formData, vehicleId: null, vehicleName: null });
      return;
    }
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setFormData({
      ...formData,
      vehicleId,
      vehicleName: vehicle ? `${vehicle.name}${vehicle.licensePlate ? ` (${vehicle.licensePlate})` : ''}` : ''
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Date - editable via calendar popover */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'MMMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && onDateChange?.(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Task Type</Label>
            <Select value={formData.type} onValueChange={(value: 'return' | 'delivery' | 'other') => {
              setFormData({
                ...formData,
                type: value,
                vehicleId: '',
                vehicleName: '',
                location: '',
                title: ''
              });
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="return">Return</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="other">Other Task</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title field - required for Other Tasks */}
          {isOtherTask && (
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter task title"
                required
              />
            </div>
          )}

          {/* Vehicle Selection - Required for return/delivery, optional for other */}
          <div className="space-y-2">
            <Label htmlFor="vehicle">
              Vehicle {isVehicleRequired ? '' : '(optional)'}
            </Label>
            <Select value={formData.vehicleId || ''} onValueChange={handleVehicleChange}>
              <SelectTrigger>
                <SelectValue placeholder={isVehicleRequired ? "Select a vehicle" : "Select a vehicle (optional)"} />
              </SelectTrigger>
              <SelectContent>
                {!isVehicleRequired && <SelectItem value="none">No vehicle</SelectItem>}
                {vehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} {vehicle.licensePlate ? `(${vehicle.licensePlate})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {vehicles.length === 0 && <p className="text-xs text-muted-foreground">No vehicles found. Add vehicles in Fleet first.</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledTime">Scheduled Time</Label>
            <Select value={formData.scheduledTime} onValueChange={(value) => setFormData({ ...formData, scheduledTime: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  return `${hour}:00`;
                }).map(time => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location field - only for deliveries and returns */}
          {showLocationField && (
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Location (optional)
              </Label>
              <Input id="location" value={formData.location || ''} onChange={e => setFormData({
                ...formData,
                location: e.target.value
              })} placeholder={formData.type === 'delivery' ? "Pick-up location" : "Drop-off location"} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={e => setFormData({
              ...formData,
              notes: e.target.value
            })} placeholder="Additional notes or observations..." rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}