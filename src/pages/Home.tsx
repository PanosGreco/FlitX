import { useState, useEffect, useCallback } from "react";
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
  endTime?: string | null;
  location: string | null;
  vehicleName: string | null;
  vehicleId: string | null;
  bookingId: string | null;
  customerName?: string;
  notes?: string | null;
  contractPath?: string | null;
}

export default function Home() {
  document.title = "Home - FlitX";
  const { user } = useAuth();
  const { language } = useLanguage();
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
          description,
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

      // Fetch bookings to get customer names and contract paths
      const { data: bookingsData } = await supabase
        .from('rental_bookings')
        .select('id, customer_name, contract_photo_path')
        .eq('user_id', user.id);

      const bookingsMap = new Map(
        (bookingsData || []).map(b => [b.id, { customerName: b.customer_name, contractPath: b.contract_photo_path }])
      );

      const mappedTasks: CalendarTask[] = (tasksData || []).map((task: any) => {
        const bookingInfo = task.booking_id ? bookingsMap.get(task.booking_id) : null;
        return {
          id: task.id,
          type: task.task_type as 'delivery' | 'return' | 'other',
          title: task.title,
          date: task.due_date,
          time: task.due_time ? task.due_time.substring(0, 5) : null,
          location: task.location,
          vehicleId: task.vehicle_id,
          vehicleName: task.vehicles
            ? `${task.vehicles.make} ${task.vehicles.model}`
            : null,
          bookingId: task.booking_id,
          customerName: bookingInfo?.customerName,
          notes: task.description,
          contractPath: bookingInfo?.contractPath
        };
      });

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

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <MobileLayout>
      {/* No page-level scroll - all scrolling happens inside timeline */}
      <div className="h-[calc(100vh-64px)] bg-slate-50/50 p-5 overflow-hidden">
        {/* Main Layout - Reference: Left sidebar (small calendar + widgets), Right main area (timeline) */}
        <div className="flex gap-5 h-full">
          {/* Left Sidebar - Small Calendar + Widgets - no scroll, fixed height */}
          <div className="w-[280px] flex-shrink-0 space-y-4 flex flex-col">
            {/* Small Monthly Calendar */}
            <MonthlyCalendar
              tasks={tasks}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              loading={loading}
            />

            {/* Reminders Widget */}
            <RemindersWidget />

            {/* Notes Widget (Notebook) */}
            <NotesWidget />
          </div>

          {/* Main Area - Timeline Calendar */}
          <div className="flex-1 min-w-0 h-full">
            <TimelineCalendar
              tasks={tasks}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              loading={loading}
              onCreateClick={() => setIsCreateDialogOpen(true)}
            />
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
