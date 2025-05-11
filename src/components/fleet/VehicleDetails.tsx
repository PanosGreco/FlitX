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
  Bell
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
import { VehicleMaintenance } from "./VehicleMaintenance";
import { VehicleReminders } from "./VehicleReminders";
import { supabase } from "@/integrations/supabase/client";

interface VehicleDetailsProps {
  vehicleId?: string;
  vehicles: any[];
  loading?: boolean;
}

export function VehicleDetails({ vehicleId, vehicles = [], loading = false }: VehicleDetailsProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("details");
  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false);
  const [isEditFinanceOpen, setIsEditFinanceOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [documentName, setDocumentName] = useState("");
  const [documents, setDocuments] = useState<{name: string; date: string}[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
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
    milesPerDay: 0,
    image: undefined
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
                title: "Rental Income Added",
                description: `Added $${vehicle.dailyRate} to income for ${lastSelectedDate.toLocaleDateString()}`,
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
              </div>
              
              <div className="flex-shrink-0 flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEditStatus}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Status
                </Button>
              </div>
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-7 w-full max-w-lg">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="damage">Damage</TabsTrigger>
              <TabsTrigger value="documents">Docs</TabsTrigger>
              <TabsTrigger value="reminders">Reminders</TabsTrigger>
              <TabsTrigger value="availability">Calendar</TabsTrigger>
              <TabsTrigger value="finance">Finance</TabsTrigger>
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
                            Performance Metrics
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-y-4 mt-2">
                            <div>
                              <div className="text-sm text-flitx-gray-500">Fuel Economy</div>
                              <div className="font-semibold text-2xl">{vehicle.mpg || 0} km/L</div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-flitx-gray-500">Cost/Km</div>
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
                              <div className="text-sm text-flitx-gray-500">Km/Day</div>
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
                            Service Info
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
                            <div className="text-xs text-right text-flitx-gray-400">4,000 km remaining</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="maintenance" className="mt-6">
                    <VehicleMaintenance vehicleId={vehicle.id} updateExpenses={handleUpdateExpenses} />
                  </TabsContent>
                  
                  <TabsContent value="damage" className="mt-6">
                    <Card className="mb-6">
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
                  
                  <TabsContent value="documents" className="mt-6">
                    <Card className="mb-6">
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
                  
                  <TabsContent value="reminders" className="mt-6">
                    <VehicleReminders vehicleId={vehicle.id} />
                  </TabsContent>
                  
                  <TabsContent value="availability" className="mt-6">
                    <Card className="mb-6">
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
                  
                  <TabsContent value="finance" className="mt-6">
                    <Card className="mb-6">
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
                </>
              )}
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
    </div>
  );
}
