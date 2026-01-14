import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CalendarTask } from "@/pages/Home";

interface MonthlyCalendarProps {
  tasks: CalendarTask[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  loading?: boolean;
  isCompact?: boolean;
}

const TASK_COLORS = {
  delivery: 'bg-emerald-500',
  return: 'bg-orange-500',
  other: 'bg-blue-500'
};

export function MonthlyCalendar({ 
  tasks, 
  selectedDate, 
  onDateSelect, 
  loading,
  isCompact 
}: MonthlyCalendarProps) {
  const { language } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const weekDays = language === 'el' 
    ? ['Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const getTasksForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter(task => task.date === dateStr);
  };

  const renderDayDots = (dayTasks: CalendarTask[]) => {
    const types = [...new Set(dayTasks.map(t => t.type))];
    return (
      <div className="flex gap-0.5 justify-center mt-0.5">
        {types.slice(0, 3).map((type, idx) => (
          <div 
            key={idx} 
            className={cn("w-1.5 h-1.5 rounded-full", TASK_COLORS[type])}
          />
        ))}
      </div>
    );
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
          <h3 className={cn(
            "font-semibold",
            isCompact ? "text-sm" : "text-lg"
          )}>
            {format(currentMonth, language === 'el' ? 'MMMM yyyy' : 'MMMM yyyy')}
          </h3>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(isCompact && "h-6 w-6")}
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className={cn(isCompact && "h-6 w-6")}
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn(isCompact && "px-3 pb-3")}>
        {/* Week Days Header */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map(day => (
            <div 
              key={day} 
              className={cn(
                "text-center font-medium text-muted-foreground",
                isCompact ? "text-[10px]" : "text-xs"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const dayTasks = getTasksForDate(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);

            const dayContent = (
              <button
                key={idx}
                onClick={() => onDateSelect(day)}
                className={cn(
                  "flex flex-col items-center justify-start rounded-md transition-colors",
                  isCompact ? "p-0.5 min-h-[28px]" : "p-1 min-h-[40px]",
                  !isCurrentMonth && "text-muted-foreground/40",
                  isToday && !isSelected && "bg-accent",
                  isSelected && "bg-primary text-primary-foreground",
                  !isSelected && "hover:bg-accent"
                )}
              >
                <span className={cn(
                  "font-medium",
                  isCompact ? "text-[10px]" : "text-sm"
                )}>
                  {format(day, 'd')}
                </span>
                {dayTasks.length > 0 && !isCompact && renderDayDots(dayTasks)}
                {dayTasks.length > 0 && isCompact && (
                  <div className="flex gap-0.5 mt-0.5">
                    {[...new Set(dayTasks.map(t => t.type))].slice(0, 2).map((type, i) => (
                      <div key={i} className={cn("w-1 h-1 rounded-full", TASK_COLORS[type])} />
                    ))}
                  </div>
                )}
              </button>
            );

            // Add popover for days with tasks (only in non-compact mode)
            if (dayTasks.length > 0 && !isCompact) {
              return (
                <Popover key={idx}>
                  <PopoverTrigger asChild>
                    {dayContent}
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="center" side="top">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">
                        {format(day, 'EEEE, MMM d')}
                      </h4>
                      <div className="space-y-1.5">
                        {dayTasks.map((task) => (
                          <div 
                            key={task.id} 
                            className="flex items-start gap-2 text-sm"
                          >
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                              TASK_COLORS[task.type]
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {task.type === 'delivery' 
                                  ? (language === 'el' ? 'Παράδοση' : 'Delivery')
                                  : task.type === 'return'
                                  ? (language === 'el' ? 'Επιστροφή' : 'Return')
                                  : task.title}
                              </p>
                              {task.vehicleName && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {task.vehicleName}
                                </p>
                              )}
                              {task.time && (
                                <p className="text-xs text-muted-foreground">
                                  {task.time}
                                </p>
                              )}
                              {task.customerName && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {task.customerName}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            }

            return dayContent;
          })}
        </div>

        {/* Legend (only in non-compact mode) */}
        {!isCompact && (
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>{language === 'el' ? 'Παράδοση' : 'Delivery'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>{language === 'el' ? 'Επιστροφή' : 'Return'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>{language === 'el' ? 'Άλλο' : 'Other'}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
