import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { DailyProgramSection } from "@/components/daily-program/DailyProgramSection";
import { AddTaskDialog } from "@/components/daily-program/AddTaskDialog";
import { cn } from "@/lib/utils";

export interface DailyTask {
  id: string;
  type: 'return' | 'delivery' | 'other';
  vehicleId: string;
  vehicleName: string;
  scheduledTime: string;
  notes: string;
  completed: boolean;
  date: string;
}

export default function DailyProgram() {
  // Set page title directly without using the translation hook
  document.title = "Daily Program - FlitX";
  
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
      completed: false,
      date: format(new Date(), 'yyyy-MM-dd')
    }
  ]);

  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  const todaysTasks = tasks.filter(task => task.date === selectedDateString);

  const returns = todaysTasks.filter(task => task.type === 'return');
  const deliveries = todaysTasks.filter(task => task.type === 'delivery');
  const otherTasks = todaysTasks.filter(task => task.type === 'other');

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
        {/* Header with Date Picker */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Daily Program</CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'MMM dd, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
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

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Returns Column */}
          <DailyProgramSection
            title="Returns"
            tasks={returns}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />

          {/* Deliveries Column */}
          <DailyProgramSection
            title="Deliveries"
            tasks={deliveries}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />

          {/* Other Tasks Column */}
          <DailyProgramSection
            title="Other Tasks"
            tasks={otherTasks}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        </div>

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
