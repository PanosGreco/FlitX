
import { useState } from "react";
import { 
  Car, 
  Calendar, 
  AlertTriangle, 
  FileText, 
  Droplet, 
  ChevronLeft,
  BarChart3,
  Gauge,
  Settings,
  RefreshCcw,
  Wrench,
  Upload,
  PenLine,
  Edit,
  Plus,
  Trash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths, addYears } from "date-fns";

interface MaintenanceEntry {
  id: string;
  type: string;
  date: Date;
  cost: number;
  notes?: string;
  reminder?: {
    type: 'once' | '3months' | '6months' | '1year' | 'custom';
    date: Date;
  };
}

interface VehicleDetailsProps {
  vehicleId?: string;
  vehicles: any[];
}

export function VehicleDetails({ vehicleId, vehicles = [] }: VehicleDetailsProps) {
  
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("details");
  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false);
  const [isEditFinanceOpen, setIsEditFinanceOpen] = useState(false);
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);
  const [isEditMaintenanceOpen, setIsEditMaintenanceOpen] = useState(false);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [documentName, setDocumentName] = useState("");
  const [documents, setDocuments] = useState<{name: string; date: string}[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceEntry[]>([]);
  const [newEntry, setNewEntry] = useState<Partial<MaintenanceEntry>>({
    type: '',
    date: new Date(),
    cost: 0,
    notes: '',
  });
  const [currentEntry, setCurrentEntry] = useState<MaintenanceEntry | null>(null);
  const [reminderType, setReminderType] = useState<'once' | '3months' | '6months' | '1year' | 'custom'>('once');
  const [reminderDate, setReminderDate] = useState<Date>(new Date());
  
  const { toast } = useToast();
  
  
  const vehicle = vehicles.find(v => v.id === vehicleId) || {
    id: "default",
    make: "Vehicle",
    model: "Not Found",
    year: 2023,
    type: "Unknown",
    mileage: 0,
    status: "available",
    licensePlate: "N/A",
    fuelLevel: 0,
    fuelType: "Unknown",
    mpg: 0,
    lastServiceDate: new Date().toISOString(),
    costPerMile: 0,
    dailyRate: 0,
    totalServices: 0,
    serviceReminders: 0,
    totalServiceCost: 0,
    fuelCosts: 0,
    milesPerDay: 0
  };
  
  const safeNumber = (value: any) => {
    return typeof value === 'number' ? value : 0;
  };
  
  const statusColors = {
    available: "bg-green-100 text-green-800",
    rented: "bg-blue-100 text-blue-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    repair: "bg-red-100 text-red-800"
  };
  
  const statusLabels = {
    available: "Available",
    rented: "Rented",
    maintenance: "Maintenance",
    repair: "Needs Repair"
  };

  
  
  const handleEditStatus = () => {
    setCurrentStatus(vehicle.status);
    setIsEditStatusOpen(true);
  };

  const handleStatusChange = (newStatus: string) => {
    setCurrentStatus(newStatus);
  };

  const handleSaveStatus = () => {
    toast({
      title: "Status Updated",
      description: `Vehicle status changed to ${statusLabels[currentStatus as keyof typeof statusLabels] || currentStatus}`,
    });
    setIsEditStatusOpen(false);
  };
  
  const handleEditFinance = () => {
    setTotalRevenue(safeNumber(vehicle.dailyRate * 15));
    setTotalExpenses(safeNumber(vehicle.fuelCosts + vehicle.totalServiceCost));
    setIsEditFinanceOpen(true);
  };
  
  const handleSaveFinance = () => {
    toast({
      title: "Financial Data Updated",
      description: "Vehicle financial information has been updated.",
    });
    setIsEditFinanceOpen(false);
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setDocumentName(file.name);
      
      const newDoc = {
        name: file.name,
        date: new Date().toLocaleDateString()
      };
      
      setDocuments(prev => [...prev, newDoc]);
      
      toast({
        title: "Document Uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });
    }
  };

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) return;
    
    setSelectedDates(dates);

    const lastSelectedDate = dates[dates.length - 1];
    if (vehicle.dailyRate && lastSelectedDate) {
      toast({
        title: "Rental Income Added",
        description: `Added $${vehicle.dailyRate} to income for ${lastSelectedDate.toLocaleDateString()}`,
      });
    }
  };

  const handleUpdateExpenses = (amount: number) => {
    setTotalExpenses(prev => prev + amount);
    toast({
      title: amount > 0 ? "Expense Added" : "Expense Removed",
      description: `${amount > 0 ? 'Added' : 'Removed'} $${Math.abs(amount).toFixed(2)} ${amount > 0 ? 'to' : 'from'} total expenses.`,
    });
  };

  const handleAddNewMaintenance = () => {
    setNewEntry({
      type: '',
      date: new Date(),
      cost: 0,
      notes: '',
    });
    setIsAddMaintenanceOpen(true);
  };

  const handleEditMaintenance = (entry: MaintenanceEntry) => {
    setCurrentEntry(entry);
    setIsEditMaintenanceOpen(true);
  };

  const handleDeleteMaintenance = (entryId: string) => {
    const entryToDelete = maintenanceHistory.find(entry => entry.id === entryId);
    
    if (entryToDelete && entryToDelete.cost > 0) {
      handleUpdateExpenses(-entryToDelete.cost);
    }
    
    setMaintenanceHistory(prev => prev.filter(entry => entry.id !== entryId));
    
    toast({
      title: "Maintenance Entry Deleted",
      description: "The maintenance record has been removed."
    });
  };

  const handleSaveNewMaintenance = () => {
    if (!newEntry.type) {
      toast({
        title: "Error",
        description: "Please enter a maintenance type",
        variant: "destructive",
      });
      return;
    }

    const entryId = `maintenance-${Date.now()}`;
    const cost = Number(newEntry.cost) || 0;
    
    const entry: MaintenanceEntry = {
      id: entryId,
      type: newEntry.type,
      date: newEntry.date || new Date(),
      cost: cost,
      notes: newEntry.notes,
      reminder: newEntry.reminder
    };

    setMaintenanceHistory(prev => [...prev, entry]);
    
    if (cost > 0) {
      handleUpdateExpenses(cost);
    }
    
    toast({
      title: "Maintenance Added",
      description: `${newEntry.type} maintenance record added successfully.`
    });
    
    setIsAddMaintenanceOpen(false);
  };

  const handleUpdateMaintenance = () => {
    if (!currentEntry) return;

    const originalEntry = maintenanceHistory.find(entry => entry.id === currentEntry.id);
    const costDifference = (currentEntry.cost || 0) - (originalEntry?.cost || 0);
    
    setMaintenanceHistory(prev => 
      prev.map(entry => 
        entry.id === currentEntry.id ? currentEntry : entry
      )
    );
    
    if (costDifference !== 0) {
      handleUpdateExpenses(costDifference);
    }
    
    toast({
      title: "Maintenance Updated",
      description: `${currentEntry.type} maintenance record updated successfully.`
    });
    
    setIsEditMaintenanceOpen(false);
  };

  const openReminderDialog = () => {
    setReminderType('once');
    setReminderDate(new Date());
    setIsReminderDialogOpen(true);
  };

  const handleSetReminder = () => {
    if (!newEntry && !currentEntry) return;
    
    let reminderObj = {
      type: reminderType,
      date: reminderDate,
    };
    
    if (isAddMaintenanceOpen) {
      setNewEntry(prev => ({
        ...prev,
        reminder: reminderObj,
      }));
    } else if (currentEntry) {
      setCurrentEntry(prev => ({
        ...prev!,
        reminder: reminderObj,
      }));
    }
    
    let reminderDescription = "once on " + format(reminderDate, "MMM d, yyyy");
    
    if (reminderType === '3months') {
      reminderDescription = "every 3 months";
    } else if (reminderType === '6months') {
      reminderDescription = "every 6 months";
    } else if (reminderType === '1year') {
      reminderDescription = "annually";
    }
    
    toast({
      title: "Reminder Set",
      description: `You'll be reminded ${reminderDescription}.`
    });
    
    setIsReminderDialogOpen(false);
  };

  const calculateNextReminderDate = (reminder?: { type: string; date: Date }) => {
    if (!reminder) return null;
    
    const { type, date } = reminder;
    const now = new Date();
    
    switch (type) {
      case '3months':
        return addMonths(now, 3);
      case '6months':
        return addMonths(now, 6);
      case '1year':
        return addYears(now, 1);
      case 'once':
      case 'custom':
      default:
        return new Date(date);
    }
  };

  const getPastMaintenanceEntries = () => {
    return maintenanceHistory
      .filter(entry => new Date(entry.date) <= new Date())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getUpcomingMaintenanceEntries = () => {
    return maintenanceHistory
      .filter(entry => entry.reminder && calculateNextReminderDate(entry.reminder)! > new Date())
      .sort((a, b) => {
        const dateA = calculateNextReminderDate(a.reminder) || new Date();
        const dateB = calculateNextReminderDate(b.reminder) || new Date();
        return dateA.getTime() - dateB.getTime();
      });
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-white shadow-bottom">
        <div className="container py-4">
          <div className="flex items-center mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mr-2" 
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center gap-4 pb-2">
            <div className="flex-shrink-0">
              <div className="h-20 w-20 bg-flitx-gray-100 rounded-lg flex items-center justify-center">
                <Car className="h-10 w-10 text-flitx-gray-400" />
              </div>
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center">
                {vehicle.year} {vehicle.make} {vehicle.model}
                <Badge
                  className={`ml-3 ${statusColors[vehicle.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}`}
                  variant="outline"
                >
                  {statusLabels[vehicle.status as keyof typeof statusLabels] || "Unknown"}
                </Badge>
              </h1>
              
              <div className="flex items-center text-flitx-gray-500 mt-1">
                <span>{vehicle.type}</span>
                <span className="mx-2">•</span>
                <span>{vehicle.licensePlate}</span>
                <span className="mx-2">•</span>
                <span>{safeNumber(vehicle.mileage).toLocaleString()} mi</span>
              </div>
            </div>
            
            <div className="flex-shrink-0 flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEditStatus}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Status
              </Button>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 w-full max-w-lg">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="damage">Damage</TabsTrigger>
              <TabsTrigger value="documents">Docs</TabsTrigger>
              <TabsTrigger value="availability">Calendar</TabsTrigger>
              <TabsTrigger value="finance">Finance</TabsTrigger>
            </TabsList>
          
            <div className="container py-6">
              <TabsContent value="details" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Gauge className="h-5 w-5 mr-2 text-flitx-blue" />
                        Performance Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-y-4 mt-2">
                        <div>
                          <div className="text-sm text-flitx-gray-500">MPG</div>
                          <div className="font-semibold text-2xl">{vehicle.mpg || 0}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-flitx-gray-500">Cost/Mi</div>
                          <div className="font-semibold text-2xl">${vehicle.costPerMile || 0}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-flitx-gray-500">Fuel Costs</div>
                          <div className="font-semibold text-2xl">${safeNumber(vehicle.fuelCosts).toLocaleString()}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-flitx-gray-500">Service Costs</div>
                          <div className="font-semibold text-2xl">${safeNumber(vehicle.totalServiceCost).toLocaleString()}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-flitx-gray-500">Miles/Day</div>
                          <div className="font-semibold text-2xl">{vehicle.milesPerDay || 0}</div>
                        </div>
                      </div>

                      <Separator className="my-4" />
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-sm font-medium">Current Fuel Level</div>
                            <div className="text-sm text-flitx-gray-500">{vehicle.fuelLevel || 0}%</div>
                          </div>
                          <Progress value={vehicle.fuelLevel || 0} className="h-3" />
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1">
                            <div className="text-sm text-flitx-gray-500 mb-1">Fuel Type</div>
                            <div className="font-medium">{vehicle.fuelType || 'N/A'}</div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="text-sm text-flitx-gray-500 mb-1">Estimated Range</div>
                            <div className="font-medium">415 miles</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-lg flex items-center">
                        <Wrench className="h-5 w-5 mr-2 text-flitx-blue" />
                        Maintenance
                      </CardTitle>
                      <Button 
                        className="bg-flitx-blue hover:bg-flitx-blue-600" 
                        size="sm"
                        onClick={handleAddNewMaintenance}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add New
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center">
                          <div className="bg-flitx-blue text-white p-2 rounded-lg">
                            <RefreshCcw className="h-5 w-5" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm text-flitx-gray-500">Next Service</div>
                            <div className="font-semibold">In 2,500 mi</div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm text-flitx-gray-500">Last Service</div>
                          <div>{vehicle.lastServiceDate ? new Date(vehicle.lastServiceDate).toLocaleDateString() : 'N/A'}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Service Reminders</span>
                          <div>
                            <span className="text-red-500 font-bold">{vehicle.serviceReminders || 0}</span>
                            <span className="text-flitx-gray-400"> active</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span>Total Services</span>
                          <span>{vehicle.totalServices || 0}</span>
                        </div>
                        
                        <Separator className="my-3" />
                        
                        <div className="text-sm text-flitx-gray-500">Oil Change Status</div>
                        <Progress value={65} className="h-2" />
                        <div className="text-xs text-right text-flitx-gray-400">2,500 mi remaining</div>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      {getPastMaintenanceEntries().length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium text-sm text-flitx-gray-500 mb-2">Maintenance History</h4>
                          <div className="space-y-3">
                            {getPastMaintenanceEntries().map((entry) => (
                              <div 
                                key={entry.id} 
                                className="border rounded-md p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleEditMaintenance(entry)}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium">
                                      {entry.type}
                                    </div>
                                    <div className="text-flitx-gray-500 text-xs mt-1">
                                      {format(new Date(entry.date), "MMMM d, yyyy")}
                                    </div>
                                    {entry.notes && <div className="text-xs mt-1">{entry.notes}</div>}
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold">${entry.cost.toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {getUpcomingMaintenanceEntries().length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium text-sm text-flitx-gray-500 mb-2">Upcoming Services</h4>
                          <div className="space-y-3">
                            {getUpcomingMaintenanceEntries().map((entry) => (
                              <div 
                                key={entry.id} 
                                className="border border-blue-100 bg-blue-50 rounded-md p-3"
                                onClick={() => handleEditMaintenance(entry)}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium">
                                      {entry.type}
                                    </div>
                                    <div className="text-flitx-gray-500 text-xs mt-1">
                                      Due: {calculateNextReminderDate(entry.reminder) 
                                        ? format(calculateNextReminderDate(entry.reminder)!, "MMMM d, yyyy") 
                                        : 'N/A'}
                                    </div>
                                  </div>
                                  <div className="text-xs bg-blue-100 px-2 py-1 rounded">
                                    {entry.reminder?.type === '3months' && 'Every 3 months'}
                                    {entry.reminder?.type === '6months' && 'Every 6 months'}
                                    {entry.reminder?.type === '1year' && 'Annual'}
                                    {entry.reminder?.type === 'once' && 'One-time'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {maintenanceHistory.length === 0 && (
                        <div className="text-center py-4 text-flitx-gray-500">
                          <Wrench className="mx-auto h-8 w-8 text-flitx-gray-300 mb-2" />
                          <p className="text-sm">
                            No maintenance records yet. Add your first maintenance entry.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="damage">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-flitx-gray-500">
                      <AlertTriangle className="mx-auto h-12 w-12 text-flitx-gray-300 mb-3" />
                      <h3 className="text-lg font-medium mb-1">No damage reports</h3>
                      <p className="text-sm">
                        This vehicle has no damage reports. You can add one by clicking the button below.
                      </p>
                      <Button className="mt-4 bg-flitx-blue hover:bg-flitx-blue-600">
                        Report Damage
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="documents">
                <Card>
                  <CardContent className="pt-6">
                    {documents.length === 0 ? (
                      <div className="text-center py-8 text-flitx-gray-500">
                        <FileText className="mx-auto h-12 w-12 text-flitx-gray-300 mb-3" />
                        <h3 className="text-lg font-medium mb-1">No documents uploaded</h3>
                        <p className="text-sm">
                          Upload important documents like registration, insurance, and service records.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 mb-6">
                        <h3 className="text-lg font-medium">Uploaded Documents</h3>
                        <div className="space-y-3">
                          {documents.map((doc, index) => (
                            <div key={index} className="flex items-center justify-between border p-3 rounded-md">
                              <div className="flex items-center">
                                <FileText className="h-5 w-5 mr-2 text-flitx-blue" />
                                <div>
                                  <div className="font-medium">{doc.name}</div>
                                  <div className="text-xs text-flitx-gray-500">Uploaded on {doc.date}</div>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-center">
                      <label htmlFor="document-upload" className="cursor-pointer">
                        <input
                          id="document-upload"
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={handleFileUpload}
                        />
                        <Button className="bg-flitx-blue hover:bg-flitx-blue-600" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Documents
                          </span>
                        </Button>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="availability">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-flitx-blue" />
                      Vehicle Availability
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-flitx-gray-500 text-sm">
                        Select days when the vehicle is booked/unavailable. This will automatically calculate revenue based on the daily rate.
                      </p>
                      
                      <div className="flex flex-col items-center">
                        <CalendarComponent
                          mode="multiple"
                          selected={selectedDates}
                          onSelect={handleDateSelect}
                          className="rounded-md border p-3"
                          modifiersStyles={{
                            selected: {
                              backgroundColor: "#1EAEDB",
                              color: "white",
                            }
                          }}
                        />
                      </div>
                      
                      <div className="mt-4 p-4 bg-blue-50 rounded-md">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm font-medium">Daily Rate</div>
                            <div className="text-2xl font-bold">${vehicle.dailyRate || 0}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium">Selected Days</div>
                            <div className="text-2xl font-bold">{selectedDates.length}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium">Estimated Revenue</div>
                            <div className="text-2xl font-bold">
                              ${safeNumber(vehicle.dailyRate * selectedDates.length).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="finance">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2 text-flitx-blue" />
                        Financial Summary
                      </CardTitle>
                      <Button variant="outline" size="sm" onClick={handleEditFinance} className="flex items-center">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 p-4 rounded-md">
                          <div className="text-sm text-flitx-gray-500">Total Revenue</div>
                          <div className="text-2xl font-bold">${safeNumber(totalRevenue || vehicle.dailyRate * 15).toLocaleString()}</div>
                          <div className="text-xs text-green-600">From {selectedDates.length} booked days</div>
                        </div>
                        
                        <div className="bg-red-50 p-4 rounded-md">
                          <div className="text-sm text-flitx-gray-500">Total Expenses</div>
                          <div className="text-2xl font-bold">${safeNumber(totalExpenses || vehicle.fuelCosts + vehicle.totalServiceCost).toLocaleString()}</div>
                          <div className="text-xs text-flitx-gray-500">Fuel, maintenance, repairs</div>
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-md">
                          <div className="text-sm text-flitx-gray-500">Net Profit</div>
                          <div className="text-2xl font-bold">
                            ${safeNumber((totalRevenue || vehicle.dailyRate * 15) - (totalExpenses || vehicle.fuelCosts + vehicle.totalServiceCost)).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <Button className="w-full mt-4 bg-flitx-blue hover:bg-flitx-blue-600">
                        View Detailed Financial Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      <Dialog open={isEditStatusOpen} onOpenChange={setIsEditStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Vehicle Status</DialogTitle>
            <DialogDescription>
              Change the current status of this vehicle.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={currentStatus} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="rented">Rented</SelectItem>
                <SelectItem value="maintenance">Under Maintenance</SelectItem>
                <SelectItem value="repair">Needs Repair</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditStatusOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-flitx-blue hover:bg-flitx-blue-600" onClick={handleSaveStatus}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditFinanceOpen} onOpenChange={setIsEditFinanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Financial Data</DialogTitle>
            <DialogDescription>
              Manually adjust revenue and expenses for this vehicle.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="total-revenue">Total Revenue ($)</Label>
              <Input 
                id="total-revenue" 
                type="number"
                value={totalRevenue}
                onChange={(e) => setTotalRevenue(Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="total-expenses">Total Expenses ($)</Label>
              <Input 
                id="total-expenses" 
                type="number"
                value={totalExpenses}
                onChange={(e) => setTotalExpenses(Number(e.target.value))}
              />
            </div>
            
            <div className="bg-blue-50 p-3 rounded-md">
              <div className="text-sm font-medium">Calculated Net Profit</div>
              <div className="text-xl font-semibold mt-1">
                ${(totalRevenue - totalExpenses).toLocaleString()}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditFinanceOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-flitx-blue hover:bg-flitx-blue-600" onClick={handleSaveFinance}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMaintenanceOpen} onOpenChange={setIsAddMaintenanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Maintenance Record</DialogTitle>
            <DialogDescription>
              Enter the details for the new maintenance record.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maintenance-type">Maintenance Type</Label>
              <Input 
                id="maintenance-type" 
                placeholder="e.g., Oil Change, Tire Rotation"
                value={newEntry.type || ''}
                onChange={(e) => setNewEntry({...newEntry, type: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Maintenance Date</Label>
              <CalendarComponent
                mode="single"
                selected={newEntry.date}
                onSelect={(date) => date && setNewEntry({...newEntry, date})}
                className="border rounded-md"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maintenance-cost">Cost ($)</Label>
              <Input 
                id="maintenance-cost" 
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={newEntry.cost || ''}
                onChange={(e) => setNewEntry({...newEntry, cost: parseFloat(e.target.value)})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maintenance-notes">Notes (Optional)</Label>
              <Input 
                id="maintenance-notes" 
                placeholder="Additional details about the service"
                value={newEntry.notes || ''}
                onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
              />
            </div>
            
            <Button 
              variant="outline" 
              className="w-full mt-2"
              onClick={openReminderDialog}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Set Reminder
            </Button>
            
            {newEntry.reminder && (
              <div className="bg-blue-50 p-3 rounded-md text-sm">
                <div className="font-medium">Reminder Set</div>
                <div className="text-flitx-gray-500">
                  {newEntry.reminder.type === 'once' && `Once on ${format(newEntry.reminder.date, "MMMM d, yyyy")}`}
                  {newEntry.reminder.type === '3months' && 'Every 3 months'}
                  {newEntry.reminder.type === '6months' && 'Every 6 months'}
                  {newEntry.reminder.type === '1year' && 'Every year'}
                  {newEntry.reminder.type === 'custom' && `On ${format(newEntry.reminder.date, "MMMM d, yyyy")}`}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMaintenanceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewMaintenance} className="bg-flitx-blue hover:bg-flitx-blue-600">
              Save Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditMaintenanceOpen} onOpenChange={setIsEditMaintenanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Maintenance Record</DialogTitle>
            <DialogDescription>
              Update the details for this maintenance record.
            </DialogDescription>
          </DialogHeader>
          
          {currentEntry && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-maintenance-type">Maintenance Type</Label>
                <Input 
                  id="edit-maintenance-type" 
                  value={currentEntry.type}
                  onChange={(e) => setCurrentEntry({...currentEntry, type: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Maintenance Date</Label>
                <CalendarComponent
                  mode="single"
                  selected={new Date(currentEntry.date)}
                  onSelect={(date) => date && setCurrentEntry({...currentEntry, date})}
                  className="border rounded-md"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-maintenance-cost">Cost ($)</Label>
                <Input 
                  id="edit-maintenance-cost" 
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentEntry.cost}
                  onChange={(e) => setCurrentEntry({...currentEntry, cost: parseFloat(e.target.value)})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-maintenance-notes">Notes (Optional)</Label>
                <Input 
                  id="edit-maintenance-notes" 
                  value={currentEntry.notes || ''}
                  onChange={(e) => setCurrentEntry({...currentEntry, notes: e.target.value})}
                />
              </div>
              
              <Button 
                variant="outline" 
                className="w-full mt-2"
                onClick={openReminderDialog}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {currentEntry.reminder ? 'Edit Reminder' : 'Set Reminder'}
              </Button>
              
              {currentEntry.reminder && (
                <div className="bg-blue-50 p-3 rounded-md text-sm">
                  <div className="font-medium">Reminder Set</div>
                  <div className="text-flitx-gray-500">
                    {currentEntry.reminder.type === 'once' && `Once on ${format(new Date(currentEntry.reminder.date), "MMMM d, yyyy")}`}
                    {currentEntry.reminder.type === '3months' && 'Every 3 months'}
                    {currentEntry.reminder.type === '6months' && 'Every 6 months'}
                    {currentEntry.reminder.type === '1year' && 'Every year'}
                    {currentEntry.reminder.type === 'custom' && `On ${format(new Date(currentEntry.reminder.date), "MMMM d, yyyy")}`}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    handleDeleteMaintenance(currentEntry.id);
                    setIsEditMaintenanceOpen(false);
                  }}
                >
                  <Trash className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditMaintenanceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMaintenance} className="bg-flitx-blue hover:bg-flitx-blue-600">
              Update Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Maintenance Reminder</DialogTitle>
            <DialogDescription>
              Choose when you want to be reminded about this maintenance.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reminder-type">Reminder Frequency</Label>
              <Select value={reminderType} onValueChange={(value) => setReminderType(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select when to remind" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once on specific date</SelectItem>
                  <SelectItem value="3months">Every 3 months</SelectItem>
                  <SelectItem value="6months">Every 6 months</SelectItem>
                  <SelectItem value="1year">Every year</SelectItem>
                  <SelectItem value="custom">Custom date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(reminderType === 'once' || reminderType === 'custom') && (
              <div className="space-y-2">
                <Label>Select Date</Label>
                <CalendarComponent
                  mode="single"
                  selected={reminderDate}
                  onSelect={(date) => date && setReminderDate(date)}
                  className="border rounded-md"
                  disabled={(date) => date < new Date()}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetReminder} className="bg-flitx-blue hover:bg-flitx-blue-600">
              Set Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
