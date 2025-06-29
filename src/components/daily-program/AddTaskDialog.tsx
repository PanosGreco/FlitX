
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DailyTask } from "@/pages/DailyProgram";

interface AddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<DailyTask, 'id' | 'date'>) => void;
}

export function AddTaskDialog({ isOpen, onClose, onAddTask }: AddTaskDialogProps) {
  const [formData, setFormData] = useState({
    type: 'return' as 'return' | 'delivery' | 'other',
    vehicleId: '',
    vehicleName: '',
    scheduledTime: '',
    notes: '',
    hasOutstandingBalance: false,
    completed: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.vehicleName || !formData.scheduledTime) {
      return;
    }
    
    onAddTask(formData);
    setFormData({
      type: 'return',
      vehicleId: '',
      vehicleName: '',
      scheduledTime: '',
      notes: '',
      hasOutstandingBalance: false,
      completed: false
    });
    onClose();
  };

  const handleClose = () => {
    setFormData({
      type: 'return',
      vehicleId: '',
      vehicleName: '',
      scheduledTime: '',
      notes: '',
      hasOutstandingBalance: false,
      completed: false
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Task Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'return' | 'delivery' | 'other') => 
                setFormData({ ...formData, type: value })
              }
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

          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle ID</Label>
            <Input
              id="vehicleId"
              value={formData.vehicleId}
              onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
              placeholder="e.g., FL-001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleName">Vehicle Name</Label>
            <Input
              id="vehicleName"
              value={formData.vehicleName}
              onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
              placeholder="e.g., Toyota Corolla"
              required
            />
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

          <div className="flex items-center space-x-2">
            <Switch
              id="hasOutstandingBalance"
              checked={formData.hasOutstandingBalance}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, hasOutstandingBalance: checked })
              }
            />
            <Label htmlFor="hasOutstandingBalance">Outstanding Balance</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">Add Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
