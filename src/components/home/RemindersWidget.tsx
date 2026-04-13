import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Bell, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface WeeklyReminderItem {
  id: string;
  vehicleName: string;
  title: string;
  notes: string | null;
  time: string | null;
  is_completed: boolean;
  due_date: string;
  isOverdue: boolean;
}

export function RemindersWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(['home', 'common']);
  const [reminders, setReminders] = useState<WeeklyReminderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWeeklyReminders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      const { data: vehicleReminders, error: vehicleError } = await supabase
        .from('vehicle_reminders')
        .select(`id, title, description, due_date, due_time, is_completed, vehicle_id, vehicles (make, model)`)
        .eq('user_id', user.id)
        .or(`and(due_date.lte.${today},is_completed.eq.false),and(due_date.eq.${today},is_completed.eq.true)`);
      if (vehicleError) {
        console.error('Error fetching vehicle reminders:', vehicleError);
        setLoading(false);
        return;
      }
      const mappedReminders: WeeklyReminderItem[] = (vehicleReminders || []).map((reminder: any) => ({
        id: reminder.id,
        vehicleName: reminder.vehicles ? `${reminder.vehicles.make} ${reminder.vehicles.model}` : 'Unknown Vehicle',
        title: reminder.title,
        notes: reminder.description,
        time: reminder.due_time ? reminder.due_time.substring(0, 5) : null,
        is_completed: reminder.is_completed || false,
        due_date: reminder.due_date,
        isOverdue: reminder.due_date < today && !reminder.is_completed,
      }));
      const sortedReminders = mappedReminders.sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
        return a.due_date.localeCompare(b.due_date);
      });
      setReminders(sortedReminders);
    } catch (error) {
      console.error('Error fetching weekly reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchWeeklyReminders(); }, [fetchWeeklyReminders]);

  const handleToggleComplete = async (reminder: WeeklyReminderItem, completed: boolean) => {
    try {
      const { error } = await supabase.from('vehicle_reminders').update({ is_completed: completed }).eq('id', reminder.id);
      if (error) throw error;
      fetchWeeklyReminders();
    } catch (error) {
      console.error('Error updating reminder:', error);
      toast.error(t('fleet:errorUpdatingReminder'));
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-secondary-foreground">{t('home:dailyVehicleReminders')}</h3>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
      ) : reminders.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm font-medium text-slate-500">{t('home:noRemindersToday')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('home:addRemindersFromFleet')}</p>
        </div>
      ) : (
        <div className="max-h-[200px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {reminders.slice(0, 5).map(reminder => (
              <div key={reminder.id} className={cn("flex items-start gap-3 py-2 transition-opacity", reminder.is_completed && "opacity-50", reminder.isOverdue && "border-l-2 border-orange-300 pl-2")}>
              <Checkbox checked={reminder.is_completed} onCheckedChange={checked => handleToggleComplete(reminder, checked as boolean)} className="h-4 w-4 mt-0.5 rounded border-slate-300 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500" />
              <div className="flex-1 min-w-0">
                <span className={cn("block text-sm text-slate-700 font-medium", reminder.is_completed && "line-through")}>
                  {reminder.vehicleName} – {reminder.title}
                  {reminder.isOverdue && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-600">
                      {t('home:overdue')}
                    </span>
                  )}
                </span>
                {reminder.notes && <span className="block text-xs text-slate-500 truncate mt-0.5">{reminder.notes}</span>}
              </div>
              {reminder.time && (
                <div className="flex items-center gap-1 text-xs text-slate-900 font-medium flex-shrink-0">
                  <Clock className="h-3 w-3" /><span>{reminder.time}</span>
                </div>
              )}
            </div>
          ))}
          {reminders.length > 5 && (
            <div className="text-center pt-1">
              <span className="text-xs text-slate-400">{t('home:more', { count: reminders.length - 5 })}</span>
            </div>
          )}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300" onClick={() => navigate('/daily-program')}>
          {t('home:openDailyProgram')}
        </Button>
      </div>
    </div>
  );
}
