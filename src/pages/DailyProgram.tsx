import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { DailyProgramSection } from "@/components/daily-program/DailyProgramSection";
import { AddTaskDialog } from "@/components/daily-program/AddTaskDialog";
import { usePageTitle } from "@/hooks/usePageTitle";

export interface DailyTask {
  id: string;
  type: 'return' | 'delivery' | 'other';
  vehicleId: string;
  vehicleName: string;
  scheduledTime: string;
  notes: string;
  hasOutstandingBalance: boolean;
  completed: boolean;
  date: string;
}

export default function DailyProgram() {
  usePageTitle("Daily Program - FlitX");
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<DailyTask[]>([
    // Sample data
    {
      id: '1',
      type: 'return',
      vehicleId: 'FL-001',
      vehicleName: 'Toyota Corolla',
      scheduledTime: '09:00',
      notes: 'Check for damage on rear bumper',
      hasOutstandingBalance: true,
      completed: false,
      date: format(new Date(), 'yyyy-MM-dd')
    },
    {
      id: '2',
      type: 'delivery',
      vehicleId: 'FL-003',
      vehicleName: 'Honda Civic',
      scheduledTime: '14:30',
      notes: 'Customer requested full tank',
      hasOutstandingBalance: false,
      completed: false,
      date: format(new Date(), 'yyyy-MM-dd')
    }
  ]);

  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  const todaysTasks = tasks.filter(task => task.date === selectedDateString);

  const returns = todaysTasks.filter(task => task.type === 'return');
  const deliveries = todaysTasks.filter(task => task.type === 'delivery');
  const otherTasks = todaysTasks.filter(task => task.type === 'other');

  const handlePreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleAddTask = (newTask: Omit<DailyTask, 'id' | 'date'>) => {
    const task: DailyTask = {
      ...newTask,
      id: Date.now().toString(),
      date: selectedDateString
    };
    setTasks([...tasks, task]);
  };

  const handleUpdateTask = (updatedTask: DailyTask) => {
    setTasks(tasks.map(task => task.id === updatedTask.id ? updatedTask : task));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  return (
    <MobileLayout>
      <div className="p-4 space-y-4">
        {/* Date Navigation Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Daily Program</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousDay}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium min-w-[120px] text-center">
                  {format(selectedDate, 'MMM dd, yyyy')}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextDay}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Add Task Button */}
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Task
        </Button>

        {/* Returns Section */}
        <DailyProgramSection
          title="Returns"
          tasks={returns}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />

        {/* Deliveries Section */}
        <DailyProgramSection
          title="Deliveries"
          tasks={deliveries}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />

        {/* Other Tasks Section */}
        <DailyProgramSection
          title="Other Tasks"
          tasks={otherTasks}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />

        {/* Add Task Dialog */}
        <AddTaskDialog
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onAddTask={handleAddTask}
        />
      </div>
    </MobileLayout>
  );
}
