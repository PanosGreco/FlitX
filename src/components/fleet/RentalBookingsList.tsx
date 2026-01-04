import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, User, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RentalBooking {
  id: string;
  start_date: string;
  end_date: string;
  pickup_time: string | null;
  return_time: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  customer_name: string;
  notes: string;
  contract_photo_path?: string;
  created_at: string;
}

interface RentalBookingsListProps {
  vehicleId: string;
  onBookingDeleted: (bookingId: string) => void;
}

export function RentalBookingsList({ vehicleId, onBookingDeleted }: RentalBookingsListProps) {
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, [vehicleId]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('rental_bookings')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }

      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPhoto = async (photoPath: string) => {
    try {
      const { data } = await supabase.storage
        .from('rental-contracts')
        .getPublicUrl(photoPath);
      
      setSelectedPhoto(data.publicUrl);
      setIsPhotoDialogOpen(true);
    } catch (error) {
      console.error('Error loading photo:', error);
      toast({
        title: "Error",
        description: "Failed to load contract photo",
        variant: "destructive"
      });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      // Also delete related daily tasks
      await supabase
        .from('daily_tasks')
        .delete()
        .eq('booking_id', bookingId);

      const { error } = await supabase
        .from('rental_bookings')
        .delete()
        .eq('id', bookingId);

      if (error) {
        throw error;
      }

      setBookings(bookings.filter(b => b.id !== bookingId));
      onBookingDeleted(bookingId);
      
      toast({
        title: "Booking Deleted",
        description: "Rental booking and related tasks have been removed",
      });
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive"
      });
    }
  };

  const getBookingStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) return { status: 'upcoming', color: 'bg-blue-100 text-blue-800' };
    if (now >= start && now <= end) return { status: 'active', color: 'bg-green-100 text-green-800' };
    return { status: 'completed', color: 'bg-gray-100 text-gray-800' };
  };

  const formatTime = (time: string | null) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'h:mm a');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No rental bookings found</p>
        <p className="text-sm">Create your first booking to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {bookings.map((booking) => {
          const { status, color } = getBookingStatus(booking.start_date, booking.end_date);
          
          return (
            <Card key={booking.id} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{booking.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {booking.contract_photo_path && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPhoto(booking.contract_photo_path!)}
                        className="text-blue-600 hover:text-blue-800 h-8 w-8 p-0"
                        title="View Contract"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                    <Badge className={color}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBooking(booking.id)}
                      className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {/* Pickup Info - all on one line */}
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="font-medium text-muted-foreground min-w-[60px]">Pickup:</span>
                    <span>
                      {format(new Date(booking.start_date), 'MMM dd, yyyy')}
                      {booking.pickup_time && (
                        <span className="ml-1">• {formatTime(booking.pickup_time)}</span>
                      )}
                      {booking.pickup_location && (
                        <span className="ml-1">• {booking.pickup_location}</span>
                      )}
                    </span>
                  </div>

                  {/* Drop-off Info - all on one line */}
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="font-medium text-muted-foreground min-w-[60px]">Return:</span>
                    <span>
                      {format(new Date(booking.end_date), 'MMM dd, yyyy')}
                      {booking.return_time && (
                        <span className="ml-1">• {formatTime(booking.return_time)}</span>
                      )}
                      {booking.dropoff_location && (
                        <span className="ml-1">• {booking.dropoff_location}</span>
                      )}
                    </span>
                  </div>
                  
                  {booking.notes && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="font-medium text-muted-foreground min-w-[60px]">Notes:</span>
                      <span>{booking.notes}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contract Photo</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="flex justify-center">
              <img 
                src={selectedPhoto} 
                alt="Contract" 
                className="max-w-full max-h-96 object-contain rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
