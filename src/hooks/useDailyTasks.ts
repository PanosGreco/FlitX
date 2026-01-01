import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DailyTask {
  id: string;
  type: 'return' | 'delivery' | 'other';
  vehicleId: string | null;
  vehicleName: string | null;
  scheduledTime: string;
  notes: string;
  completed: boolean;
  date: string;
}

interface DbTask {
  id: string;
  task_type: string;
  vehicle_id: string | null;
  due_time: string | null;
  due_date: string | null;
  description: string | null;
  title: string;
  status: string;
  user_id: string;
  vehicles?: {
    make: string;
    model: string;
    license_plate: string | null;
  } | null;
}

export function useDailyTasks(selectedDate: Date) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<{ id: string; name: string; licensePlate: string | null }[]>([]);

  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');

  // Fetch vehicles for dropdown
  const fetchVehicles = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('vehicles')
      .select('id, make, model, license_plate')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching vehicles:', error);
      return;
    }

    setVehicles(
      (data || []).map(v => ({
        id: v.id,
        name: `${v.make} ${v.model}`,
        licensePlate: v.license_plate
      }))
    );
  }, [user]);

  // Fetch tasks for selected date
  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase
      .from('daily_tasks')
      .select(`
        id,
        task_type,
        vehicle_id,
        due_time,
        due_date,
        description,
        title,
        status,
        user_id,
        vehicles (
          make,
          model,
          license_plate
        )
      `)
      .eq('user_id', user.id)
      .eq('due_date', selectedDateString);

    if (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
      setLoading(false);
      return;
    }

    const mappedTasks: DailyTask[] = (data || []).map((task: DbTask) => ({
      id: task.id,
      type: task.task_type as 'return' | 'delivery' | 'other',
      vehicleId: task.vehicle_id,
      vehicleName: task.vehicles 
        ? `${task.vehicles.make} ${task.vehicles.model}${task.vehicles.license_plate ? ` (${task.vehicles.license_plate})` : ''}`
        : null,
      scheduledTime: task.due_time || '',
      notes: task.description || '',
      completed: task.status === 'completed',
      date: task.due_date || selectedDateString
    }));

    setTasks(mappedTasks);
    setLoading(false);
  }, [user, selectedDateString]);

  useEffect(() => {
    fetchTasks();
    fetchVehicles();
  }, [fetchTasks, fetchVehicles]);

  const addTask = async (newTask: Omit<DailyTask, 'id' | 'date'>) => {
    if (!user) {
      toast.error('Please log in to add tasks');
      return false;
    }

    // For return/delivery, vehicle is required
    if ((newTask.type === 'return' || newTask.type === 'delivery') && !newTask.vehicleId) {
      toast.error('Vehicle is required for returns and deliveries');
      return false;
    }

    const { error } = await supabase
      .from('daily_tasks')
      .insert({
        user_id: user.id,
        task_type: newTask.type,
        vehicle_id: newTask.vehicleId || null,
        due_date: selectedDateString,
        due_time: newTask.scheduledTime || null,
        description: newTask.notes || null,
        title: newTask.vehicleName || newTask.type.charAt(0).toUpperCase() + newTask.type.slice(1),
        status: newTask.completed ? 'completed' : 'pending'
      });

    if (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
      return false;
    }

    toast.success('Task added successfully');
    await fetchTasks();
    return true;
  };

  const updateTask = async (updatedTask: DailyTask) => {
    if (!user) {
      toast.error('Please log in to update tasks');
      return false;
    }

    const { error } = await supabase
      .from('daily_tasks')
      .update({
        task_type: updatedTask.type,
        vehicle_id: updatedTask.vehicleId || null,
        due_time: updatedTask.scheduledTime || null,
        description: updatedTask.notes || null,
        title: updatedTask.vehicleName || updatedTask.type.charAt(0).toUpperCase() + updatedTask.type.slice(1),
        status: updatedTask.completed ? 'completed' : 'pending'
      })
      .eq('id', updatedTask.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      return false;
    }

    await fetchTasks();
    return true;
  };

  const deleteTask = async (taskId: string) => {
    if (!user) {
      toast.error('Please log in to delete tasks');
      return false;
    }

    const { error } = await supabase
      .from('daily_tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
      return false;
    }

    toast.success('Task deleted');
    await fetchTasks();
    return true;
  };

  const toggleComplete = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return false;

    return updateTask({ ...task, completed: !task.completed });
  };

  return {
    tasks,
    loading,
    vehicles,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    refetch: fetchTasks
  };
}
