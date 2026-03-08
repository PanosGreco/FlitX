import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface MaintenanceBlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  vehicleName: string;
  onBlockAdded: () => void;
}

export function MaintenanceBlockDialog({ isOpen, onClose, vehicleId, vehicleName, onBlockAdded }: MaintenanceBlockDialogProps) {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation(['fleet', 'common']);

  const handleSave = async () => {
    if (!startDate || !endDate) {
      toast({ title: t('common:error'), description: t('fleet:selectStartEndDates'), variant: "destructive" });
      return;
    }
    if (endDate < startDate) {
      toast({ title: t('common:error'), description: t('fleet:endDateAfterStart'), variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("maintenance_blocks").insert({
        vehicle_id: vehicleId, user_id: session.session.user.id,
        start_date: format(startDate, "yyyy-MM-dd"), end_date: format(endDate, "yyyy-MM-dd"),
        description: description || null,
      });
      if (error) throw error;
      toast({ title: t('common:success'), description: t('fleet:maintenanceScheduleAdded') });
      onBlockAdded();
      onClose();
      setStartDate(undefined); setEndDate(undefined); setDescription("");
    } catch (error) {
      console.error("Error adding maintenance block:", error);
      toast({ title: t('common:error'), description: t('fleet:failedAddMaintenance'), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('fleet:scheduleUnavailability')}</DialogTitle>
          <DialogDescription>{t('fleet:selectUnavailableDates', { name: vehicleName })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('fleet:startDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM dd, yyyy") : <span>{t('fleet:pickDate')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>{t('fleet:endDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM dd, yyyy") : <span>{t('fleet:pickDate')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => startDate ? date < startDate : false} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('fleet:description')}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('fleet:descriptionPlaceholder')} className="resize-none" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>{t('common:cancel')}</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? t('common:saving') : t('fleet:addMaintenance')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
