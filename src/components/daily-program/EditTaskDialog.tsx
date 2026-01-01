import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DailyTask } from "@/hooks/useDailyTasks";

interface EditTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: DailyTask;
  onUpdate: (task: DailyTask) => void;
}

export function EditTaskDialog({ isOpen, onClose, task, onUpdate }: EditTaskDialogProps) {
  const [formData, setFormData] = useState({
    scheduledTime: task.scheduledTime,
    notes: task.notes,
    completed: task.completed
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData({
      scheduledTime: task.scheduledTime,
      notes: task.notes,
      completed: task.completed
    });
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.scheduledTime) {
      return;
    }
    
    setIsSubmitting(true);
    await onUpdate({
      ...task,
      scheduledTime: formData.scheduledTime,
      notes: formData.notes,
      completed: formData.completed
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Read-only task info */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
            <div className="text-sm">
              <span className="text-muted-foreground">Type: </span>
              <span className="font-medium capitalize">{task.type}</span>
            </div>
            {task.vehicleName && (
              <div className="text-sm">
                <span className="text-muted-foreground">Vehicle: </span>
                <span className="font-medium">{task.vehicleName}</span>
              </div>
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
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
