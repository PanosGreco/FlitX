import { useState } from "react";
import { CalendarIcon, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AppLayout } from "@/components/layout/AppLayout";
import { DailyProgramSection } from "@/components/daily-program/DailyProgramSection";
import { AddTaskDialog } from "@/components/daily-program/AddTaskDialog";
import { cn } from "@/lib/utils";
import { useDailyTasks, DailyTask } from "@/hooks/useDailyTasks";
import { formatDateShortEuropean } from "@/utils/dateFormatUtils";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
export type { DailyTask } from "@/hooks/useDailyTasks";

export default function DailyProgram() {
  document.title = "Daily Program - FlitX";
  const { t } = useTranslation(['dailyProgram', 'common']);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { tasks, loading, vehicles, addTask, updateTask, deleteTask } = useDailyTasks(selectedDate);
  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');

  const returns = tasks.filter(task => task.type === 'return');
  const deliveries = tasks.filter(task => task.type === 'delivery');
  const otherTasks = tasks.filter(task => task.type === 'other');

  const handleAddTask = async (newTask: Omit<DailyTask, 'id' | 'date'>) => {
    const success = await addTask(newTask);
    if (success) setIsAddDialogOpen(false);
  };
  const handleUpdateTask = async (updatedTask: DailyTask) => { await updateTask(updatedTask); };
  const handleDeleteTask = async (taskId: string) => { await deleteTask(taskId); };

  return (
    <AppLayout>
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-center flex-1 text-primary text-xl font-extrabold">{t('dailyProgram:title')}</CardTitle>
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

        <Button onClick={() => setIsAddDialogOpen(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />{t('dailyProgram:addNewTask')}
        </Button>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <DailyProgramSection title={t('dailyProgram:dropOffs')} tasks={returns} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />
            <DailyProgramSection title={t('dailyProgram:pickUps')} tasks={deliveries} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />
            <DailyProgramSection title={t('dailyProgram:otherTasks')} tasks={otherTasks} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />
          </div>
        )}

        <AddTaskDialog isOpen={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} onAddTask={handleAddTask} vehicles={vehicles} selectedDate={selectedDate} onDateChange={setSelectedDate} />
      </div>
    </AppLayout>
  );
}
