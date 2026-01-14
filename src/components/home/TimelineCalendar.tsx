import { useState, useMemo } from "react";
import { format, addDays, subDays, startOfWeek, isSameDay, getWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CalendarTask } from "@/pages/Home";

interface TimelineCalendarProps {
  tasks: CalendarTask[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  loading?: boolean;
  isCompact?: boolean;
}

const TASK_COLORS = {
  delivery: { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-700' },
  return: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-700' },
  other: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700' }
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 to 20:00

export function TimelineCalendar({ 
  tasks, 
  selectedDate, 
  onDateSelect, 
  loading,
  isCompact 
}: TimelineCalendarProps) {
  const { language } = useLanguage();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const weekNumber = getWeek(weekStart, { weekStartsOn: 1 });

  const getTasksForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter(task => task.date === dateStr);
  };

  const parseTime = (timeStr: string | null): number | null => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
  };

  const getTaskPosition = (task: CalendarTask) => {
    const time = parseTime(task.time);
    if (time === null) return null;
    
    // Map time to percentage position (8:00 = 0%, 20:00 = 100%)
    const startHour = 8;
    const endHour = 20;
    const position = ((time - startHour) / (endHour - startHour)) * 100;
    return Math.max(0, Math.min(100, position));
  };

  if (loading && !isCompact) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(isCompact && "shadow-sm")}>
      <CardHeader className={cn("pb-2", isCompact && "py-2 px-3")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              className={cn(isCompact && "h-6 w-6")}
              onClick={() => setWeekStart(subDays(weekStart, 7))}
            >
              <ChevronLeft className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className={cn(isCompact && "h-6 w-6")}
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              <ChevronRight className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
            </Button>
          </div>
          <h3 className={cn(
            "font-semibold",
            isCompact ? "text-sm" : "text-lg"
          )}>
            {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
          </h3>
          <div className={cn(
            "px-2 py-1 rounded-md bg-muted text-muted-foreground font-medium",
            isCompact ? "text-xs" : "text-sm"
          )}>
            {language === 'el' ? `Εβδ ${weekNumber}` : `Week ${weekNumber}`}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("overflow-x-auto", isCompact && "px-3 pb-3")}>
        <div className={cn(
          "min-w-[600px]",
          isCompact ? "min-w-[400px]" : "min-w-[700px]"
        )}>
          {/* Days Header */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className={cn(isCompact ? "w-8" : "w-12")} /> {/* Time column spacer */}
            {weekDays.map((day, idx) => {
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDate);
              return (
                <button
                  key={idx}
                  onClick={() => onDateSelect(day)}
                  className={cn(
                    "text-center py-1 rounded-md transition-colors",
                    isToday && !isSelected && "bg-accent",
                    isSelected && "bg-primary text-primary-foreground",
                    !isSelected && "hover:bg-accent"
                  )}
                >
                  <div className={cn(
                    "font-medium uppercase",
                    isCompact ? "text-[8px]" : "text-xs"
                  )}>
                    {format(day, 'EEE')}
                  </div>
                  <div className={cn(
                    "font-bold",
                    isCompact ? "text-sm" : "text-lg"
                  )}>
                    {format(day, 'd')}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Timeline Grid */}
          <div className="relative border rounded-md">
            {/* Hour rows */}
            {(isCompact ? HOURS.filter((_, i) => i % 2 === 0) : HOURS).map((hour, idx) => (
              <div 
                key={hour}
                className={cn(
                  "grid grid-cols-8 gap-1 border-b last:border-b-0",
                  isCompact ? "h-6" : "h-12"
                )}
              >
                <div className={cn(
                  "flex items-center justify-end pr-2 text-muted-foreground border-r",
                  isCompact ? "text-[8px] w-8" : "text-xs w-12"
                )}>
                  {`${hour.toString().padStart(2, '0')}:00`}
                </div>
                {weekDays.map((day, dayIdx) => {
                  const dayTasks = getTasksForDate(day);
                  const tasksInHour = dayTasks.filter(task => {
                    const time = parseTime(task.time);
                    if (time === null) return false;
                    if (isCompact) {
                      return time >= hour && time < hour + 2;
                    }
                    return time >= hour && time < hour + 1;
                  });

                  return (
                    <div 
                      key={dayIdx} 
                      className="relative border-r last:border-r-0"
                    >
                      {tasksInHour.map((task, taskIdx) => {
                        const colors = TASK_COLORS[task.type];
                        
                        const taskBlock = (
                          <div
                            key={task.id}
                            className={cn(
                              "absolute inset-x-0.5 rounded border-l-2",
                              colors.bg,
                              colors.border,
                              colors.text,
                              isCompact ? "text-[7px] px-0.5 py-0" : "text-[10px] px-1 py-0.5"
                            )}
                            style={{
                              top: `${taskIdx * (isCompact ? 50 : 40)}%`,
                              minHeight: isCompact ? '50%' : '80%',
                              maxHeight: isCompact ? '50%' : '80%',
                              overflow: 'hidden'
                            }}
                          >
                            <div className="font-medium truncate">
                              {task.type === 'delivery' 
                                ? (language === 'el' ? 'Παράδοση' : 'Delivery')
                                : task.type === 'return'
                                ? (language === 'el' ? 'Επιστροφή' : 'Return')
                                : task.title}
                            </div>
                            {!isCompact && task.time && (
                              <div className="text-[8px] opacity-80">
                                {task.time}
                              </div>
                            )}
                          </div>
                        );

                        if (!isCompact) {
                          return (
                            <Tooltip key={task.id}>
                              <TooltipTrigger asChild>
                                {taskBlock}
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[200px]">
                                <div className="space-y-1">
                                  <p className="font-medium">
                                    {task.type === 'delivery' 
                                      ? (language === 'el' ? 'Παράδοση' : 'Delivery')
                                      : task.type === 'return'
                                      ? (language === 'el' ? 'Επιστροφή' : 'Return')
                                      : task.title}
                                  </p>
                                  {task.vehicleName && (
                                    <p className="text-xs">{task.vehicleName}</p>
                                  )}
                                  {task.customerName && (
                                    <p className="text-xs">{task.customerName}</p>
                                  )}
                                  {task.time && (
                                    <p className="text-xs">{task.time}</p>
                                  )}
                                  {task.location && (
                                    <p className="text-xs">{task.location}</p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        }

                        return taskBlock;
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
