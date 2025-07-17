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
  Bell,
  Plus
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
import { useToast } from "@/components/ui/use-toast";
import { VehicleMaintenance } from "./VehicleMaintenance";
import { VehicleReminders } from "./VehicleReminders";
import { DamageReport } from "@/components/damage/DamageReport";
import { RentalBookingDialog } from "./RentalBookingDialog";
import { RentalBookingsList } from "./RentalBookingsList";
import { CalendarView } from "./CalendarView";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

// Define a custom interface for our translations that handles both strings and nested objects
interface VehicleTranslations {
  [key: string]: string | VehicleTranslations;
}

// Helper function to safely access translation strings
function getTranslation(translations: VehicleTranslations | undefined, key: string, fallback: string): string {
  if (!translations) return fallback;
  const value = translations[key];
  return typeof value === 'string' ? value : fallback;
}

interface VehicleDetailsProps {
  vehicleId?: string;
  vehicles: any[];
  loading?: boolean;
  translations?: VehicleTranslations;
}

export function VehicleDetails({ vehicleId, vehicles = [], loading = false, translations }: VehicleDetailsProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("details");
  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false);
  const [isEditFinanceOpen, setIsEditFinanceOpen] = useState(false);
  const [isRentalBookingOpen, setIsRentalBookingOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("");
  const [rentedUntilDate, setRentedUntilDate] = useState<Date | undefined>();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [documentName, setDocumentName] = useState("");
  const [documents, setDocuments] = useState<{name: string; date: string}[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [refreshBookings, setRefreshBookings] = useState(0);
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // Use translations from props if provided, otherwise use translations from context
  const trans = translations || {
    serviceReminders: "Service Reminders",
    fuelType: "Fuel Type",
    costPerMile: "Cost Per Mile",
    fuelCosts: "Fuel Costs",
    totalServiceCost: "Total Service Cost",
    milesPerDay: "Miles Per Day",
    lastServiceDate: "Last Service Date",
    totalServices: "Total Services",
    performance: "Performance",
    fuelLevel: "Fuel Level",
    vehicleMaintenance: "Maintenance",
    repair: "Repair",
    documents: "Documents",
    availability: "Availability",
    finance: "Finance",
    overview: "Overview",
    uploadDocuments: "Upload Documents",
    selectDays: "Select days when the vehicle is booked or unavailable",
    dailyRate: "Daily Rate",
    totalRevenue: "Total Revenue",
    totalExpenses: "Total Expenses",
    netProfit: "Net Profit",
    editFinance: "Edit Finance",
    enterFinanceDetails: "Enter finance details for this vehicle",
    financeUpdated: "Finance Updated",
    financeDetailsUpdated: "Finance details have been updated",
    documentUploaded: "Document Uploaded",
    documentSaved: "Your document has been saved",
    rentalIncomeAdded: "Rental Income Added",
    addedIncome: "Added $",
    toIncomeFor: " to income for ",
    editStatus: "Edit Status",
    selectStatus: "Select a status for this vehicle",
    statusUpdated: "Status Updated",
    vehicleStatusChanged: "Vehicle status changed to ",
    rentedUntil: "Rented Until",
    selectRentalEndDate: "Select when the rental period ends"
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
  
  const statusLabels: Record<string, string> = {
    available: typeof t.available === 'string' ? t.available : 'Available',
    rented: typeof t.rented === 'string' ? t.rented : 'Rented',
    maintenance: typeof t.maintenance === 'string' ? t.maintenance : 'Maintenance',
    repair: typeof t.repair === 'string' ? t.repair : 'Needs Repair'
  };

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
    milesPerDay: 0,
    image: undefined,
    rented_until: undefined
  };
  
  const handleEditStatus = () => {
    setCurrentStatus(vehicle.status);
    // Set the current rented_until date if it exists
    if (vehicle.rented_until) {
      setRentedUntilDate(new Date(vehicle.rented_until));
    }
    setIsEditStatusOpen(true);
  };

  const handleStatusChange = (newStatus: string) => {
    setCurrentStatus(newStatus);
    // Clear the rented until date if status is not rented
    if (newStatus !== 'rented') {
      setRentedUntilDate(undefined);
    }
  };

  const handleSaveStatus = async () => {
    try {
      const updateData: any = { status: currentStatus };
      
      // Add rented_until date if status is rented and date is selected
      if (currentStatus === 'rented' && rentedUntilDate) {
        updateData.rented_until = rentedUntilDate.toISOString();
      } else if (currentStatus !== 'rented') {
        // Clear rented_until if status is not rented
        updateData.rented_until = null;
      }

      const { error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', vehicleId);

      if (error) {
        console.error('Error updating vehicle status:', error);
        toast({
          title: "Error",
          description: "Failed to update vehicle status",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: getTranslation(trans, 'statusUpdated', 'Status Updated'),
        description: `${getTranslation(trans, 'vehicleStatusChanged', 'Vehicle status changed to ')} ${statusLabels[currentStatus] || currentStatus}`,
      });
      setIsEditStatusOpen(false);
    } catch (err) {
      console.error('Error in handleSaveStatus:', err);
      toast({
        title: "Error",
        description: "Failed to update vehicle status",
        variant: "destructive"
      });
    }
  };
  
  const handleEditFinance = () => {
    setTotalRevenue(safeNumber(vehicle.dailyRate * 15));
    setTotalExpenses(safeNumber(vehicle.fuelCosts + vehicle.totalServiceCost));
    setIsEditFinanceOpen(true);
  };
  
  const handleSaveFinance = () => {
    toast({
      title: getTranslation(trans, 'financeUpdated', 'Finance Updated'),
      description: getTranslation(trans, 'financeDetailsUpdated', 'Finance details have been updated'),
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
        title: getTranslation(trans, 'documentUploaded', 'Document Uploaded'),
        description: getTranslation(trans, 'documentSaved', 'Your document has been saved'),
      });
    }
  };

  const handleDateSelect = async (dates: Date[] | undefined) => {
    if (!dates) return;
    
    setSelectedDates(dates);

    const lastSelectedDate = dates[dates.length - 1];
    if (vehicle.dailyRate && lastSelectedDate) {
      // Record this booking as income in the financial_records table
      if (vehicleId) {
        try {
          const { data: session } = await supabase.auth.getSession();
          
          if (session?.session?.user) {
            const { error } = await supabase.from('financial_records').insert({
              user_id: session.session.user.id,
              vehicle_id: vehicleId,
              record_type: 'income',
              category: 'sales',
              amount: vehicle.dailyRate,
              date: lastSelectedDate.toISOString(),
              description: `Booking for ${vehicle.make} ${vehicle.model}`
            });
            
            if (error) {
              console.error("Error recording booking income:", error);
            } else {
              toast({
                title: getTranslation(trans, 'rentalIncomeAdded', 'Rental Income Added'),
                description: `${getTranslation(trans, 'addedIncome', 'Added $')}${vehicle.dailyRate} ${getTranslation(trans, 'toIncomeFor', ' to income for ')} ${lastSelectedDate.toLocaleDateString()}`,
              });
            }
          } else {
            console.log("User not authenticated");
            toast({
              title: "Authentication Required",
              description: "Please log in to record bookings",
              variant: "destructive"
            });
          }
        } catch (err) {
          console.error("Error in handleDateSelect:", err);
        }
      }
    }
  };

  const handleUpdateExpenses = async (amount: number, serviceType: string) => {
    setTotalExpenses(prev => prev + amount);
    
    // Record this maintenance cost as expense in the financial_records table
    if (vehicleId && amount > 0) {
      try {
        const { data: session } = await supabase.auth.getSession();
        
        if (session?.session?.user) {
          const { error } = await supabase.from('financial_records').insert({
            user_id: session.session.user.id,
            vehicle_id: vehicleId,
            record_type: 'expense',
            category: 'maintenance',
            amount: amount,
            date: new Date().toISOString(),
            description: `Maintenance: ${serviceType} for ${vehicle.make} ${vehicle.model}`
          });
          
          if (error) {
            console.error("Error recording maintenance expense:", error);
          } else {
            toast({
              title: amount > 0 ? "Expense Added" : "Expense Removed",
              description: `${amount > 0 ? 'Added' : 'Removed'} $${Math.abs(amount).toFixed(2)} ${amount > 0 ? 'to' : 'from'} total expenses.`,
            });
          }
        } else {
          console.log("User not authenticated");
          toast({
            title: "Authentication Required",
            description: "Please log in to record expenses",
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error("Error in handleUpdateExpenses:", err);
      }
    }
  };

  const handleNewBookingFromCalendar = (selectedDates: Date[]) => {
    setSelectedDates(selectedDates);
    setIsRentalBookingOpen(true);
  };

  const handleBookingAdded = (booking: any) => {
    setRefreshBookings(prev => prev + 1);
    setSelectedDates([]); // Clear selection after booking
    toast({
      title: "Booking Added",
      description: `New rental booking created for ${booking.customer_name}`,
    });
  };

  const handleBookingDeleted = (bookingId: string) => {
    setRefreshBookings(prev => prev + 1);
  };

  // Safe access to translation strings
  const getTrans = (key: string, fallback: string): string => {
    return getTranslation(trans, key, fallback);
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
              {typeof t.cancel === 'string' ? t.cancel : 'Cancel'}
            </Button>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center py-12">
              <div className="animate-pulse bg-flitx-gray-100 h-20 w-20 rounded-lg mb-4"></div>
              <div className="animate-pulse bg-flitx-gray-100 h-8 w-48 rounded mb-2"></div>
              <div className="animate-pulse bg-flitx-gray-100 h-4 w-32 rounded"></div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center gap-4 pb-2">
              <div className="flex-shrink-0">
                {vehicle.image ? (
                  <div className="h-20 w-20 rounded-lg overflow-hidden">
                    <img
                      src={vehicle.image}
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-20 bg-flitx-gray-100 rounded-lg flex items-center justify-center">
                    <Car className="h-10 w-10 text-flitx-gray-400" />
                  </div>
                )}
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
                  <span>{safeNumber(vehicle.mileage).toLocaleString()} km</span>
                </div>

                {vehicle.status === 'rented' && vehicle.rented_until && (
                  <div className="mt-2 text-sm text-blue-600 font-medium">
                    Rented Until {new Date(vehicle.rented_until).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0 flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEditStatus}>
                  <Settings className="h-4 w-4 mr-2" />
                  {getTrans('editStatus', 'Edit Status')}
                </Button>
              </div>
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex w-full max-w-5xl mb-6 overflow-x-auto scrollbar-hide">
              <TabsTrigger value="details" className="px-4 py-2 flex-grow">{getTrans('overview', 'Overview')}</TabsTrigger>
              <TabsTrigger value="maintenance" className="px-4 py-2 flex-grow">{getTrans('vehicleMaintenance', 'Maintenance')}</TabsTrigger>
              <TabsTrigger value="damage" className="px-4 py-2 flex-grow">Damages</TabsTrigger>
              <TabsTrigger value="documents" className="px-4 py-2 flex-grow">{getTrans('documents', 'Documents')}</TabsTrigger>
              <TabsTrigger value="availability" className="px-4 py-2 flex-grow">Calendar</TabsTrigger>
              <TabsTrigger value="finance" className="px-4 py-2 flex-grow">{getTrans('finance', 'Finance')}</TabsTrigger>
            </TabsList>
          
            <div className="container py-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="text-flitx-gray-500">Loading vehicle data...</div>
                </div>
              ) : (
                <>
                  <TabsContent value="details" className="mt-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center">
                            <Gauge className="h-5 w-5 mr-2 text-flitx-blue" />
                            {getTrans('performance', 'Performance')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-y-4 mt-2">
                            <div>
                              <div className="text-sm text-flitx-gray-500">{getTrans('fuelType', 'Fuel Type')}</div>
                              <div className="font-semibold text-2xl">{vehicle.mpg || 0} km/L</div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-flitx-gray-500">{getTrans('costPerMile', 'Cost Per Mile')}</div>
                              <div className="font-semibold text-2xl">${vehicle.costPerMile || 0}</div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-flitx-gray-500">{getTrans('fuelCosts', 'Fuel Costs')}</div>
                              <div className="font-semibold text-2xl">${safeNumber(vehicle.fuelCosts).toLocaleString()}</div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-flitx-gray-500">{getTrans('totalServiceCost', 'Total Service Cost')}</div>
                              <div className="font-semibold text-2xl">${safeNumber(vehicle.totalServiceCost).toLocaleString()}</div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-flitx-gray-500">{getTrans('milesPerDay', 'Miles Per Day')}</div>
                              <div className="font-semibold text-2xl">{vehicle.milesPerDay || 0}</div>
                            </div>
                          </div>

                          <Separator className="my-4" />
                          
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <div className="text-sm font-medium">{getTrans('fuelLevel', 'Fuel Level')}</div>
                                <div className="text-sm text-flitx-gray-500">{vehicle.fuelLevel || 0}%</div>
                              </div>
                              <Progress value={vehicle.fuelLevel || 0} className="h-3" />
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4">
                              <div className="flex-1">
                                <div className="text-sm text-flitx-gray-500 mb-1">{getTrans('fuelType', 'Fuel Type')}</div>
                                <div className="font-medium">{vehicle.fuelType || 'N/A'}</div>
                              </div>
                              
                              <div className="flex-1">
                                <div className="text-sm text-flitx-gray-500 mb-1">Estimated Range</div>
                                <div className="font-medium">670 km</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center">
                            <Wrench className="h-5 w-5 mr-2 text-flitx-blue" />
                            {getTrans('vehicleMaintenance', 'Maintenance')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center">
                              <div className="bg-flitx-blue text-white p-2 rounded-lg">
                                <RefreshCcw className="h-5 w-5" />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm text-flitx-gray-500">Next Service</div>
                                <div className="font-semibold">In 4,000 km</div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-sm text-flitx-gray-500">{getTrans('lastServiceDate', 'Last Service Date')}</div>
                              <div>{vehicle.lastServiceDate ? new Date(vehicle.lastServiceDate).toLocaleDateString() : 'N/A'}</div>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{getTrans('serviceReminders', 'Service Reminders')}</span>
                              <div>
                                <span className="text-red-500 font-bold">{vehicle.serviceReminders || 0}</span>
                                <span className="text-flitx-gray-400"> active</span>
                              </div>
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span>{getTrans('totalServices', 'Total Services')}</span>
                              <span>{vehicle.totalServices || 0}</span>
                            </div>
                            
                            <Separator className="my-3" />
                            
                            <div className="text-sm text-flitx-gray-500">Oil Change Status</div>
                            <Progress value={65} className="h-2" />
                            <div className="text-xs text-right text-flitx-gray-400">4,000 km remaining</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="maintenance" className="mt-6">
                    <VehicleMaintenance vehicleId={vehicleId || ""} updateExpenses={handleUpdateExpenses} />
                    <div className="mt-8">
                      <VehicleReminders vehicleId={vehicleId || ""} />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="damage" className="mt-6">
                    <DamageReport vehicleId={vehicleId || ""} />
                  </TabsContent>
                  
                  <TabsContent value="documents" className="mt-6 space-y-8">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <FileText className="h-5 w-5 mr-2" />
                          {getTrans('documents', 'Documents')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-flitx-gray-500">
                              {getTrans('selectDays', 'Select days when the vehicle is booked or unavailable')}
                            </p>
                            <Button variant="outline" size="sm">
                              <Upload className="h-4 w-4 mr-2" />
                              {getTrans('uploadDocuments', 'Upload Documents')}
                            </Button>
                          </div>
                          
                          <input
                            id="file-upload"
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          />
                          
                          {documents.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-sm font-medium">Uploaded Documents</h3>
                              {documents.map((doc, index) => (
                                <div key={index} className="flex items-center justify-between p-2 border rounded">
                                  <span className="text-sm">{doc.name}</span>
                                  <span className="text-xs text-flitx-gray-500">{doc.date}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="availability" className="mt-6">
                    <CalendarView
                      vehicleId={vehicleId || ""}
                      onNewBooking={handleNewBookingFromCalendar}
                      refreshTrigger={refreshBookings}
                    />
                    
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">Booking History</h3>
                      <RentalBookingsList 
                        vehicleId={vehicleId || ""}
                        onBookingDeleted={handleBookingDeleted}
                        key={refreshBookings}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="finance" className="mt-6">
                    <Card className="mb-6">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg flex items-center">
                            <BarChart3 className="h-5 w-5 mr-2 text-flitx-blue" />
                            {getTrans('finance', 'Finance')}
                          </CardTitle>
                          <Button variant="outline" size="sm" onClick={handleEditFinance} className="flex items-center">
                            <Edit className="h-4 w-4 mr-1" />
                            {getTrans('editFinance', 'Edit Finance')}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-green-50 p-4 rounded-md">
                              <div className="text-sm text-flitx-gray-500">{getTrans('totalRevenue', 'Total Revenue')}</div>
                              <div className="text-2xl font-bold">${safeNumber(totalRevenue || vehicle.dailyRate * 15).toLocaleString()}</div>
                              <div className="text-xs text-green-600">From {selectedDates.length} booked days</div>
                            </div>
                            
                            <div className="bg-red-50 p-4 rounded-md">
                              <div className="text-sm text-flitx-gray-500">{getTrans('totalExpenses', 'Total Expenses')}</div>
                              <div className="text-2xl font-bold">${safeNumber(totalExpenses || vehicle.fuelCosts + vehicle.totalServiceCost).toLocaleString()}</div>
                              <div className="text-xs text-flitx-gray-500">Fuel, maintenance, repairs</div>
                            </div>
                            
                            <div className="bg-blue-50 p-4 rounded-md">
                              <div className="text-sm text-flitx-gray-500">{getTrans('netProfit', 'Net Profit')}</div>
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
                </>
              )}
            </div>
          </Tabs>
        </div>
      </div>

      <Dialog open={isEditStatusOpen} onOpenChange={setIsEditStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getTrans('editStatus', 'Edit Status')}</DialogTitle>
            <DialogDescription>
              {getTrans('selectStatus', 'Select a status for this vehicle')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={currentStatus} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder={getTrans('selectStatus', 'Select a status for this vehicle')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">{typeof t.available === 'string' ? t.available : 'Available'}</SelectItem>
                  <SelectItem value="rented">{typeof t.rented === 'string' ? t.rented : 'Rented'}</SelectItem>
                  <SelectItem value="maintenance">{typeof t.maintenance === 'string' ? t.maintenance : 'Maintenance'}</SelectItem>
                  <SelectItem value="repair">{typeof t.repair === 'string' ? t.repair : 'Needs Repair'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {currentStatus === 'rented' && (
              <div className="space-y-2">
                <Label>{getTrans('rentedUntil', 'Rented Until')}</Label>
                <div className="flex flex-col items-center">
                  <CalendarComponent
                    mode="single"
                    selected={rentedUntilDate}
                    onSelect={setRentedUntilDate}
                    className="rounded-md border p-3"
                    disabled={(date) => date < new Date()}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {getTrans('selectRentalEndDate', 'Select when the rental period ends')}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditStatusOpen(false)}>
              {typeof t.cancel === 'string' ? t.cancel : 'Cancel'}
            </Button>
            <Button 
              className="bg-flitx-blue hover:bg-flitx-blue-600" 
              onClick={handleSaveStatus}
              disabled={currentStatus === 'rented' && !rentedUntilDate}
            >
              {typeof t.save === 'string' ? t.save : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditFinanceOpen} onOpenChange={setIsEditFinanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getTrans('editFinance', 'Edit Finance')}</DialogTitle>
            <DialogDescription>
              {getTrans('enterFinanceDetails', 'Enter finance details for this vehicle')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="total-revenue">{getTrans('totalRevenue', 'Total Revenue')} ($)</Label>
              <Input 
                id="total-revenue" 
                type="number"
                value={totalRevenue}
                onChange={(e) => setTotalRevenue(Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="total-expenses">{getTrans('totalExpenses', 'Total Expenses')} ($)</Label>
              <Input 
                id="total-expenses" 
                type="number"
                value={totalExpenses}
                onChange={(e) => setTotalExpenses(Number(e.target.value))}
              />
            </div>
            
            <div className="bg-blue-50 p-3 rounded-md">
              <div className="text-sm font-medium">{getTrans('netProfit', 'Net Profit')}</div>
              <div className="text-xl font-semibold mt-1">
                ${(totalRevenue - totalExpenses).toLocaleString()}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditFinanceOpen(false)}>
              {typeof t.cancel === 'string' ? t.cancel : 'Cancel'}
            </Button>
            <Button className="bg-flitx-blue hover:bg-flitx-blue-600" onClick={handleSaveFinance}>
              {typeof t.save === 'string' ? t.save : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RentalBookingDialog
        isOpen={isRentalBookingOpen}
        onClose={() => setIsRentalBookingOpen(false)}
        vehicleId={vehicleId || ""}
        vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        onBookingAdded={handleBookingAdded}
      />
    </div>
  );
}
