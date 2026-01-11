import { useState, useEffect, useMemo } from "react";
import { Calendar, User, FileText, Trash2, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDateEuropean, formatTime24h } from "@/utils/dateFormatUtils";
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
export function RentalBookingsList({
  vehicleId,
  onBookingDeleted
}: RentalBookingsListProps) {
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedContractPath, setSelectedContractPath] = useState<string | null>(null);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [isDeleteContractDialogOpen, setIsDeleteContractDialogOpen] = useState(false);
  const {
    toast
  } = useToast();

  // Filter bookings based on search query
  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const query = searchQuery.toLowerCase();
    return bookings.filter(booking => booking.customer_name.toLowerCase().includes(query));
  }, [bookings, searchQuery]);
  useEffect(() => {
    fetchBookings();
  }, [vehicleId]);
  const fetchBookings = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('rental_bookings').select('*').eq('vehicle_id', vehicleId).order('start_date', {
        ascending: false
      });
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
  const handleViewPhoto = async (photoPath: string, bookingId: string) => {
    try {
      const {
        data
      } = await supabase.storage.from('rental-contracts').getPublicUrl(photoPath);
      setSelectedPhoto(data.publicUrl);
      setSelectedBookingId(bookingId);
      setSelectedContractPath(photoPath);
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
  const handleDeleteContract = async () => {
    if (!selectedContractPath || !selectedBookingId) return;
    try {
      // Delete from storage
      const {
        error: storageError
      } = await supabase.storage.from('rental-contracts').remove([selectedContractPath]);
      if (storageError) {
        console.error('Error deleting contract from storage:', storageError);
      }

      // Update booking to remove contract reference
      const {
        error: dbError
      } = await supabase.from('rental_bookings').update({
        contract_photo_path: null
      }).eq('id', selectedBookingId);
      if (dbError) {
        throw dbError;
      }

      // Also update any related daily tasks
      await supabase.from('daily_tasks').update({
        contract_path: null
      }).eq('booking_id', selectedBookingId);

      // Update local state
      setBookings(bookings.map(b => b.id === selectedBookingId ? {
        ...b,
        contract_photo_path: undefined
      } : b));
      setIsPhotoDialogOpen(false);
      setIsDeleteContractDialogOpen(false);
      setSelectedPhoto(null);
      setSelectedBookingId(null);
      setSelectedContractPath(null);
      toast({
        title: "Contract Deleted",
        description: "Contract has been permanently removed"
      });
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast({
        title: "Error",
        description: "Failed to delete contract",
        variant: "destructive"
      });
    }
  };
  const handleDeleteBooking = async (bookingId: string) => {
    try {
      // First, get the booking to find the contract path
      const booking = bookings.find(b => b.id === bookingId);

      // Delete contract file from storage if exists
      if (booking?.contract_photo_path) {
        const {
          error: storageError
        } = await supabase.storage.from('rental-contracts').remove([booking.contract_photo_path]);
        if (storageError) {
          console.error('Error deleting contract from storage:', storageError);
        }
      }

      // Get daily tasks with contract paths to clean up
      const {
        data: tasksWithContracts
      } = await supabase.from('daily_tasks').select('contract_path').eq('booking_id', bookingId).not('contract_path', 'is', null);

      // Delete task contract files from storage
      if (tasksWithContracts && tasksWithContracts.length > 0) {
        const contractPaths = tasksWithContracts.map(t => t.contract_path).filter(Boolean) as string[];
        if (contractPaths.length > 0) {
          await supabase.storage.from('rental-contracts').remove(contractPaths);
        }
      }

      // Delete related daily tasks
      await supabase.from('daily_tasks').delete().eq('booking_id', bookingId);

      // Delete related financial records
      await supabase.from('financial_records').delete().eq('booking_id', bookingId);

      // Delete the booking
      const {
        error
      } = await supabase.from('rental_bookings').delete().eq('id', bookingId);
      if (error) {
        throw error;
      }
      setBookings(bookings.filter(b => b.id !== bookingId));
      onBookingDeleted(bookingId);
      toast({
        title: "Booking Deleted",
        description: "Booking, contracts, tasks, and financial records have been permanently removed"
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
    if (now < start) return {
      status: 'upcoming',
      color: 'bg-blue-100 text-blue-800'
    };
    if (now >= start && now <= end) return {
      status: 'active',
      color: 'bg-green-100 text-green-800'
    };
    return {
      status: 'completed',
      color: 'bg-gray-100 text-gray-800'
    };
  };
  const formatTime = (time: string | null) => {
    return formatTime24h(time);
  };
  if (loading) {
    return <div className="space-y-4">
        {[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>)}
      </div>;
  }
  if (bookings.length === 0) {
    return <div className="text-center py-8 text-gray-500">
        <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No rental bookings found</p>
        <p className="text-sm">Create your first booking to get started</p>
      </div>;
  }
  return <>
      <div className="space-y-4">
        {/* Customer Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by customer name..." className="pl-9" />
        </div>

        {filteredBookings.length === 0 && searchQuery && <div className="text-center py-4 text-muted-foreground">
            No bookings found for "{searchQuery}"
          </div>}

        {filteredBookings.map(booking => {
        const {
          status,
          color
        } = getBookingStatus(booking.start_date, booking.end_date);
        return <Card key={booking.id} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-lg">{booking.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {booking.contract_photo_path && <Button variant="ghost" size="sm" onClick={() => handleViewPhoto(booking.contract_photo_path!, booking.id)} onDoubleClick={() => handleViewPhoto(booking.contract_photo_path!, booking.id)} className="text-blue-600 hover:text-blue-800 h-8 w-8 p-0" title="View Contract (double-click for large view)">
                        <FileText className="h-4 w-4" />
                      </Button>}
                    <Badge className={color}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteBooking(booking.id)} className="text-red-500 hover:text-red-700 h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {/* Pickup Info - all on one line */}
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="font-medium text-muted-foreground min-w-[60px] text-base">Pickup:</span>
                    <span className="text-base">
                      {formatDateEuropean(booking.start_date)}
                      {booking.pickup_time && <span className="ml-1">• {formatTime(booking.pickup_time)}</span>}
                      {booking.pickup_location && <span className="ml-1">• {booking.pickup_location}</span>}
                    </span>
                  </div>

                  {/* Drop-off Info - all on one line */}
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="font-medium text-muted-foreground min-w-[60px] text-base">Return:</span>
                    <span className="text-base">
                      {formatDateEuropean(booking.end_date)}
                      {booking.return_time && <span className="ml-1">• {formatTime(booking.return_time)}</span>}
                      {booking.dropoff_location && <span className="ml-1">• {booking.dropoff_location}</span>}
                    </span>
                  </div>
                  
                  {booking.notes && <div className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="font-medium text-muted-foreground min-w-[60px] text-base">Notes:</span>
                      <span className="text-sm font-semibold text-secondary-foreground">{booking.notes}</span>
                    </div>}
                </div>
              </CardContent>
            </Card>;
      })}
      </div>

      {/* Large Contract Viewer Dialog */}
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Contract Document</span>
            </DialogTitle>
          </DialogHeader>
          {selectedPhoto && <div className="flex flex-col items-center">
              <div className="overflow-auto max-h-[70vh] w-full flex justify-center">
                <img src={selectedPhoto} alt="Contract" className="max-w-full object-contain rounded" style={{
              maxHeight: '65vh'
            }} />
              </div>
            </div>}
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="destructive" size="sm" onClick={() => setIsDeleteContractDialogOpen(true)} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete Contract
            </Button>
            <Button variant="outline" onClick={() => setIsPhotoDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Contract Confirmation */}
      <AlertDialog open={isDeleteContractDialogOpen} onOpenChange={setIsDeleteContractDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the contract file. The booking will remain intact, and you can upload a new contract later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContract} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}