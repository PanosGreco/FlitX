import { useState, useMemo } from "react";
import { format, addDays, subDays, startOfWeek, isSameDay, getWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CalendarTask } from "@/pages/Home";

interface TimelineCalendarProps {
  tasks: CalendarTask[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  loading?: boolean;
  onCreateClick?: () => void;
}

// Soft pastel colors matching reference
const TASK_COLORS = {
  delivery: { 
    bg: 'bg-emerald-100/80', 
    border: 'border-l-emerald-500', 
    text: 'text-emerald-700',
    hover: 'hover:bg-emerald-100'
  },
  return: { 
    bg: 'bg-orange-100/80', 
    border: 'border-l-orange-400', 
    text: 'text-orange-700',
    hover: 'hover:bg-orange-100'
  },
  other: { 
    bg: 'bg-violet-100/80', 
    border: 'border-l-violet-500', 
    text: 'text-violet-700',
    hover: 'hover:bg-violet-100'
  }
};

// Full day hours from 00:00 to 23:00
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function TimelineCalendar({ 
  tasks, 
  selectedDate, 
  onDateSelect, 
  loading,
  onCreateClick
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

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm h-full flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Row - Navigation, Title, Week Badge, Create Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Navigation Arrows */}
          <div className="flex items-center gap-1">
            <button 
              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"
              onClick={() => setWeekStart(subDays(weekStart, 7))}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Date Range Title */}
          <h2 className="text-xl font-semibold text-slate-800">
            {format(weekDays[0], 'MMMM d')} - {format(weekDays[6], 'd, yyyy')}
          </h2>

          {/* Week Badge */}
          <span className="px-3 py-1 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-full shadow-sm">
            Week {weekNumber}
          </span>
        </div>

        {/* Create Button */}
        <Button 
          onClick={onCreateClick}
          className="bg-teal-500 hover:bg-teal-600 text-white rounded-full px-5 py-2 h-auto shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Create
        </Button>
      </div>

      {/* Timeline Grid - with internal scroll */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        {/* Days Header - Fixed */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 flex-shrink-0">
          <div className="p-3" /> {/* Time column spacer */}
          {weekDays.map((day, idx) => {
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);
            return (
              <button
                key={idx}
                onClick={() => onDateSelect(day)}
                className={cn(
                  "py-4 text-center transition-colors border-l border-slate-200",
                  isToday && "bg-teal-50/50",
                  isSelected && "bg-teal-50"
                )}
              >
                <div className={cn(
                  "text-xs font-medium uppercase tracking-wide mb-1",
                  isToday ? "text-teal-600" : "text-slate-400"
                )}>
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  "text-2xl font-semibold",
                  isToday ? "text-teal-600" : "text-slate-700"
                )}>
                  {format(day, 'd')}
                </div>
              </button>
            );
          })}
        </div>

        {/* Hour Rows - Scrollable */}
        <div className="relative flex-1 overflow-y-auto">
          {HOURS.map((hour) => (
            <div 
              key={hour}
              className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-100 last:border-b-0"
              style={{ height: '72px' }}
            >
              {/* Time Label */}
              <div className="flex items-start justify-end pr-3 pt-1 text-xs text-slate-400 font-medium border-r border-slate-100">
                {`${hour.toString().padStart(2, '0')}:00`}
              </div>
              
              {/* Day Columns */}
              {weekDays.map((day, dayIdx) => {
                const dayTasks = getTasksForDate(day);
                const isToday = isSameDay(day, new Date());
                const tasksInHour = dayTasks.filter(task => {
                  const time = parseTime(task.time);
                  if (time === null) return hour === 9; // Default to 9am
                  return Math.floor(time) === hour;
                });

                return (
                  <div 
                    key={dayIdx} 
                    className={cn(
                      "relative border-l border-slate-200",
                      isToday && "bg-teal-50/30"
                    )}
                  >
                    {tasksInHour.map((task, taskIdx) => {
                      const colors = TASK_COLORS[task.type];
                      const time = parseTime(task.time);
                      const topOffset = time ? ((time - hour) * 100) : 0;
                      
                      return (
                        <Tooltip key={task.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute left-1 right-1 rounded-lg border-l-[3px] px-2 py-1.5 cursor-pointer transition-all",
                                colors.bg,
                                colors.border,
                                colors.text,
                                colors.hover
                              )}
                              style={{
                                top: `${Math.max(topOffset, 2)}%`,
                                minHeight: '60px',
                                zIndex: taskIdx + 1
                              }}
                            >
                              <div className="font-medium text-xs leading-tight">
                                {task.type === 'delivery' 
                                  ? 'Delivery'
                                  : task.type === 'return'
                                  ? 'Return'
                                  : task.title}
                              </div>
                              {task.customerName && (
                                <div className="text-[10px] opacity-80 mt-0.5 truncate">
                                  {task.customerName}
                                </div>
                              )}
                              {task.time && (
                                <div className="text-[10px] opacity-70 mt-1">
                                  {task.time}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px] p-3 shadow-lg">
                            <div className="space-y-1.5">
                              <p className="font-semibold text-sm">
                                {task.type === 'delivery' 
                                  ? 'Delivery'
                                  : task.type === 'return'
                                  ? 'Return'
                                  : task.title}
                              </p>
                              {task.vehicleName && (
                                <p className="text-xs text-slate-600">{task.vehicleName}</p>
                              )}
                              {task.customerName && (
                                <p className="text-xs text-slate-600">{task.customerName}</p>
                              )}
                              {task.time && (
                                <p className="text-xs text-slate-500">{task.time}</p>
                              )}
                              {task.location && (
                                <p className="text-xs text-slate-500">{task.location}</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
          
          {/* Current time indicator line */}
          <CurrentTimeIndicator hours={HOURS} />
        </div>
      </div>
    </div>
  );
}

function CurrentTimeIndicator({ hours }: { hours: number[] }) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  
  // Only show if current time is within our displayed hours
  if (currentHour < hours[0] || currentHour >= hours[hours.length - 1] + 1) {
    return null;
  }
  
  const hourIndex = currentHour - hours[0];
  const minuteOffset = (currentMinutes / 60) * 72; // 72px per hour row
  const topPosition = hourIndex * 72 + minuteOffset;
  
  return (
    <div 
      className="absolute left-[60px] right-0 flex items-center pointer-events-none z-50"
      style={{ top: `${topPosition}px` }}
    >
      <div className="w-2 h-2 rounded-full bg-blue-500 -ml-1" />
      <div className="flex-1 h-[2px] bg-blue-500" />
    </div>
  );
}
