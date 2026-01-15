import { useState, useEffect, useCallback } from "react";
import { format, isToday, parseISO, startOfDay } from "date-fns";
import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ReminderItem {
  id: string;
  title: string;
  notes: string | null;
  time: string | null;
  is_completed: boolean;
  source: 'daily_task' | 'vehicle_reminder';
}

export function RemindersWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      // Fetch daily tasks for today
      const { data: tasksData, error: tasksError } = await supabase
        .from('daily_tasks')
        .select('id, title, description, due_time, status')
        .eq('user_id', user.id)
        .eq('due_date', today);

      if (tasksError) {
        console.error('Error fetching daily tasks:', tasksError);
      }

      // Fetch vehicle reminders for today
      const { data: vehicleReminders, error: vehicleError } = await supabase
        .from('vehicle_reminders')
        .select('id, title, description, due_date, is_completed')
        .eq('user_id', user.id)
        .gte('due_date', `${today}T00:00:00`)
        .lte('due_date', `${today}T23:59:59`);

      if (vehicleError) {
        console.error('Error fetching vehicle reminders:', vehicleError);
      }

      // Map daily tasks
      const taskReminders: ReminderItem[] = (tasksData || []).map(task => ({
        id: task.id,
        title: task.title,
        notes: task.description,
        time: task.due_time,
        is_completed: task.status === 'completed',
        source: 'daily_task' as const
      }));

      // Map vehicle reminders
      const vehicleReminderItems: ReminderItem[] = (vehicleReminders || []).map(reminder => {
        const dueDate = parseISO(reminder.due_date);
        return {
          id: reminder.id,
          title: reminder.title,
          notes: reminder.description,
          time: format(dueDate, 'HH:mm'),
          is_completed: reminder.is_completed || false,
          source: 'vehicle_reminder' as const
        };
      });

      // Combine and sort by completion status and time
      const allReminders = [...taskReminders, ...vehicleReminderItems].sort((a, b) => {
        // Completed items go to bottom
        if (a.is_completed !== b.is_completed) {
          return a.is_completed ? 1 : -1;
        }
        // Sort by time
        const timeA = a.time || '23:59';
        const timeB = b.time || '23:59';
        return timeA.localeCompare(timeB);
      });

      setReminders(allReminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleToggleComplete = async (reminder: ReminderItem, completed: boolean) => {
    try {
      if (reminder.source === 'daily_task') {
        const { error } = await supabase
          .from('daily_tasks')
          .update({
            status: completed ? 'completed' : 'pending'
          })
          .eq('id', reminder.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vehicle_reminders')
          .update({
            is_completed: completed
          })
          .eq('id', reminder.id);

        if (error) throw error;
      }
      fetchReminders();
    } catch (error) {
      console.error('Error updating reminder:', error);
      toast.error('Error updating reminder');
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-800">
          Reminders
        </h3>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : reminders.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">
          No reminders for today
        </p>
      ) : (
        <div className="max-h-[200px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {reminders.slice(0, 5).map((reminder) => (
            <div 
              key={`${reminder.source}-${reminder.id}`}
              className={cn(
                "flex items-start gap-3 py-2 transition-opacity",
                reminder.is_completed && "opacity-50"
              )}
            >
              {/* Checkbox */}
              <Checkbox
                checked={reminder.is_completed}
                onCheckedChange={(checked) => 
                  handleToggleComplete(reminder, checked as boolean)
                }
                className="h-4 w-4 mt-0.5 rounded border-slate-300 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
              />
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className={cn(
                  "block text-sm text-slate-700",
                  reminder.is_completed && "line-through"
                )}>
                  {reminder.title}
                </span>
                {reminder.notes && (
                  <span className="block text-xs text-slate-500 truncate mt-0.5">
                    {reminder.notes}
                  </span>
                )}
              </div>
              
              {/* Time - in black text */}
              {reminder.time && (
                <div className="flex items-center gap-1 text-xs text-slate-900 font-medium flex-shrink-0">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(reminder.time)}</span>
                </div>
              )}
            </div>
          ))}
          
          {reminders.length > 5 && (
            <div className="text-center pt-1">
              <span className="text-xs text-slate-400">
                +{reminders.length - 5} more
              </span>
            </div>
          )}
        </div>
      )}

      {/* Open Daily Program Button */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <Button 
          variant="outline"
          className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
          onClick={() => navigate('/daily-program')}
        >
          Open Daily Program
        </Button>
      </div>
    </div>
  );
}
