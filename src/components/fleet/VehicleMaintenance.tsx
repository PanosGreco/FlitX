
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

interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  service_date: string;
  next_service_date?: string;
  service_type: string;
  cost: number;
  notes?: string;
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
  
  useEffect(() => {
    if (vehicleId) {
      fetchMaintenanceRecords();
    }
  }, [vehicleId]);
  
  const fetchMaintenanceRecords = async () => {
    try {
      setLoading(true);
      if (!vehicleId) return;
      
      const { data, error } = await supabase
        .from("maintenance_records")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("service_date", { ascending: false });
        
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
    
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to add maintenance records",
          variant: "destructive"
        });
        return;
      }
      
      const costValue = parseFloat(cost);
      
      const { data, error } = await supabase
        .from("maintenance_records")
        .insert([{
          vehicle_id: vehicleId,
          user_id: session.session.user.id,
          service_type: serviceType,
          service_date: serviceDate,
          next_service_date: nextServiceDate || null,
          cost: costValue,
          notes: notes
        }])
        .select();
        
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
        
        // Call the updateExpenses function to register this as an expense
        if (updateExpenses && costValue > 0) {
          updateExpenses(costValue, getServiceTypeLabel(serviceType));
        }
        
        // Reset form and refresh records
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
      oil_change: "Oil Change",
      tire_rotation: "Tire Rotation",
      full_service: "Full Service",
      filter_replacement: "Filter Replacement",
      brake_service: "Brake Service",
      battery_replacement: "Battery Replacement",
      other: "Other Service"
    };
    
    return labels[type] || type;
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center">
            <Wrench className="h-5 w-5 mr-2 text-flitx-blue" />
            Maintenance History
          </CardTitle>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-flitx-blue hover:bg-flitx-blue-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-flitx-blue border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-flitx-gray-500">Loading maintenance records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-flitx-gray-500">
              <Settings2 className="h-12 w-12 mx-auto mb-3 text-flitx-gray-300" />
              <h3 className="text-lg font-medium mb-1">No maintenance records</h3>
              <p className="text-sm max-w-md mx-auto">
                Track all services and repairs for this vehicle to maintain its performance and value.
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="mt-4 bg-flitx-blue hover:bg-flitx-blue-600"
              >
                Add First Service Record
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="p-4 border rounded-md hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">
                        {getServiceTypeLabel(record.service_type)}
                      </h3>
                      <div className="text-sm text-flitx-gray-500 mt-1">
                        Performed on {formatDate(record.service_date)}
                      </div>
                      {record.next_service_date && (
                        <div className="flex items-center text-sm text-flitx-blue mt-1">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          Next service: {formatDate(record.next_service_date)}
                        </div>
                      )}
                      {record.notes && (
                        <p className="mt-2 text-sm text-flitx-gray-600">
                          {record.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        ${record.cost.toFixed(2)}
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
            <DialogTitle>Add Maintenance Record</DialogTitle>
            <DialogDescription>
              Record a service or repair for this vehicle
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="service-type">Service Type</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oil_change">Oil Change</SelectItem>
                  <SelectItem value="tire_rotation">Tire Rotation</SelectItem>
                  <SelectItem value="full_service">Full Service</SelectItem>
                  <SelectItem value="filter_replacement">Filter Replacement</SelectItem>
                  <SelectItem value="brake_service">Brake Service</SelectItem>
                  <SelectItem value="battery_replacement">Battery Replacement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="service-date">Service Date</Label>
              <Input
                id="service-date"
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="next-service">Next Service Date (Optional)</Label>
              <Input
                id="next-service"
                type="date"
                value={nextServiceDate}
                onChange={(e) => setNextServiceDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cost">Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional details about this service"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddRecord}
              className="bg-flitx-blue hover:bg-flitx-blue-600"
            >
              Add Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
