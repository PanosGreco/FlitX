import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { MonthlyCalendar } from "@/components/home/MonthlyCalendar";
import { TimelineCalendar } from "@/components/home/TimelineCalendar";
import { RemindersWidget } from "@/components/home/RemindersWidget";
import { NotesWidget } from "@/components/home/NotesWidget";
import { CreateDialog } from "@/components/home/CreateDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

export interface CalendarTask {
  id: string;
  type: 'delivery' | 'return' | 'other';
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  vehicleName: string | null;
  vehicleId: string | null;
  bookingId: string | null;
  customerName?: string;
}

export default function Home() {
  document.title = "Home - FlitX";
  const { user } = useAuth();
  const { language } = useLanguage();
  const [isMainCalendarMonthly, setIsMainCalendarMonthly] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch daily tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('daily_tasks')
        .select(`
          id,
          task_type,
          title,
          due_date,
          due_time,
          location,
          vehicle_id,
          booking_id,
          vehicles (
            make,
            model,
            license_plate
          )
        `)
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .neq('status', 'cancelled');

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        setLoading(false);
        return;
      }

      // Fetch bookings to get customer names
      const { data: bookingsData } = await supabase
        .from('rental_bookings')
        .select('id, customer_name')
        .eq('user_id', user.id);

      const bookingsMap = new Map(
        (bookingsData || []).map(b => [b.id, b.customer_name])
      );

      const mappedTasks: CalendarTask[] = (tasksData || []).map((task: any) => ({
        id: task.id,
        type: task.task_type as 'delivery' | 'return' | 'other',
        title: task.title,
        date: task.due_date,
        time: task.due_time,
        location: task.location,
        vehicleId: task.vehicle_id,
        vehicleName: task.vehicles
          ? `${task.vehicles.make} ${task.vehicles.model}`
          : null,
        bookingId: task.booking_id,
        customerName: task.booking_id ? bookingsMap.get(task.booking_id) : undefined
      }));

      setTasks(mappedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshTrigger]);

  const handleSwapCalendars = () => {
    setIsMainCalendarMonthly(!isMainCalendarMonthly);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <MobileLayout>
      <div className="p-4 space-y-4">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">
            {language === 'el' ? 'Αρχική' : 'Home'}
          </h1>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {language === 'el' ? 'Δημιουργία' : 'Create'}
          </Button>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Side - Calendars */}
          <div className="lg:col-span-3 space-y-4">
            {/* Main Calendar */}
            {isMainCalendarMonthly ? (
              <MonthlyCalendar
                tasks={tasks}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                loading={loading}
              />
            ) : (
              <TimelineCalendar
                tasks={tasks}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                loading={loading}
              />
            )}

            {/* Secondary Calendar (Small) */}
            <div 
              onClick={handleSwapCalendars}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            >
              {isMainCalendarMonthly ? (
                <TimelineCalendar
                  tasks={tasks}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  loading={loading}
                  isCompact
                />
              ) : (
                <MonthlyCalendar
                  tasks={tasks}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  loading={loading}
                  isCompact
                />
              )}
            </div>
          </div>

          {/* Right Side - Widgets */}
          <div className="lg:col-span-1 space-y-4">
            <RemindersWidget />
            <NotesWidget />
          </div>
        </div>

        {/* Create Dialog */}
        <CreateDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSuccess={handleRefresh}
        />
      </div>
    </MobileLayout>
  );
}
