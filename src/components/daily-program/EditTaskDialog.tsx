
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DailyTask } from "@/pages/DailyProgram";

interface EditTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: DailyTask;
  onUpdate: (task: DailyTask) => void;
}

export function EditTaskDialog({ isOpen, onClose, task, onUpdate }: EditTaskDialogProps) {
  const [formData, setFormData] = useState({
    type: task.type,
    vehicleId: task.vehicleId,
    vehicleName: task.vehicleName,
    scheduledTime: task.scheduledTime,
    notes: task.notes,
    completed: task.completed
  });

  useEffect(() => {
    setFormData({
      type: task.type,
      vehicleId: task.vehicleId,
      vehicleName: task.vehicleName,
      scheduledTime: task.scheduledTime,
      notes: task.notes,
      completed: task.completed
    });
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.vehicleName || !formData.scheduledTime) {
      return;
    }
    
    onUpdate({
      ...task,
      ...formData
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
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
              id="completed"
              checked={formData.completed}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, completed: checked })
              }
            />
            <Label htmlFor="completed">Completed</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Update Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
