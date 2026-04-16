import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CalendarIcon, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';

interface AddAccidentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface BookingOption {
  id: string;
  booking_number: string;
  customer_name: string;
  start_date: string;
  end_date: string;
  vehicle_label: string;
}

type PayerType = 'insurance' | 'customer' | 'business' | 'split';

export function AddAccidentDialog({ isOpen, onClose, onSuccess }: AddAccidentDialogProps) {
  const { t } = useTranslation('crm');
  const { user } = useAuth();

  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [bookingPopoverOpen, setBookingPopoverOpen] = useState(false);
  const [accidentDate, setAccidentDate] = useState<Date>(new Date());
  const [description, setDescription] = useState('');
  const [totalDamageCost, setTotalDamageCost] = useState<number>(0);
  const [payerType, setPayerType] = useState<PayerType>('split');
  const [amountPaidByInsurance, setAmountPaidByInsurance] = useState(0);
  const [amountPaidByCustomer, setAmountPaidByCustomer] = useState(0);
  const [amountPaidByBusiness, setAmountPaidByBusiness] = useState(0);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch bookings when dialog opens
  useEffect(() => {
    if (!isOpen || !user) return;
    (async () => {
      const { data, error } = await supabase
        .from('rental_bookings')
        .select('id, booking_number, customer_name, start_date, end_date, vehicle_id, vehicles(make, model)')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[AddAccidentDialog] Fetch bookings failed:', error);
        return;
      }
      setBookings(
        (data || []).map((b: any) => ({
          id: b.id,
          booking_number: b.booking_number,
          customer_name: b.customer_name,
          start_date: b.start_date,
          end_date: b.end_date,
          vehicle_label: b.vehicles ? `${b.vehicles.make} ${b.vehicles.model}` : '',
        }))
      );
    })();
  }, [isOpen, user]);

  // Auto-fill amounts when payerType or totalDamageCost changes (non-split modes)
  useEffect(() => {
    if (payerType === 'insurance') {
      setAmountPaidByInsurance(totalDamageCost);
      setAmountPaidByCustomer(0);
      setAmountPaidByBusiness(0);
    } else if (payerType === 'customer') {
      setAmountPaidByInsurance(0);
      setAmountPaidByCustomer(totalDamageCost);
      setAmountPaidByBusiness(0);
    } else if (payerType === 'business') {
      setAmountPaidByInsurance(0);
      setAmountPaidByCustomer(0);
      setAmountPaidByBusiness(totalDamageCost);
    }
  }, [payerType, totalDamageCost]);

  const handleSplitChange = (field: 'insurance' | 'customer' | 'business', value: number) => {
    if (field === 'insurance') {
      setAmountPaidByInsurance(value);
      setAmountPaidByBusiness(Math.max(0, totalDamageCost - value - amountPaidByCustomer));
    } else if (field === 'customer') {
      setAmountPaidByCustomer(value);
      setAmountPaidByBusiness(Math.max(0, totalDamageCost - amountPaidByInsurance - value));
    } else {
      setAmountPaidByBusiness(value);
    }
  };

  const resetForm = useCallback(() => {
    setSelectedBookingId(null);
    setAccidentDate(new Date());
    setDescription('');
    setTotalDamageCost(0);
    setPayerType('split');
    setAmountPaidByInsurance(0);
    setAmountPaidByCustomer(0);
    setAmountPaidByBusiness(0);
    setNotes('');
  }, []);

  const handleSave = async () => {
    if (!user || !selectedBookingId || !description.trim() || totalDamageCost <= 0) {
      toast.error(t('accident_fillRequired'));
      return;
    }

    let computedInsurance = 0;
    let computedCustomer = 0;
    let computedBusiness = 0;
    if (payerType === 'insurance') {
      computedInsurance = totalDamageCost;
    } else if (payerType === 'customer') {
      computedCustomer = totalDamageCost;
    } else if (payerType === 'business') {
      computedBusiness = totalDamageCost;
    } else {
      computedInsurance = amountPaidByInsurance;
      computedCustomer = amountPaidByCustomer;
      computedBusiness = amountPaidByBusiness;
    }

    if (Math.abs((computedInsurance + computedCustomer + computedBusiness) - totalDamageCost) > 0.01) {
      toast.error(t('accident_amountsMustMatch'));
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('accidents').insert({
        user_id: user.id,
        booking_id: selectedBookingId,
        accident_date: format(accidentDate, 'yyyy-MM-dd'),
        description: description.trim(),
        total_damage_cost: totalDamageCost,
        amount_paid_by_insurance: computedInsurance,
        amount_paid_by_customer: computedCustomer,
        amount_paid_by_business: computedBusiness,
        payer_type: payerType,
        notes: notes.trim() || null,
      });

      if (error) throw error;

      toast.success(t('accident_created'));
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      console.error('[AddAccidentDialog] Save failed:', err);
      toast.error(t('accident_createFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const selectedBooking = bookings.find(b => b.id === selectedBookingId);
  const formatBookingDate = (d: string) => {
    try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return d; }
  };

  const amountsMismatch = payerType === 'split' && totalDamageCost > 0 &&
    Math.abs((amountPaidByInsurance + amountPaidByCustomer + amountPaidByBusiness) - totalDamageCost) > 0.01;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {t('addAccidentRecord')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Booking selector */}
          <div className="space-y-1.5 min-w-0">
            <Label>{t('accident_selectBooking')} *</Label>
            <Popover open={bookingPopoverOpen} onOpenChange={setBookingPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-start text-left font-normal h-auto min-h-10 overflow-hidden">
                  {selectedBooking ? (
                    <span className="truncate text-sm block w-full">
                      {selectedBooking.booking_number} — {selectedBooking.customer_name} — {selectedBooking.vehicle_label} ({formatBookingDate(selectedBooking.start_date)} → {formatBookingDate(selectedBooking.end_date)})
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm truncate">{t('accident_selectBooking')}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[95vw] p-0 pointer-events-auto" align="start">
                <Command>
                  <CommandInput placeholder={t('accident_searchBooking')} />
                  <CommandList>
                    <CommandEmpty>{t('accident_noBookings')}</CommandEmpty>
                    <CommandGroup>
                      {bookings.map(b => (
                        <CommandItem
                          key={b.id}
                          value={`${b.booking_number} ${b.customer_name}`}
                          onSelect={() => { setSelectedBookingId(b.id); setBookingPopoverOpen(false); }}
                          className="text-sm"
                        >
                          <span className="truncate">
                            {b.booking_number} — {b.customer_name} — {b.vehicle_label} ({formatBookingDate(b.start_date)} → {formatBookingDate(b.end_date)})
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Date picker */}
          <div className="space-y-1.5">
            <Label>{t('accident_date')} *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !accidentDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(accidentDate, 'dd/MM/yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={accidentDate}
                  onSelect={(d) => d && setAccidentDate(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>{t('accident_description')} *</Label>
            <Textarea
              rows={3}
              placeholder={t('accident_descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Total Damage Cost */}
          <div className="space-y-1.5">
            <Label>{t('accident_totalDamageCost')} *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="pl-7"
                value={totalDamageCost || ''}
                onChange={(e) => setTotalDamageCost(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Who Paid */}
          <div className="space-y-1.5">
            <Label>{t('accident_whoPaid')} *</Label>
            <RadioGroup value={payerType} onValueChange={(v) => setPayerType(v as PayerType)} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="insurance" id="payer-insurance" />
                <Label htmlFor="payer-insurance" className="font-normal cursor-pointer">{t('accident_paidByInsurance')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="customer" id="payer-customer" />
                <Label htmlFor="payer-customer" className="font-normal cursor-pointer">{t('accident_paidByCustomer')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="business" id="payer-business" />
                <Label htmlFor="payer-business" className="font-normal cursor-pointer">{t('accident_paidByBusiness')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="split" id="payer-split" />
                <Label htmlFor="payer-split" className="font-normal cursor-pointer">{t('accident_paidSplit')}</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Split amounts (3-way) */}
          {payerType === 'split' && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs">{t('accident_insurancePaid')}</Label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="pl-6"
                    value={amountPaidByInsurance || ''}
                    onChange={(e) => handleSplitChange('insurance', Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs">{t('accident_customerPaid')}</Label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="pl-6"
                    value={amountPaidByCustomer || ''}
                    onChange={(e) => handleSplitChange('customer', Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs">{t('accident_businessPaid')}</Label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="pl-6"
                    value={amountPaidByBusiness || ''}
                    onChange={(e) => handleSplitChange('business', Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              {amountsMismatch && (
                <p className="col-span-3 text-xs text-destructive">{t('accident_amountsMustMatch')}</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{t('accident_notes')}</Label>
            <Textarea
              rows={2}
              placeholder={t('accident_notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }} disabled={isLoading}>
            {t('common:cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !selectedBookingId || !description.trim() || totalDamageCost <= 0}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('accident_saving')}</>
            ) : (
              t('accident_save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
