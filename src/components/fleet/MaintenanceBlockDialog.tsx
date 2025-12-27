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
import { useLanguage } from "@/contexts/LanguageContext";

interface MaintenanceBlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  vehicleName: string;
  onBlockAdded: () => void;
}

export function MaintenanceBlockDialog({
  isOpen,
  onClose,
  vehicleId,
  vehicleName,
  onBlockAdded,
}: MaintenanceBlockDialogProps) {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  const handleSave = async () => {
    if (!startDate || !endDate) {
      toast({
        title: language === "el" ? "Σφάλμα" : "Error",
        description: language === "el" 
          ? "Παρακαλώ επιλέξτε ημερομηνίες έναρξης και λήξης" 
          : "Please select start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (endDate < startDate) {
      toast({
        title: language === "el" ? "Σφάλμα" : "Error",
        description: language === "el" 
          ? "Η ημερομηνία λήξης πρέπει να είναι μετά την έναρξη" 
          : "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error("Not authenticated");
      }

      const { error } = await supabase.from("maintenance_blocks").insert({
        vehicle_id: vehicleId,
        user_id: session.session.user.id,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        description: description || null,
      });

      if (error) throw error;

      toast({
        title: language === "el" ? "Επιτυχία" : "Success",
        description: language === "el" 
          ? "Το πρόγραμμα συντήρησης προστέθηκε" 
          : "Maintenance schedule added",
      });

      onBlockAdded();
      onClose();
      
      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setDescription("");
    } catch (error) {
      console.error("Error adding maintenance block:", error);
      toast({
        title: language === "el" ? "Σφάλμα" : "Error",
        description: language === "el" 
          ? "Αποτυχία προσθήκης συντήρησης" 
          : "Failed to add maintenance",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === "el" ? "Προγραμματισμός Συντήρησης" : "Schedule Maintenance"}
          </DialogTitle>
          <DialogDescription>
            {language === "el" 
              ? `Επιλέξτε τις ημερομηνίες για την συντήρηση του ${vehicleName}` 
              : `Select dates for maintenance of ${vehicleName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === "el" ? "Ημερομηνία Έναρξης" : "Start Date"}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM dd, yyyy") : (
                      <span>{language === "el" ? "Επιλέξτε" : "Pick date"}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{language === "el" ? "Ημερομηνία Λήξης" : "End Date"}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM dd, yyyy") : (
                      <span>{language === "el" ? "Επιλέξτε" : "Pick date"}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{language === "el" ? "Περιγραφή (προαιρετικό)" : "Description (optional)"}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={language === "el" 
                ? "π.χ. Αλλαγή λαδιών, Επισκευή φρένων..." 
                : "e.g., Oil change, Brake repair..."}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {language === "el" ? "Ακύρωση" : "Cancel"}
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading 
              ? (language === "el" ? "Αποθήκευση..." : "Saving...") 
              : (language === "el" ? "Προσθήκη Συντήρησης" : "Add Maintenance")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
