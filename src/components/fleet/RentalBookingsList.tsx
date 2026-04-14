import { useState, useEffect, useMemo } from "react";
import { Calendar, User, FileText, Trash2, X, Search, Fuel, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FilePreviewModal } from "@/components/shared/FilePreviewModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { formatDateEuropean, formatTime24h } from "@/utils/dateFormatUtils";

interface RentalBooking {
  id: string;
  booking_number: string | null;
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
  fuel_level?: string | null;
  payment_status?: string | null;
  balance_due_amount?: number | null;
}
interface RentalBookingsListProps {
  vehicleId: string;
  onBookingDeleted: (bookingId: string) => void;
}

export function RentalBookingsList({ vehicleId, onBookingDeleted }: RentalBookingsListProps) {
  const { t } = useTranslation(['fleet', 'common']);
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [additionalInfoMap, setAdditionalInfoMap] = useState<Record<string, { categoryName: string; subcategoryValue: string }[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedContractPath, setSelectedContractPath] = useState<string | null>(null);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [isDeleteContractDialogOpen, setIsDeleteContractDialogOpen] = useState(false);
  const { toast } = useToast();

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase().trim();
    return bookings.filter((booking) =>
      booking.customer_name.toLowerCase().includes(q) ||
      (booking.booking_number && booking.booking_number.toLowerCase().includes(q))
    );
  }, [bookings, searchQuery]);

  useEffect(() => { fetchBookings(); }, [vehicleId]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase.from('rental_bookings').select('*').eq('vehicle_id', vehicleId).order('start_date', { ascending: false });
      if (error) { console.error('Error fetching bookings:', error); return; }
      setBookings(data || []);
      const bookingIds = (data || []).map(b => b.id);
      if (bookingIds.length > 0) {
        const { data: infoData } = await supabase.from('booking_additional_info').select('booking_id, subcategory_value, category_id').in('booking_id', bookingIds);
        if (infoData && infoData.length > 0) {
          const categoryIds = [...new Set(infoData.map(i => i.category_id))];
          const { data: categories } = await supabase.from('additional_info_categories').select('id, name').in('id', categoryIds);
          const catMap = Object.fromEntries((categories || []).map(c => [c.id, c.name]));
          const grouped: Record<string, { categoryName: string; subcategoryValue: string }[]> = {};
          for (const info of infoData) {
            if (!grouped[info.booking_id]) grouped[info.booking_id] = [];
            grouped[info.booking_id].push({ categoryName: catMap[info.category_id] || 'Unknown', subcategoryValue: info.subcategory_value || '' });
          }
          setAdditionalInfoMap(grouped);
        } else { setAdditionalInfoMap({}); }
      }
    } catch (error) { console.error('Error fetching bookings:', error); }
    finally { setLoading(false); }
  };

  const handleViewPhoto = async (photoPath: string, bookingId: string) => {
    try {
      const { data } = await supabase.storage.from('rental-contracts').getPublicUrl(photoPath);
      setSelectedPhoto(data.publicUrl);
      setSelectedBookingId(bookingId);
      setSelectedContractPath(photoPath);
      setIsPhotoDialogOpen(true);
    } catch (error) {
      console.error('Error loading photo:', error);
      toast({ title: t('common:error'), description: t('fleet:contractLoadFailed'), variant: "destructive" });
    }
  };

  const handleDeleteContract = async () => {
    if (!selectedContractPath || !selectedBookingId) return;
    try {
      const { error: storageError } = await supabase.storage.from('rental-contracts').remove([selectedContractPath]);
      if (storageError) console.error('Error deleting contract from storage:', storageError);
      const { error: dbError } = await supabase.from('rental_bookings').update({ contract_photo_path: null }).eq('id', selectedBookingId);
      if (dbError) throw dbError;
      await supabase.from('daily_tasks').update({ contract_path: null }).eq('booking_id', selectedBookingId);
      setBookings(bookings.map((b) => b.id === selectedBookingId ? { ...b, contract_photo_path: undefined } : b));
      setIsPhotoDialogOpen(false);
      setIsDeleteContractDialogOpen(false);
      setSelectedPhoto(null);
      setSelectedBookingId(null);
      setSelectedContractPath(null);
      toast({ title: t('common:deleted'), description: t('fleet:bookingDeletedDesc') });
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast({ title: t('common:error'), description: t('fleet:contractLoadFailed'), variant: "destructive" });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const booking = bookings.find((b) => b.id === bookingId);
      if (booking?.contract_photo_path) {
        const { error: storageError } = await supabase.storage.from('rental-contracts').remove([booking.contract_photo_path]);
        if (storageError) console.error('Error deleting contract from storage:', storageError);
      }
      const { data: tasksWithContracts } = await supabase.from('daily_tasks').select('contract_path').eq('booking_id', bookingId).not('contract_path', 'is', null);
      if (tasksWithContracts && tasksWithContracts.length > 0) {
        const contractPaths = tasksWithContracts.map((t) => t.contract_path).filter(Boolean) as string[];
        if (contractPaths.length > 0) await supabase.storage.from('rental-contracts').remove(contractPaths);
      }
      await supabase.from('daily_tasks').delete().eq('booking_id', bookingId);
      await supabase.from('financial_records').delete().eq('booking_id', bookingId);
      const { error } = await supabase.from('rental_bookings').delete().eq('id', bookingId);
      if (error) throw error;
      setBookings(bookings.filter((b) => b.id !== bookingId));
      onBookingDeleted(bookingId);
      toast({ title: t('fleet:bookingDeleted'), description: t('fleet:bookingDeletedDesc') });
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast({ title: t('common:error'), description: t('fleet:somethingWentWrong'), variant: "destructive" });
    }
  };

  const getBookingStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (now < start) return { status: t('fleet:upcoming'), color: 'bg-blue-100 text-blue-800' };
    if (now >= start && now <= end) return { status: t('fleet:active'), color: 'bg-green-100 text-green-800' };
    return { status: t('common:booked'), color: 'bg-gray-100 text-gray-800' };
  };

  if (loading) {
    return <div className="space-y-4">
      {[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div><div className="h-3 bg-gray-200 rounded w-1/2"></div></CardContent></Card>)}
    </div>;
  }

  if (bookings.length === 0) {
    return <div className="text-center py-8 text-gray-500">
      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
      <p>{t('fleet:noRentalBookings')}</p>
      <p className="text-sm">{t('fleet:createFirstBooking')}</p>
    </div>;
  }

  return <>
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('fleet:searchCustomerOrBookingNumber')} className="pl-9" />
      </div>

      {filteredBookings.length === 0 && searchQuery && <div className="text-center py-4 text-muted-foreground">
        {t('fleet:noBookingsFor')} "{searchQuery}"
      </div>}

      {filteredBookings.map((booking) => {
        const { status, color } = getBookingStatus(booking.start_date, booking.end_date);
        return <Card key={booking.id} className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-lg">{booking.customer_name}</span>
                {booking.booking_number && (
                  <span className="px-2 py-0.5 text-xs font-mono font-medium text-slate-600 bg-slate-100 rounded-md">
                    {booking.booking_number}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {booking.contract_photo_path && <Button variant="ghost" size="sm" onClick={() => handleViewPhoto(booking.contract_photo_path!, booking.id)} className="text-blue-600 hover:text-blue-800 h-8 w-8 p-0">
                  <FileText className="h-4 w-4" />
                </Button>}
                <Badge className={color}>{status}</Badge>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteBooking(booking.id)} className="text-red-500 hover:text-red-700 h-8 w-8 p-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <span className="font-medium text-muted-foreground min-w-[60px] text-base">{t('common:pickup')}:</span>
                <span className="text-base">
                  {formatDateEuropean(booking.start_date)}
                  {booking.pickup_time && <span className="ml-1">• {formatTime24h(booking.pickup_time)}</span>}
                  {booking.pickup_location && <span className="ml-1">• {booking.pickup_location}</span>}
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <span className="font-medium text-muted-foreground min-w-[60px] text-base">{t('common:return')}:</span>
                <span className="text-base">
                  {formatDateEuropean(booking.end_date)}
                  {booking.return_time && <span className="ml-1">• {formatTime24h(booking.return_time)}</span>}
                  {booking.dropoff_location && <span className="ml-1">• {booking.dropoff_location}</span>}
                </span>
              </div>
              {booking.notes && <div className="flex items-start gap-2 text-sm text-gray-600">
                <span className="font-medium text-muted-foreground min-w-[60px] text-base">{t('home:notes')}:</span>
                <span className="text-sm font-semibold text-secondary-foreground">{booking.notes}</span>
              </div>}
              {booking.fuel_level && <div className="flex items-start gap-2 text-sm text-gray-600">
                <span className="font-medium text-muted-foreground min-w-[60px] text-base flex items-center gap-1"><Fuel className="h-3.5 w-3.5" /> {t('home:fuelLevel')}:</span>
                <span className="text-sm text-secondary-foreground font-semibold px-0 my-[3px] mx-px">{booking.fuel_level}</span>
              </div>}
              {booking.payment_status && <div className="flex items-start gap-2 text-sm text-gray-600">
                <span className="font-medium text-muted-foreground min-w-[60px] text-base flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> {t('home:payment')}:</span>
                <span className="text-sm text-secondary-foreground my-[3px] font-semibold">
                  {booking.payment_status === 'paid_in_full' ? t('home:paidInFull') : `${t('home:balanceDue')}${booking.balance_due_amount ? ` (€${booking.balance_due_amount})` : ''}`}
                </span>
              </div>}
              {additionalInfoMap[booking.id] && additionalInfoMap[booking.id].length > 0 && (
                <>
                  {additionalInfoMap[booking.id].map((info, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="font-medium text-muted-foreground min-w-[60px] text-base">{info.categoryName}:</span>
                      <span className="text-sm text-secondary-foreground font-semibold my-[3px]">{info.subcategoryValue}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>;
      })}
    </div>

    <FilePreviewModal open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen} url={selectedPhoto}
      fileType={selectedPhoto && selectedPhoto.split('?')[0].split('#')[0].toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'}
      title={t('fleet:documents')}
      actions={
        <Button variant="destructive" size="sm" onClick={() => setIsDeleteContractDialogOpen(true)} className="gap-2">
          <Trash2 className="h-4 w-4" />
          {t('common:delete')}
        </Button>
      }
    />
    <AlertDialog open={isDeleteContractDialogOpen} onOpenChange={setIsDeleteContractDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('common:delete')}?</AlertDialogTitle>
          <AlertDialogDescription>{t('fleet:bookingDeletedDesc')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteContract} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {t('common:delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
