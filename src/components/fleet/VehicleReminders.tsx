import { useState, useEffect } from "react";
import { 
  Calendar,
  Clock, 
  PlusCircle, 
  Edit, 
  Trash2, 
  Bell,
  BellOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
}

interface VehicleRemindersProps {
  vehicleId: string;
}

export function VehicleReminders({ vehicleId }: VehicleRemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date>(new Date());
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (vehicleId && user) {
      fetchReminders();
    }
  }, [vehicleId, user]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("vehicle_reminders")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("due_date");
      
      if (error) throw error;
      
      setReminders(data || []);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      toast({
        title: "Error",
        description: "Failed to load reminders.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async () => {
    if (!title || !user) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("vehicle_reminders")
        .insert([{
          vehicle_id: vehicleId,
          user_id: user.id,
          title,
          description: description || null,
          due_date: dueDate.toISOString().split('T')[0]
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reminder added successfully",
      });
      
      resetForm();
      setIsAddReminderOpen(false);
      fetchReminders();
    } catch (error) {
      console.error("Error adding reminder:", error);
      toast({
        title: "Error",
        description: "Failed to add reminder",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from("vehicle_reminders")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reminder deleted successfully",
      });
      
      fetchReminders();
    } catch (error) {
      console.error("Error deleting reminder:", error);
      toast({
        title: "Error",
        description: "Failed to delete reminder",
        variant: "destructive",
      });
    }
  };

  const handleToggleCompletion = async (reminder: Reminder) => {
    try {
      const { error } = await supabase
        .from("vehicle_reminders")
        .update({ is_completed: !reminder.is_completed })
        .eq("id", reminder.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Reminder marked as ${!reminder.is_completed ? 'completed' : 'incomplete'}`,
      });
      
      fetchReminders();
    } catch (error) {
      console.error("Error toggling reminder completion:", error);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate(new Date());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upcoming Reminders</h2>
        <Button onClick={() => setIsAddReminderOpen(true)} className="bg-primary hover:bg-primary/90">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Reminder
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="text-muted-foreground">Loading reminders...</div>
        </div>
      ) : reminders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p className="text-sm">
              Add reminders for maintenance, renewals, documents, or any vehicle-related task.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reminders.map(reminder => (
            <div 
              key={reminder.id}
              className={`relative rounded-md border p-3 ${reminder.is_completed ? 'bg-muted' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-medium ${reminder.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                    {reminder.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(reminder.due_date), "dd/MM/yyyy")}
                  </div>
                  {reminder.description && (
                    <p className="text-sm mt-1 text-muted-foreground">{reminder.description}</p>
                  )}
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleToggleCompletion(reminder)}
                  >
                    {reminder.is_completed ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-red-200 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleDeleteReminder(reminder.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isAddReminderOpen} onOpenChange={setIsAddReminderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reminder</DialogTitle>
            <DialogDescription>
              Create a new reminder for this vehicle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Insurance Renewal"
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(dueDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => date && setDueDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddReminderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddReminder}>Add Reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
