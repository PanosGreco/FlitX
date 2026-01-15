import { useState, useMemo, useEffect, useRef } from "react";
import { format, addDays, subDays, startOfWeek, isSameDay, getWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Plus, X, MapPin, Clock, Car, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

// Task colors - Other tasks now use blue, not purple
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
    bg: 'bg-blue-100/80',
    border: 'border-l-blue-500',
    text: 'text-blue-700',
    hover: 'hover:bg-blue-100'
  }
};

// Full day hours from 00:00 to 23:00
const HOURS = Array.from({
  length: 24
}, (_, i) => i);
const HOUR_HEIGHT = 72; // pixels per hour

export function TimelineCalendar({
  tasks,
  selectedDate,
  onDateSelect,
  loading,
  onCreateClick
}: TimelineCalendarProps) {
  const {
    language
  } = useLanguage();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), {
    weekStartsOn: 1
  }));
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const weekDays = useMemo(() => {
    return Array.from({
      length: 7
    }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);
  const weekNumber = getWeek(weekStart, {
    weekStartsOn: 1
  });

  // Auto-scroll to current time on initial load
  useEffect(() => {
    if (!loading && scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();

      // Calculate scroll position to center current time
      const scrollPosition = currentHour * HOUR_HEIGHT + currentMinutes / 60 * HOUR_HEIGHT;
      const containerHeight = scrollContainerRef.current.clientHeight;
      const centeredPosition = scrollPosition - containerHeight / 2;
      scrollContainerRef.current.scrollTop = Math.max(0, centeredPosition);
    }
  }, [loading]);
  const getTasksForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter(task => task.date === dateStr);
  };
  const parseTime = (timeStr: string | null): number | null => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  // Group tasks by hour and handle overlapping
  const getTasksForHour = (dayTasks: CalendarTask[], hour: number) => {
    return dayTasks.filter(task => {
      const time = parseTime(task.time);
      if (time === null) return hour === 9; // Default to 9am
      return Math.floor(time) === hour;
    });
  };

  // Calculate dynamic row height based on number of tasks
  const getRowHeight = (dayIdx: number, hour: number) => {
    const day = weekDays[dayIdx];
    const dayTasks = getTasksForDate(day);
    const tasksInHour = getTasksForHour(dayTasks, hour);

    // Calculate max tasks across all days for this hour
    let maxTasksInHour = 0;
    weekDays.forEach(d => {
      const dt = getTasksForDate(d);
      const th = getTasksForHour(dt, hour);
      maxTasksInHour = Math.max(maxTasksInHour, th.length);
    });

    // Minimum height is HOUR_HEIGHT, expand if more than 1 task
    const minTaskHeight = 60;
    if (maxTasksInHour <= 1) return HOUR_HEIGHT;
    return Math.max(HOUR_HEIGHT, maxTasksInHour * minTaskHeight + 12);
  };

  // Calculate row heights for all hours
  const rowHeights = useMemo(() => {
    return HOURS.map(hour => {
      let maxTasksInHour = 0;
      weekDays.forEach(day => {
        const dayTasks = getTasksForDate(day);
        const tasksInHour = getTasksForHour(dayTasks, hour);
        maxTasksInHour = Math.max(maxTasksInHour, tasksInHour.length);
      });
      const minTaskHeight = 60;
      if (maxTasksInHour <= 1) return HOUR_HEIGHT;
      return Math.max(HOUR_HEIGHT, maxTasksInHour * minTaskHeight + 12);
    });
  }, [tasks, weekDays]);
  if (loading) {
    return <div className="bg-white rounded-xl shadow-sm h-full flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>;
  }
  return <div className="h-full flex flex-col">
      {/* Header Row - Navigation, Title, Week Badge, Create Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Navigation Arrows */}
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors" onClick={() => setWeekStart(subDays(weekStart, 7))}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors" onClick={() => setWeekStart(addDays(weekStart, 7))}>
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
        <Button onClick={onCreateClick} className="text-white rounded-full px-5 py-2 h-auto shadow-sm bg-primary">
          <Plus className="h-4 w-4 mr-1.5" />
          Create
        </Button>
      </div>

      {/* Timeline Grid - with internal scroll only */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        {/* Days Header - Fixed, aligned with grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 flex-shrink-0">
          <div className="border-r border-slate-200" /> {/* Time column spacer - no padding */}
          {weekDays.map((day, idx) => {
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);
          return <button key={idx} onClick={() => onDateSelect(day)} className={cn("py-4 text-center transition-colors border-l border-slate-200 bg-[#b9b9bb] text-secondary-foreground", isToday && "bg-teal-50/50", isSelected && "bg-teal-50")}>
                <div className={cn("text-xs font-medium uppercase tracking-wide mb-1 bg-[#b9b9bb] text-secondary-foreground", isToday ? "text-teal-600" : "text-slate-400")}>
                  {format(day, 'EEE')}
                </div>
                <div className={cn("text-2xl font-semibold bg-[#b9b9bb]", isToday ? "text-teal-600" : "text-slate-700")}>
                  {format(day, 'd')}
                </div>
              </button>;
        })}
        </div>

        {/* Hour Rows - Scrollable */}
        <div ref={scrollContainerRef} className="relative flex-1 overflow-y-auto">
          {HOURS.map((hour, hourIdx) => {
          const rowHeight = rowHeights[hourIdx];
          return <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200" style={{
            minHeight: `${rowHeight}px`
          }}>
                {/* Time Label - aligned with border */}
                <div className="flex items-start justify-end pr-3 pt-1 text-xs text-slate-400 font-medium border-r border-slate-200 mx-0 my-0 px-0">
                  {`${hour.toString().padStart(2, '0')}:00`}
                </div>
                
                {/* Day Columns */}
                {weekDays.map((day, dayIdx) => {
              const dayTasks = getTasksForDate(day);
              const isToday = isSameDay(day, new Date());
              const tasksInHour = getTasksForHour(dayTasks, hour);
              return <div key={dayIdx} className={cn("relative border-l border-slate-200 p-1", isToday && "bg-teal-50/30")}>
                      {/* Stack tasks vertically within the hour */}
                      <div className="flex flex-col gap-1">
                        {tasksInHour.map(task => {
                    const colors = TASK_COLORS[task.type];
                    return <div key={task.id} onClick={() => setSelectedTask(task)} className={cn("rounded-lg border-l-[3px] px-2 py-1.5 cursor-pointer transition-all", colors.bg, colors.border, colors.text, colors.hover)} style={{
                      minHeight: '56px'
                    }}>
                              {/* Task Type Header */}
                              <div className="font-semibold text-[11px] leading-tight text-slate-800">
                                {task.type === 'delivery' ? 'Delivery' : task.type === 'return' ? 'Return' : 'Other Task'}
                              </div>
                              {/* Vehicle name - visible for all task types */}
                              {task.vehicleName && <div className="text-[11px] mt-0.5 truncate font-semibold text-slate-700">
                                  {task.vehicleName}
                                </div>}
                              {/* Customer name for delivery/return */}
                              {task.customerName && <div className="text-[11px] truncate text-slate-600 font-medium">
                                  {task.customerName}
                                </div>}
                              {/* Time */}
                              {task.time && <div className="text-[11px] mt-0.5 font-medium text-slate-600">
                                  {task.time}
                                </div>}
                            </div>;
                  })}
                      </div>
                    </div>;
            })}
              </div>;
        })}
          
          {/* Current time indicator line */}
          <CurrentTimeIndicator hours={HOURS} rowHeights={rowHeights} />
        </div>
      </div>

      {/* Task Details Popup */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={cn("px-2 py-0.5 rounded text-xs font-medium", selectedTask?.type === 'delivery' && "bg-emerald-100 text-emerald-700", selectedTask?.type === 'return' && "bg-orange-100 text-orange-700", selectedTask?.type === 'other' && "bg-blue-100 text-blue-700")}>
                {selectedTask?.type === 'delivery' ? 'Delivery' : selectedTask?.type === 'return' ? 'Return' : 'Other Task'}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedTask && <div className="space-y-4">
              {/* Vehicle */}
              {selectedTask.vehicleName && <div className="flex items-start gap-3">
                  <Car className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Vehicle</div>
                    <div className="text-sm font-medium text-slate-800">{selectedTask.vehicleName}</div>
                  </div>
                </div>}

              {/* Customer */}
              {selectedTask.customerName && <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Customer</div>
                    <div className="text-sm font-medium text-slate-800">{selectedTask.customerName}</div>
                  </div>
                </div>}

              {/* Time */}
              {selectedTask.time && <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Time</div>
                    <div className="text-sm font-medium text-slate-800">{selectedTask.time}</div>
                  </div>
                </div>}

              {/* Location */}
              {selectedTask.location && <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Location</div>
                    <div className="text-sm font-medium text-slate-800">{selectedTask.location}</div>
                  </div>
                </div>}

              {/* Notes */}
              {selectedTask.notes && <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Notes</div>
                    <div className="text-sm text-slate-700">{selectedTask.notes}</div>
                  </div>
                </div>}

              {/* Title for other tasks */}
              {selectedTask.type === 'other' && selectedTask.title && <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Title</div>
                    <div className="text-sm font-medium text-slate-800">{selectedTask.title}</div>
                  </div>
                </div>}
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
}
function CurrentTimeIndicator({
  hours,
  rowHeights
}: {
  hours: number[];
  rowHeights: number[];
}) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  // Only show if current time is within our displayed hours
  if (currentHour < hours[0] || currentHour >= hours[hours.length - 1] + 1) {
    return null;
  }

  // Calculate position based on dynamic row heights
  let topPosition = 0;
  for (let i = 0; i < currentHour - hours[0]; i++) {
    topPosition += rowHeights[i];
  }
  const currentHourHeight = rowHeights[currentHour - hours[0]] || HOUR_HEIGHT;
  const minuteOffset = currentMinutes / 60 * currentHourHeight;
  topPosition += minuteOffset;
  return <div className="absolute left-[60px] right-0 flex items-center pointer-events-none z-50" style={{
    top: `${topPosition}px`
  }}>
      <div className="w-2 h-2 rounded-full bg-blue-500 -ml-1" />
      <div className="flex-1 h-[2px] bg-blue-500" />
    </div>;
}