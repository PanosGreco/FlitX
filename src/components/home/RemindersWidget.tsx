import { useState, useEffect, useCallback } from "react";
import { format, isPast, differenceInDays } from "date-fns";
import { Plus, Clock, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Reminder {
  id: string;
  title: string;
  notes: string | null;
  due_date: string;
  vehicle_id: string | null;
  frequency: string;
  is_completed: boolean;
  vehicle?: { make: string; model: string } | null;
}

// Category colors matching reference design
const CATEGORY_COLORS = [
  'bg-teal-400',
  'bg-violet-400',
  'bg-cyan-400',
  'bg-rose-400'
];

export function RemindersWidget() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showAllReminders, setShowAllReminders] = useState(false);
  const [vehicles, setVehicles] = useState<{ id: string; name: string }[]>([]);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueTime, setNewDueTime] = useState("09:00");
  const [newVehicleId, setNewVehicleId] = useState<string | undefined>();
  const [newFrequency, setNewFrequency] = useState("one_time");
  const [isSaving, setIsSaving] = useState(false);

  const fetchReminders = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('user_reminders')
      .select(`
        id,
        title,
        notes,
        due_date,
        vehicle_id,
        frequency,
        is_completed,
        vehicles (make, model)
      `)
      .eq('user_id', user.id)
      .order('is_completed', { ascending: true })
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching reminders:', error);
    } else {
      setReminders((data || []) as unknown as Reminder[]);
    }
    setLoading(false);
  }, [user]);

  const fetchVehicles = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('vehicles')
      .select('id, make, model')
      .eq('user_id', user.id);

    setVehicles((data || []).map(v => ({
      id: v.id,
      name: `${v.make} ${v.model}`
    })));
  }, [user]);

  useEffect(() => {
    fetchReminders();
    fetchVehicles();
  }, [fetchReminders, fetchVehicles]);

  const handleToggleComplete = async (reminderId: string, completed: boolean) => {
    const { error } = await supabase
      .from('user_reminders')
      .update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null
      })
      .eq('id', reminderId);

    if (error) {
      toast.error('Error updating reminder');
    } else {
      fetchReminders();
    }
  };

  const handleAddReminder = async () => {
    if (!user || !newTitle.trim() || !newDueDate) {
      toast.error('Please fill title and date');
      return;
    }

    setIsSaving(true);

    const dueDateTime = new Date(`${newDueDate}T${newDueTime}`);

    const { error } = await supabase
      .from('user_reminders')
      .insert({
        user_id: user.id,
        title: newTitle,
        notes: newNotes || null,
        due_date: dueDateTime.toISOString(),
        vehicle_id: newVehicleId || null,
        frequency: newFrequency
      });

    if (error) {
      console.error('Error adding reminder:', error);
      toast.error('Error creating reminder');
    } else {
      toast.success('Reminder added');
      setIsAddDialogOpen(false);
      resetForm();
      fetchReminders();
    }

    setIsSaving(false);
  };

  const resetForm = () => {
    setNewTitle("");
    setNewNotes("");
    setNewDueDate("");
    setNewDueTime("09:00");
    setNewVehicleId(undefined);
    setNewFrequency("one_time");
  };

  const displayedReminders = showAllReminders ? reminders : reminders.slice(0, 4);
  const hasMore = reminders.length > 4;

  const getTimeLabel = (dueDate: string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffHours = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 0) {
      return 'Overdue';
    }
    if (diffHours < 24) {
      return `${diffHours}h00`;
    }
    return format(date, 'MMM d');
  };

  return (
    <>
      <div className="bg-white rounded-xl p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-slate-800">
            Categories
          </h3>
          <button 
            className="p-1 hover:bg-slate-100 rounded text-slate-400 transition-colors"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        ) : reminders.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No reminders yet
          </p>
        ) : (
          <div className="space-y-2">
            {displayedReminders.map((reminder, idx) => (
              <div 
                key={reminder.id}
                className={cn(
                  "flex items-center gap-3 py-2 transition-opacity",
                  reminder.is_completed && "opacity-50"
                )}
              >
                {/* Colored Checkbox */}
                <Checkbox
                  checked={reminder.is_completed}
                  onCheckedChange={(checked) => 
                    handleToggleComplete(reminder.id, checked as boolean)
                  }
                  className={cn(
                    "h-5 w-5 rounded border-2 data-[state=checked]:border-current",
                    CATEGORY_COLORS[idx % CATEGORY_COLORS.length].replace('bg-', 'data-[state=checked]:bg-').replace('bg-', 'border-')
                  )}
                  style={{
                    borderColor: idx === 0 ? '#2dd4bf' : idx === 1 ? '#a78bfa' : idx === 2 ? '#22d3ee' : '#fb7185'
                  }}
                />
                
                {/* Title */}
                <span className={cn(
                  "flex-1 text-sm text-slate-700",
                  reminder.is_completed && "line-through"
                )}>
                  {reminder.title}
                </span>
                
                {/* Time */}
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span>{getTimeLabel(reminder.due_date)}</span>
                </div>
              </div>
            ))}

            {hasMore && !showAllReminders && (
              <button 
                className="w-full text-center text-xs text-teal-500 hover:text-teal-600 py-2 transition-colors"
                onClick={() => setShowAllReminders(true)}
              >
                View More
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Reminder Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-800">
              New Reminder
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-slate-600">Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Renew insurance"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-slate-600">Notes</Label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-600">Date</Label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-600">Time</Label>
                <Input
                  type="time"
                  value={newDueTime}
                  onChange={(e) => setNewDueTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-600">Vehicle (optional)</Label>
              <Select value={newVehicleId} onValueChange={setNewVehicleId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-600">Frequency</Label>
              <Select value={newFrequency} onValueChange={setNewFrequency}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One time</SelectItem>
                  <SelectItem value="1_hour_before">1 hour before</SelectItem>
                  <SelectItem value="1_day_before">1 day before</SelectItem>
                  <SelectItem value="1_week_before">1 week before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddReminder} disabled={isSaving} className="bg-teal-500 hover:bg-teal-600">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
