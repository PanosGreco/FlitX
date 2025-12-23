import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Calendar, Plus, Settings2, Wrench } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  type: string;
  description: string | null;
  cost: number;
  date: string;
  next_date: string | null;
  mileage: number | null;
}

interface VehicleMaintenanceProps {
  vehicleId: string;
  updateExpenses?: (amount: number, serviceType: string) => void;
}

export function VehicleMaintenance({ vehicleId, updateExpenses }: VehicleMaintenanceProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [serviceType, setServiceType] = useState("oil_change");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().substring(0, 10));
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { language, isLanguageLoading } = useLanguage();
  const { user } = useAuth();
  
  useEffect(() => {
    if (vehicleId && user) {
      fetchMaintenanceRecords();
    }
  }, [vehicleId, user]);
  
  const fetchMaintenanceRecords = async () => {
    try {
      setLoading(true);
      if (!vehicleId) return;
      
      const { data, error } = await supabase
        .from("vehicle_maintenance")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("date", { ascending: false });
        
      if (error) {
        console.error("Error fetching maintenance records:", error);
        toast({
          title: "Error",
          description: "Failed to load maintenance history",
          variant: "destructive"
        });
      } else {
        setRecords(data || []);
      }
    } catch (error) {
      console.error("Exception fetching maintenance records:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddRecord = async () => {
    if (!serviceType || !serviceDate || !cost) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add maintenance records",
        variant: "destructive"
      });
      return;
    }
      
    try {
      const costValue = parseFloat(cost);
      
      const { error } = await supabase
        .from("vehicle_maintenance")
        .insert([{
          vehicle_id: vehicleId,
          user_id: user.id,
          type: serviceType,
          date: serviceDate,
          next_date: nextServiceDate || null,
          cost: costValue,
          description: notes
        }]);
        
      if (error) {
        console.error("Error adding maintenance record:", error);
        toast({
          title: "Error",
          description: "Failed to add maintenance record",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Maintenance record added"
        });
        
        if (updateExpenses && costValue > 0) {
          updateExpenses(costValue, getServiceTypeLabel(serviceType));
        }
        
        setServiceType("oil_change");
        setServiceDate(new Date().toISOString().substring(0, 10));
        setNextServiceDate("");
        setCost("");
        setNotes("");
        setIsDialogOpen(false);
        fetchMaintenanceRecords();
      }
    } catch (error) {
      console.error("Exception adding maintenance record:", error);
    }
  };
  
  const getServiceTypeLabel = (type: string) => {
    const labels: {[key: string]: string} = {
      oil_change: language === 'el' ? 'Αλλαγή Λαδιών' : 'Oil Change',
      tire_rotation: language === 'el' ? 'Περιστροφή Ελαστικών' : 'Tire Rotation',
      full_service: language === 'el' ? 'Πλήρες Σέρβις' : 'Full Service',
      filter_replacement: language === 'el' ? 'Αντικατάσταση Φίλτρων' : 'Filter Replacement',
      brake_service: language === 'el' ? 'Σέρβις Φρένων' : 'Brake Service',
      battery_replacement: language === 'el' ? 'Αντικατάσταση Μπαταρίας' : 'Battery Replacement',
      other: language === 'el' ? 'Άλλο Σέρβις' : 'Other Service'
    };
    
    return labels[type] || type;
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US');
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center">
            <Wrench className="h-5 w-5 mr-2 text-primary" />
            {language === 'el' ? 'Ιστορικό Συντήρησης' : 'Maintenance History'}
          </CardTitle>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-primary hover:bg-primary/90"
            disabled={isLanguageLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            {language === 'el' ? 'Προσθήκη Σέρβις' : 'Add Service'}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                {language === 'el' ? 'Φόρτωση ιστορικού συντήρησης...' : 'Loading maintenance records...'}
              </p>
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Settings2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-1">
                {language === 'el' ? 'Κανένα αρχείο συντήρησης' : 'No maintenance records'}
              </h3>
              <p className="text-sm max-w-md mx-auto">
                {language === 'el' 
                  ? 'Καταγράψτε όλα τα σέρβις και τις επισκευές για αυτό το όχημα.'
                  : 'Track all services and repairs for this vehicle.'}
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="mt-4 bg-primary hover:bg-primary/90"
                disabled={isLanguageLoading}
              >
                {language === 'el' 
                  ? 'Προσθήκη Πρώτης Εγγραφής Σέρβις' 
                  : 'Add First Service Record'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="p-4 border rounded-md hover:bg-accent/50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">
                        {getServiceTypeLabel(record.type)}
                      </h3>
                      <div className="text-sm text-muted-foreground mt-1">
                        Performed on {formatDate(record.date)}
                      </div>
                      {record.next_date && (
                        <div className="flex items-center text-sm text-primary mt-1">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          Next service: {formatDate(record.next_date)}
                        </div>
                      )}
                      {record.description && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {record.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        ${Number(record.cost).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'el' ? 'Προσθήκη Εγγραφής Συντήρησης' : 'Add Maintenance Record'}</DialogTitle>
            <DialogDescription>
              {language === 'el' 
                ? 'Καταγράψτε ένα σέρβις ή μια επισκευή για αυτό το όχημα' 
                : 'Record a service or repair for this vehicle'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="service-type">{language === 'el' ? 'Τύπος Σέρβις' : 'Service Type'}</Label>
              <Select value={serviceType} onValueChange={setServiceType} disabled={isLanguageLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'el' ? 'Επιλέξτε τύπο σέρβις' : 'Select service type'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oil_change">{getServiceTypeLabel('oil_change')}</SelectItem>
                  <SelectItem value="tire_rotation">{getServiceTypeLabel('tire_rotation')}</SelectItem>
                  <SelectItem value="full_service">{getServiceTypeLabel('full_service')}</SelectItem>
                  <SelectItem value="filter_replacement">{getServiceTypeLabel('filter_replacement')}</SelectItem>
                  <SelectItem value="brake_service">{getServiceTypeLabel('brake_service')}</SelectItem>
                  <SelectItem value="battery_replacement">{getServiceTypeLabel('battery_replacement')}</SelectItem>
                  <SelectItem value="other">{getServiceTypeLabel('other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="service-date">{language === 'el' ? 'Ημερομηνία Σέρβις' : 'Service Date'}</Label>
              <Input
                id="service-date"
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                disabled={isLanguageLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="next-service">
                {language === 'el' ? 'Επόμενη Ημερομηνία Σέρβις (Προαιρετικό)' : 'Next Service Date (Optional)'}
              </Label>
              <Input
                id="next-service"
                type="date"
                value={nextServiceDate}
                onChange={(e) => setNextServiceDate(e.target.value)}
                disabled={isLanguageLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cost">{language === 'el' ? 'Κόστος (€)' : 'Cost ($)'}</Label>
              <Input
                id="cost"
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                disabled={isLanguageLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">{language === 'el' ? 'Σημειώσεις (Προαιρετικό)' : 'Notes (Optional)'}</Label>
              <Textarea
                id="notes"
                placeholder={language === 'el' 
                  ? 'Προσθέστε τυχόν πρόσθετες λεπτομέρειες σχετικά με αυτό το σέρβις' 
                  : 'Add any additional details about this service'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={isLanguageLoading}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={isLanguageLoading}
            >
              {language === 'el' ? 'Ακύρωση' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleAddRecord}
              className="bg-primary hover:bg-primary/90"
              disabled={isLanguageLoading}
            >
              {language === 'el' ? 'Προσθήκη Εγγραφής' : 'Add Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
