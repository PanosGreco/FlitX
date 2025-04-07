
import { useState } from "react";
import { useParams } from "react-router-dom";
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
  Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link, useNavigate } from "react-router-dom";

interface VehicleDetailsProps {
  vehicles: any[];
}

export function VehicleDetails({ vehicles = [] }: VehicleDetailsProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("details");
  
  const vehicle = vehicles.find(v => v.id === id) || {
    id: "1",
    make: "Toyota",
    model: "Corolla",
    year: 2020,
    type: "Sedan",
    mileage: 45250,
    status: "available",
    licensePlate: "ABC-1234",
    fuelLevel: 75,
    fuelType: "Gasoline",
    mpg: 32.5,
    lastServiceDate: "2023-12-15",
    costPerMile: 0.15,
    dailyRate: 45,
    totalServices: 7,
    serviceReminders: 2,
    totalServiceCost: 1875.50,
    fuelCosts: 2340.75,
    milesPerDay: 32.8
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
                  className={`ml-3 ${statusColors[vehicle.status as keyof typeof statusColors]}`}
                  variant="outline"
                >
                  {statusLabels[vehicle.status as keyof typeof statusLabels]}
                </Badge>
              </h1>
              
              <div className="flex items-center text-flitx-gray-500 mt-1">
                <span>{vehicle.type}</span>
                <span className="mx-2">•</span>
                <span>{vehicle.licensePlate}</span>
                <span className="mx-2">•</span>
                <span>{vehicle.mileage.toLocaleString()} mi</span>
              </div>
            </div>
            
            <div className="flex-shrink-0 flex gap-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid grid-cols-5 w-full max-w-lg">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="damage">Damage</TabsTrigger>
              <TabsTrigger value="documents">Docs</TabsTrigger>
              <TabsTrigger value="availability">Calendar</TabsTrigger>
              <TabsTrigger value="fuel">Fuel</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
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
                    <div className="font-semibold text-2xl">{vehicle.mpg}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-flitx-gray-500">Cost/Mi</div>
                    <div className="font-semibold text-2xl">${vehicle.costPerMile}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-flitx-gray-500">Fuel Costs</div>
                    <div className="font-semibold text-2xl">${vehicle.fuelCosts.toLocaleString()}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-flitx-gray-500">Service Costs</div>
                    <div className="font-semibold text-2xl">${vehicle.totalServiceCost.toLocaleString()}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-flitx-gray-500">Miles/Day</div>
                    <div className="font-semibold text-2xl">{vehicle.milesPerDay}</div>
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
                      <div className="font-semibold">In 2,500 mi</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-flitx-gray-500">Last Service</div>
                    <div>{new Date(vehicle.lastServiceDate).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Service Reminders</span>
                    <div>
                      <span className="text-red-500 font-bold">{vehicle.serviceReminders}</span>
                      <span className="text-flitx-gray-400"> active</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Total Services</span>
                    <span>{vehicle.totalServices}</span>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="text-sm text-flitx-gray-500">Oil Change Status</div>
                  <Progress value={65} className="h-2" />
                  <div className="text-xs text-right text-flitx-gray-400">2,500 mi remaining</div>
                </div>
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
              <div className="text-center py-8 text-flitx-gray-500">
                <FileText className="mx-auto h-12 w-12 text-flitx-gray-300 mb-3" />
                <h3 className="text-lg font-medium mb-1">No documents uploaded</h3>
                <p className="text-sm">
                  Upload important documents like registration, insurance, and service records.
                </p>
                <Button className="mt-4 bg-flitx-blue hover:bg-flitx-blue-600">
                  Upload Documents
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="availability">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-flitx-gray-500">
                <Calendar className="mx-auto h-12 w-12 text-flitx-gray-300 mb-3" />
                <h3 className="text-lg font-medium mb-1">Calendar View</h3>
                <p className="text-sm">
                  Manage vehicle availability and reservations in the calendar view.
                </p>
                <Button className="mt-4 bg-flitx-blue hover:bg-flitx-blue-600">
                  Set Availability
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="fuel">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium">Current Fuel Level</div>
                    <div className="text-sm text-flitx-gray-500">{vehicle.fuelLevel}%</div>
                  </div>
                  <Progress value={vehicle.fuelLevel} className="h-3" />
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 mt-6">
                  <div className="flex-1">
                    <div className="text-sm text-flitx-gray-500 mb-1">Fuel Type</div>
                    <div className="font-medium">{vehicle.fuelType}</div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm text-flitx-gray-500 mb-1">Estimated Range</div>
                    <div className="font-medium">415 miles</div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm text-flitx-gray-500 mb-1">Last Refuel</div>
                    <div className="font-medium">Apr 2, 2023</div>
                  </div>
                </div>
                
                <Button className="mt-4 bg-flitx-blue hover:bg-flitx-blue-600">
                  <Droplet className="h-4 w-4 mr-2" />
                  Update Fuel Level
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </div>
  );
}
