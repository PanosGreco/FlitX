import { useState } from "react";
import { CalendarIcon, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { DailyProgramSection } from "@/components/daily-program/DailyProgramSection";
import { AddTaskDialog } from "@/components/daily-program/AddTaskDialog";
import { cn } from "@/lib/utils";
import { useDailyTasks, DailyTask } from "@/hooks/useDailyTasks";
import { formatDateShortEuropean } from "@/utils/dateFormatUtils";
import { format } from "date-fns";
export type { DailyTask } from "@/hooks/useDailyTasks";
export default function DailyProgram() {
  document.title = "Daily Program - FlitX";
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const {
    tasks,
    loading,
    vehicles,
    addTask,
    updateTask,
    deleteTask
  } = useDailyTasks(selectedDate);
  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');

  // Filter tasks by type
  const returns = tasks.filter(task => task.type === 'return');
  const deliveries = tasks.filter(task => task.type === 'delivery');
  const otherTasks = tasks.filter(task => task.type === 'other');
  const handleAddTask = async (newTask: Omit<DailyTask, 'id' | 'date'>) => {
    const success = await addTask(newTask);
    if (success) {
      setIsAddDialogOpen(false);
    }
  };
  const handleUpdateTask = async (updatedTask: DailyTask) => {
    await updateTask(updatedTask);
  };
  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
  };
  return <MobileLayout>
      <div className="p-4 space-y-4">
        {/* Header with Date Picker */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-center flex-1 text-primary text-xl font-extrabold">                                Daily Program</CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal text-muted-foreground text-lg rounded")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateShortEuropean(selectedDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={selectedDate} onSelect={date => date && setSelectedDate(date)} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
        </Card>

        {/* Add Task Button */}
        <Button onClick={() => setIsAddDialogOpen(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add New Task
        </Button>

        {/* Loading State */}
        {loading ? <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div> : (/* Three Column Layout */
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {/* Returns Column */}
            <DailyProgramSection title="Returns" tasks={returns} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />

            {/* Deliveries Column */}
            <DailyProgramSection title="Deliveries" tasks={deliveries} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />

            {/* Other Tasks Column */}
            <DailyProgramSection title="Other Tasks" tasks={otherTasks} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />
          </div>)}

        {/* Add Task Dialog */}
        <AddTaskDialog isOpen={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} onAddTask={handleAddTask} vehicles={vehicles} selectedDate={selectedDate} />
      </div>
    </MobileLayout>;
}