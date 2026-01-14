import { useState, useEffect, useCallback } from "react";
import { format, isPast, differenceInDays } from "date-fns";
import { Bell, Plus, Check, ChevronRight, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      toast.error(language === 'el' ? 'Σφάλμα ενημέρωσης' : 'Error updating reminder');
    } else {
      fetchReminders();
    }
  };

  const handleAddReminder = async () => {
    if (!user || !newTitle.trim() || !newDueDate) {
      toast.error(language === 'el' ? 'Συμπληρώστε τίτλο και ημερομηνία' : 'Please fill title and date');
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
      toast.error(language === 'el' ? 'Σφάλμα δημιουργίας' : 'Error creating reminder');
    } else {
      toast.success(language === 'el' ? 'Υπενθύμιση προστέθηκε' : 'Reminder added');
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
    const days = differenceInDays(date, new Date());
    
    if (isPast(date)) {
      return language === 'el' ? 'Ληγμένη' : 'Overdue';
    }
    if (days === 0) {
      return format(date, 'HH:mm');
    }
    if (days === 1) {
      return language === 'el' ? 'Αύριο' : 'Tomorrow';
    }
    return format(date, 'MMM d');
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              {language === 'el' ? 'Υπενθυμίσεις' : 'Reminders'}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {language === 'el' ? 'Δεν υπάρχουν υπενθυμίσεις' : 'No reminders'}
            </p>
          ) : (
            <>
              {displayedReminders.map((reminder) => (
                <div 
                  key={reminder.id}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors",
                    reminder.is_completed && "opacity-60"
                  )}
                >
                  <Checkbox
                    checked={reminder.is_completed}
                    onCheckedChange={(checked) => 
                      handleToggleComplete(reminder.id, checked as boolean)
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      reminder.is_completed && "line-through"
                    )}>
                      {reminder.title}
                    </p>
                    {reminder.vehicle && (
                      <p className="text-xs text-muted-foreground truncate">
                        {reminder.vehicle.make} {reminder.vehicle.model}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className={cn(
                      isPast(new Date(reminder.due_date)) && !reminder.is_completed && "text-destructive"
                    )}>
                      {getTimeLabel(reminder.due_date)}
                    </span>
                  </div>
                </div>
              ))}

              {hasMore && !showAllReminders && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => setShowAllReminders(true)}
                >
                  {language === 'el' ? 'Προβολή όλων' : 'View More'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}

              {showAllReminders && hasMore && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => setShowAllReminders(false)}
                >
                  {language === 'el' ? 'Λιγότερα' : 'Show Less'}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Reminder Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {language === 'el' ? 'Νέα Υπενθύμιση' : 'New Reminder'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{language === 'el' ? 'Τίτλος' : 'Title'}</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={language === 'el' ? 'π.χ. Ανανέωση ασφάλειας' : 'e.g., Renew insurance'}
              />
            </div>

            <div>
              <Label>{language === 'el' ? 'Σημειώσεις' : 'Notes'}</Label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder={language === 'el' ? 'Προαιρετικές σημειώσεις...' : 'Optional notes...'}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{language === 'el' ? 'Ημερομηνία' : 'Date'}</Label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>
              <div>
                <Label>{language === 'el' ? 'Ώρα' : 'Time'}</Label>
                <Input
                  type="time"
                  value={newDueTime}
                  onChange={(e) => setNewDueTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>{language === 'el' ? 'Όχημα (προαιρετικό)' : 'Vehicle (optional)'}</Label>
              <Select value={newVehicleId} onValueChange={setNewVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'el' ? 'Επιλέξτε όχημα' : 'Select vehicle'} />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{language === 'el' ? 'Συχνότητα' : 'Frequency'}</Label>
              <Select value={newFrequency} onValueChange={setNewFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">{language === 'el' ? 'Μία φορά' : 'One time'}</SelectItem>
                  <SelectItem value="1_hour_before">{language === 'el' ? '1 ώρα πριν' : '1 hour before'}</SelectItem>
                  <SelectItem value="1_day_before">{language === 'el' ? '1 ημέρα πριν' : '1 day before'}</SelectItem>
                  <SelectItem value="1_week_before">{language === 'el' ? '1 εβδομάδα πριν' : '1 week before'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {language === 'el' ? 'Ακύρωση' : 'Cancel'}
            </Button>
            <Button onClick={handleAddReminder} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'el' ? 'Προσθήκη' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
