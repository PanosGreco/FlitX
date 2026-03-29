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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  due_time: string | null;
  is_completed: boolean;
}

interface VehicleRemindersProps {
  vehicleId: string;
}

const timeOptions = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

export function VehicleReminders({ vehicleId }: VehicleRemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [dueTime, setDueTime] = useState("");
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation(['fleet', 'common']);

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
        .select("id, title, description, due_date, due_time, is_completed")
        .eq("vehicle_id", vehicleId)
        .order("due_date");
      
      if (error) throw error;
      
      setReminders(data || []);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      toast({
        title: t('common:error'),
        description: t('fleet:loadingReminders'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async () => {
    if (!title || !user) {
      toast({
        title: t('common:error'),
        description: t('fleet:title') + " is required",
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
          due_date: dueDate.toISOString().split('T')[0],
          due_time: dueTime || null,
        }]);

      if (error) throw error;

      toast({
        title: t('common:success'),
        description: t('fleet:reminderAdded'),
      });
      
      resetForm();
      setIsAddReminderOpen(false);
      fetchReminders();
    } catch (error) {
      console.error("Error adding reminder:", error);
      toast({
        title: t('common:error'),
        description: t('fleet:reminderError'),
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
        title: t('common:success'),
        description: t('fleet:reminderDeleted'),
      });
      
      fetchReminders();
    } catch (error) {
      console.error("Error deleting reminder:", error);
      toast({
        title: t('common:error'),
        description: t('fleet:reminderDeleteError'),
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
        title: t('common:success'),
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
    setDueTime("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('fleet:upcomingReminders')}</h2>
        <Button onClick={() => setIsAddReminderOpen(true)} className="bg-primary hover:bg-primary/90">
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('fleet:addReminder')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="text-muted-foreground">{t('fleet:loadingReminders')}</div>
        </div>
      ) : reminders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p className="text-sm">
              {t('fleet:reminderAddDesc')}
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
                    {reminder.due_time && (
                      <>
                        <span className="mx-1">·</span>
                        <Clock className="h-3.5 w-3.5" />
                        <span>{reminder.due_time.substring(0, 5)}</span>
                      </>
                    )}
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
            <DialogTitle>{t('fleet:addReminder')}</DialogTitle>
            <DialogDescription>
              {t('fleet:createReminderDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('fleet:title')}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('fleet:titlePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fleet:dueDate')}</Label>
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
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t('fleet:reminderTime')}</Label>
              <Select value={dueTime} onValueChange={setDueTime}>
                <SelectTrigger>
                  <SelectValue placeholder={t('fleet:reminderTime')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('fleet:descriptionOptional')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('fleet:addNotesPlaceholder')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddReminderOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button onClick={handleAddReminder}>{t('fleet:addReminder')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
