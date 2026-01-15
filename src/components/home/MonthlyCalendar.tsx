import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CalendarTask } from "@/pages/Home";
interface MonthlyCalendarProps {
  tasks: CalendarTask[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  loading?: boolean;
}
const TASK_COLORS = {
  delivery: 'bg-emerald-400',
  return: 'bg-orange-400',
  other: 'bg-blue-400'
};
export function MonthlyCalendar({
  tasks,
  selectedDate,
  onDateSelect,
  loading
}: MonthlyCalendarProps) {
  const {
    language
  } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, {
      weekStartsOn: 1
    });
    const calendarEnd = endOfWeek(monthEnd, {
      weekStartsOn: 1
    });
    return eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd
    });
  }, [currentMonth]);
  const getTasksForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter(task => task.date === dateStr);
  };
  const renderDayDots = (dayTasks: CalendarTask[]) => {
    const types = [...new Set(dayTasks.map(t => t.type))];
    return <div className="flex gap-[2px] justify-center absolute -bottom-0.5 left-1/2 -translate-x-1/2">
        {types.slice(0, 3).map((type, idx) => <div key={idx} className={cn("w-1 h-1 rounded-full", TASK_COLORS[type])} />)}
      </div>;
  };
  if (loading) {
    return <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>;
  }
  return <div className="bg-white rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-800">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-0.5">
          <button className="p-1 hover:bg-slate-100 rounded text-teal-500 transition-colors" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="p-1 hover:bg-slate-100 rounded text-teal-500 transition-colors" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map(day => <div key={day} className="text-center text-[11px] font-medium py-1 text-primary">
            {day}
          </div>)}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
        const dayTasks = getTasksForDate(day);
        const isToday = isSameDay(day, new Date());
        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, currentMonth);
        const dayContent = <button key={idx} onClick={() => onDateSelect(day)} className={cn("relative flex items-center justify-center w-full aspect-square text-sm transition-all", !isCurrentMonth && "text-slate-300", isCurrentMonth && "text-slate-700", isToday && !isSelected && "bg-teal-50 text-teal-600 rounded-full font-medium",
        // Changed: Selected date now uses soft gray instead of solid green
        isSelected && !isToday && "bg-slate-200/60 rounded-full font-medium", isSelected && isToday && "bg-teal-100 text-teal-600 rounded-full font-medium", !isSelected && !isToday && "hover:bg-slate-50 rounded-full")}>
              <span>{format(day, 'd')}</span>
              {dayTasks.length > 0 && renderDayDots(dayTasks)}
            </button>;

        // Add popover for days with tasks
        if (dayTasks.length > 0) {
          return <Popover key={idx}>
                <PopoverTrigger asChild>
                  {dayContent}
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 shadow-lg" align="center" side="right">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-slate-700">
                      {format(day, 'EEEE, MMM d')}
                    </h4>
                    <div className="space-y-2">
                      {dayTasks.map(task => <div key={task.id} className="flex items-start gap-2 text-sm p-2 bg-slate-50 rounded-lg">
                          <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", TASK_COLORS[task.type])} />
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Task type and vehicle */}
                            <div>
                              <p className="font-medium text-slate-700 text-sm">
                                {task.type === 'delivery' ? 'Delivery' : task.type === 'return' ? 'Return' : task.title}
                              </p>
                              {task.vehicleName && <p className="text-slate-600 text-sm">
                                  {task.vehicleName}
                                </p>}
                            </div>
                            
                            {/* Notes if available */}
                            {task.notes && <p className="text-[11px] text-slate-500 line-clamp-2">
                                {task.notes}
                              </p>}
                            
                            {/* Time and location grouped */}
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {task.time && <p className="text-slate-500 text-sm">
                                  🕐 {task.time}
                                </p>}
                              {task.location && <p className="text-[11px] text-slate-500">
                                  📍 {task.location}
                                </p>}
                            </div>
                          </div>
                        </div>)}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>;
        }
        return dayContent;
      })}
      </div>
    </div>;
}