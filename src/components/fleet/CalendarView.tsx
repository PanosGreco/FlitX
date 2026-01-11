import { useState, useEffect, useMemo } from "react";
import { format, eachDayOfInterval, isSameDay, isWithinInterval, isBefore, isAfter, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface RentalBooking {
  id: string;
  start_date: string;
  end_date: string;
  customer_name: string;
  notes: string;
  pickup_time: string | null;
  return_time: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
}

interface MaintenanceBlock {
  id: string;
  start_date: string;
  end_date: string;
  description: string | null;
}

interface DateInfo {
  type: 'pickup' | 'return';
  time: string | null;
  location: string | null;
  customerName: string;
}

interface CalendarViewProps {
  vehicleId: string;
  onNewBooking: (selectedDates: Date[]) => void;
  refreshTrigger: number;
}

export function CalendarView({ vehicleId, onNewBooking, refreshTrigger }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState<MaintenanceBlock[]>([]);
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [maintenanceDates, setMaintenanceDates] = useState<Set<string>>(new Set());
  const [dateInfoMap, setDateInfoMap] = useState<Map<string, DateInfo[]>>(new Map());
  const { language } = useLanguage();

  useEffect(() => {
    fetchData();
  }, [vehicleId, refreshTrigger]);

  const fetchData = async () => {
    try {
      // Fetch bookings and maintenance blocks in parallel
      const [bookingsResult, maintenanceResult] = await Promise.all([
        supabase
          .from('rental_bookings')
          .select('*')
          .eq('vehicle_id', vehicleId)
          .in('status', ['confirmed', 'active', 'pending']),
        supabase
          .from('maintenance_blocks')
          .select('*')
          .eq('vehicle_id', vehicleId)
      ]);

      if (bookingsResult.error) {
        console.error('Error fetching bookings:', bookingsResult.error);
      } else {
        setBookings(bookingsResult.data || []);
        
        // Calculate booked dates and date info
        const booked = new Set<string>();
        const infoMap = new Map<string, DateInfo[]>();
        
        (bookingsResult.data || []).forEach(booking => {
          const start = new Date(booking.start_date);
          const end = new Date(booking.end_date);
          const dates = eachDayOfInterval({ start, end });
          dates.forEach(date => {
            booked.add(format(date, 'yyyy-MM-dd'));
          });
          
          // Add pickup info for start date
          const startKey = format(start, 'yyyy-MM-dd');
          const startInfo: DateInfo = {
            type: 'pickup',
            time: booking.pickup_time,
            location: booking.pickup_location,
            customerName: booking.customer_name
          };
          if (infoMap.has(startKey)) {
            infoMap.get(startKey)!.push(startInfo);
          } else {
            infoMap.set(startKey, [startInfo]);
          }
          
          // Add return info for end date
          const endKey = format(end, 'yyyy-MM-dd');
          const endInfo: DateInfo = {
            type: 'return',
            time: booking.return_time,
            location: booking.dropoff_location,
            customerName: booking.customer_name
          };
          if (infoMap.has(endKey)) {
            infoMap.get(endKey)!.push(endInfo);
          } else {
            infoMap.set(endKey, [endInfo]);
          }
        });
        
        setBookedDates(booked);
        setDateInfoMap(infoMap);
      }

      if (maintenanceResult.error) {
        console.error('Error fetching maintenance blocks:', maintenanceResult.error);
      } else {
        setMaintenanceBlocks(maintenanceResult.data || []);
        
        // Calculate maintenance dates
        const maintenance = new Set<string>();
        (maintenanceResult.data || []).forEach(block => {
          const start = new Date(block.start_date);
          const end = new Date(block.end_date);
          const dates = eachDayOfInterval({ start, end });
          dates.forEach(date => {
            maintenance.add(format(date, 'yyyy-MM-dd'));
          });
        });
        setMaintenanceDates(maintenance);
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    }
  };

  // Calculate selected dates as a range
  const selectedDates = useMemo(() => {
    if (!selectionStart) return [];
    if (!selectionEnd) return [selectionStart];
    
    const start = isBefore(selectionStart, selectionEnd) ? selectionStart : selectionEnd;
    const end = isAfter(selectionStart, selectionEnd) ? selectionStart : selectionEnd;
    
    return eachDayOfInterval({ start, end });
  }, [selectionStart, selectionEnd]);

  // Handle date click for range selection
  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isBooked = bookedDates.has(dateStr);
    const isMaintenance = maintenanceDates.has(dateStr);
    
    // Don't allow selecting booked or maintenance dates
    if (isBooked || isMaintenance) return;
    
    if (!selectionStart) {
      // First click - set start date
      setSelectionStart(date);
      setSelectionEnd(null);
    } else if (!selectionEnd) {
      // Second click - set end date
      setSelectionEnd(date);
    } else {
      // Third click - start new selection
      setSelectionStart(date);
      setSelectionEnd(null);
    }
  };

  // Handle new booking with selected dates
  const handleNewBooking = () => {
    onNewBooking(selectedDates);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const isDateBooked = (date: Date) => {
    return bookedDates.has(format(date, 'yyyy-MM-dd'));
  };

  const isDateMaintenance = (date: Date) => {
    return maintenanceDates.has(format(date, 'yyyy-MM-dd'));
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(d => isSameDay(d, date));
  };

  const getDateInfo = (date: Date): DateInfo[] | undefined => {
    return dateInfoMap.get(format(date, 'yyyy-MM-dd'));
  };

  const previousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Custom day component with popover for pickup/return info
  const DayWithPopover = ({ date, ...props }: { date: Date } & React.HTMLAttributes<HTMLButtonElement>) => {
    const dateInfo = getDateInfo(date);
    const hasInfo = dateInfo && dateInfo.length > 0;
    const isBooked = isDateBooked(date);
    const isMaintenance = isDateMaintenance(date);
    const isSelected = isDateSelected(date);
    const isToday = isSameDay(date, new Date());
    const isSelectionStartDate = selectionStart && isSameDay(date, selectionStart);
    const isSelectionEndDate = selectionEnd && isSameDay(date, selectionEnd);
    
    const dayContent = (
      <button
        {...props}
        onClick={() => handleDateClick(date)}
        className={cn(
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground relative rounded-md transition-colors",
          isBooked && "bg-red-600 text-white font-bold hover:bg-red-700 cursor-not-allowed",
          isMaintenance && !isBooked && "bg-orange-500 text-white font-bold hover:bg-orange-600 cursor-not-allowed",
          isSelected && !isBooked && !isMaintenance && "bg-primary text-primary-foreground hover:bg-primary",
          (isSelectionStartDate || isSelectionEndDate) && "ring-2 ring-primary ring-offset-2",
          isToday && !isBooked && !isMaintenance && !isSelected && "bg-accent text-accent-foreground"
        )}
      >
        {format(date, 'd')}
      </button>
    );

    if (!hasInfo) {
      return dayContent;
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          {dayContent}
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-3 pointer-events-auto" 
          align="center" 
          side="top"
          sideOffset={8}
        >
          <div className="space-y-2">
            {dateInfo.map((info, idx) => (
              <div key={idx} className={cn("text-sm", idx > 0 && "pt-2 border-t border-border")}>
                <div className="font-medium text-foreground mb-1">
                  {info.type === 'pickup' 
                    ? (language === 'el' ? 'Παραλαβή' : 'Pickup')
                    : (language === 'el' ? 'Επιστροφή' : 'Return')
                  }
                </div>
                <div className="text-xs text-muted-foreground mb-1">
                  {info.customerName}
                </div>
                {info.time && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{info.time}</span>
                  </div>
                )}
                {info.location && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3" />
                    <span>{info.location}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[180px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <Button 
          onClick={handleNewBooking}
          className="bg-flitx-blue hover:bg-flitx-blue-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          {language === 'el' ? 'Νέα Κράτηση' : 'New Booking'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <Calendar
            mode="multiple"
            selected={selectedDates}
            month={currentDate}
            onMonthChange={setCurrentDate}
            className="w-full"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-2 w-full",
              caption: "hidden",
              caption_label: "hidden",
              nav: "hidden",
              nav_button: "hidden",
              nav_button_previous: "hidden",
              nav_button_next: "hidden",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
              row: "flex w-full mt-2",
              cell: cn(
                "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                "h-9 w-9"
              ),
              day: cn(
                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                "relative"
              ),
              day_range_end: "day-range-end",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
            }}
            components={{
              Day: ({ date, ...props }) => <DayWithPopover date={date} {...props} />
            }}
          />
          
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary rounded"></div>
              <span>{language === 'el' ? 'Επιλεγμένα' : 'Selected'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span>{language === 'el' ? 'Κρατημένα' : 'Booked'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span>{language === 'el' ? 'Συντήρηση' : 'Maintenance'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-accent rounded"></div>
              <span>{language === 'el' ? 'Σήμερα' : 'Today'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Info */}
      {selectedDates.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">
                  {language === 'el' ? 'Επιλεγμένες Ημερομηνίες' : 'Selected Dates'}
                </h4>
                <p className="text-sm text-blue-700">
                  {selectedDates.length} {language === 'el' ? 'ημέρες' : 'day'}{selectedDates.length === 1 ? '' : 's'} {language === 'el' ? 'επιλεγμένες' : 'selected'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-700">
                  {selectedDates.length > 0 && (
                    <>
                      {format(selectedDates[0], 'dd MMM')}
                      {selectedDates.length > 1 && ` - ${format(selectedDates[selectedDates.length - 1], 'dd MMM')}`}
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
