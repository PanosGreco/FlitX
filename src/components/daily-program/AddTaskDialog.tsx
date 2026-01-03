import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DailyTask } from "@/hooks/useDailyTasks";

interface AddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<DailyTask, 'id' | 'date'>) => void;
  vehicles: { id: string; name: string; licensePlate: string | null }[];
  selectedDate: Date;
}

export function AddTaskDialog({ isOpen, onClose, onAddTask, vehicles, selectedDate }: AddTaskDialogProps) {
  const [formData, setFormData] = useState({
    type: 'return' as 'return' | 'delivery' | 'other',
    vehicleId: '' as string | null,
    vehicleName: '' as string | null,
    scheduledTime: '',
    notes: '',
    completed: false,
    location: '' as string | null,
    bookingId: null as string | null,
    contractPath: null as string | null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isVehicleRequired = formData.type === 'return' || formData.type === 'delivery';
  const showLocationField = formData.type === 'return' || formData.type === 'delivery';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.scheduledTime) {
      return;
    }
    
    // Vehicle required for return/delivery
    if (isVehicleRequired && !formData.vehicleId) {
      return;
    }

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
      contractPath: null
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
      contractPath: null
    });
    onClose();
  };

  const handleVehicleChange = (vehicleId: string) => {
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
          {/* Task Date Display */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Task date:</span>
            <span className="font-medium">{format(selectedDate, 'MMMM d, yyyy')}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Task Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'return' | 'delivery' | 'other') => {
                setFormData({ ...formData, type: value, vehicleId: '', vehicleName: '', location: '' });
              }}
            >
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

          {/* Vehicle Selection - Required for return/delivery, optional for other */}
          <div className="space-y-2">
            <Label htmlFor="vehicle">
              Vehicle {isVehicleRequired ? '' : '(optional)'}
            </Label>
            <Select
              value={formData.vehicleId || ''}
              onValueChange={handleVehicleChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={isVehicleRequired ? "Select a vehicle" : "Select a vehicle (optional)"} />
              </SelectTrigger>
              <SelectContent>
                {!isVehicleRequired && (
                  <SelectItem value="none">No vehicle</SelectItem>
                )}
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} {vehicle.licensePlate ? `(${vehicle.licensePlate})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {vehicles.length === 0 && (
              <p className="text-xs text-muted-foreground">No vehicles found. Add vehicles in Fleet first.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledTime">Scheduled Time</Label>
            <Input
              id="scheduledTime"
              type="time"
              value={formData.scheduledTime}
              onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
              required
            />
          </div>

          {/* Location field - only for deliveries and returns */}
          {showLocationField && (
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Location (optional)
              </Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder={formData.type === 'delivery' ? "Pick-up location" : "Drop-off location"}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or observations..."
              rows={3}
            />
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
