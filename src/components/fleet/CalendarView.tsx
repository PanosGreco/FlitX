import { useState, useEffect } from "react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface RentalBooking {
  id: string;
  start_date: string;
  end_date: string;
  customer_name: string;
  notes: string;
}

interface CalendarViewProps {
  vehicleId: string;
  onNewBooking: (selectedDates: Date[]) => void;
  refreshTrigger: number;
}

export function CalendarView({ vehicleId, onNewBooking, refreshTrigger }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBookings();
  }, [vehicleId, refreshTrigger]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('rental_bookings')
        .select('*')
        .eq('vehicle_id', vehicleId);

      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }

      setBookings(data || []);
      
      // Calculate booked dates
      const booked = new Set<string>();
      (data || []).forEach(booking => {
        const start = new Date(booking.start_date);
        const end = new Date(booking.end_date);
        const dates = eachDayOfInterval({ start, end });
        dates.forEach(date => {
          booked.add(format(date, 'yyyy-MM-dd'));
        });
      });
      setBookedDates(booked);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleDateSelect = (dates: Date[] | undefined) => {
    setSelectedDates(dates || []);
  };

  const handleNewBooking = () => {
    if (selectedDates.length === 0) {
      return;
    }
    onNewBooking(selectedDates);
    setSelectedDates([]);
  };

  const isDateBooked = (date: Date) => {
    return bookedDates.has(format(date, 'yyyy-MM-dd'));
  };

  const previousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
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
          disabled={selectedDates.length === 0}
          className="bg-flitx-blue hover:bg-flitx-blue-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Booking
        </Button>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          <Calendar
            mode="multiple"
            selected={selectedDates}
            onSelect={handleDateSelect}
            month={currentDate}
            onMonthChange={setCurrentDate}
            className="w-full"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4 w-full",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: cn("h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
              row: "flex w-full mt-2",
              cell: cn(
                "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
                "h-9 w-9"
              ),
              day: cn(
                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                "relative"
              ),
              day_range_end: "day-range-end",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "day-outside text-muted-foreground opacity-50  aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
            }}
            modifiers={{
              booked: (date) => isDateBooked(date),
            }}
            modifiersStyles={{
              booked: {
                backgroundColor: '#dc2626',
                color: 'white',
                fontWeight: 'bold',
              },
            }}
          />
          
          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary rounded"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-accent rounded"></div>
              <span>Today</span>
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
                <h4 className="font-medium text-blue-900">Selected Dates</h4>
                <p className="text-sm text-blue-700">
                  {selectedDates.length} day{selectedDates.length === 1 ? '' : 's'} selected
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-700">
                  {selectedDates.length > 0 && (
                    <>
                      {format(selectedDates[0], 'MMM dd')}
                      {selectedDates.length > 1 && ` - ${format(selectedDates[selectedDates.length - 1], 'MMM dd')}`}
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