import { useState, useEffect } from "react";
import { Car, Calendar, AlertTriangle, FileText, ChevronLeft, Gauge, Settings, RefreshCcw, Wrench, Upload, Fuel, Users, Bell } from "lucide-react";
const FUEL_TYPE_LABELS: Record<string, {
  en: string;
  el: string;
}> = {
  petrol: {
    en: "Petrol",
    el: "Βενζίνη"
  },
  diesel: {
    en: "Diesel",
    el: "Diesel"
  },
  electric: {
    en: "Electric",
    el: "Ηλεκτρικό"
  },
  hybrid: {
    en: "Hybrid",
    el: "Υβριδικό"
  }
};
const getFuelTypeLabel = (fuelType: string | undefined, lang: string): string => {
  if (!fuelType) return '';
  return FUEL_TYPE_LABELS[fuelType]?.[lang === 'el' ? 'el' : 'en'] || fuelType;
};
import { getTransmissionTypeLabel } from "@/constants/transmissionTypes";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { VehicleMaintenance } from "./VehicleMaintenance";
import { VehicleReminders } from "./VehicleReminders";
import { VehicleDocuments } from "./VehicleDocuments";
import { DamageReport } from "@/components/damage/DamageReport";
import { UnifiedBookingDialog } from "@/components/booking/UnifiedBookingDialog";
import { RentalBookingsList } from "./RentalBookingsList";
import { CalendarView } from "./CalendarView";
import { VehicleFinanceTab } from "./VehicleFinanceTab";
import { EditVehicleDialog } from "./EditVehicleDialog";
import { MaintenanceBlockDialog } from "./MaintenanceBlockDialog";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import { useVehicleStatus, ComputedStatus } from "@/hooks/useVehicleStatus";

interface VehicleDetailsProps {
  vehicleId?: string;
  vehicles: any[];
  loading?: boolean;
}
export function VehicleDetails({
  vehicleId,
  vehicles = [],
  loading = false,
}: VehicleDetailsProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("reminders");
  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [isRentalBookingOpen, setIsRentalBookingOpen] = useState(false);
  const [isMaintenanceBlockOpen, setIsMaintenanceBlockOpen] = useState(false);
  const [needsRepair, setNeedsRepair] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [documentName, setDocumentName] = useState("");
  const [documents, setDocuments] = useState<{
    name: string;
    date: string;
  }[]>([]);
  const [refreshBookings, setRefreshBookings] = useState(0);
  const [refreshVehicle, setRefreshVehicle] = useState(0);
  const {
    toast
  } = useToast();
  const { language } = useLanguage();
  const { t } = useTranslation(['fleet', 'common']);
  const vehicle = vehicles.find(v => v.id === vehicleId) || {
    id: "default",
    make: "Vehicle",
    model: "Not Found",
    year: 2023,
    type: "Unknown",
    mileage: 0,
    status: "available",
    licensePlate: "N/A",
    fuelType: "",
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
    passengerCapacity: 5,
    vehicle_type: 'car',
    transmission_type: 'manual',
    fuel_type: 'petrol',
    purchase_price: null,
    purchase_date: null,
    initial_mileage: 0,
    market_value_at_purchase: null
  };

  const {
    computedStatus,
    isLoading: statusLoading,
    refetch: refetchStatus
  } = useVehicleStatus(vehicleId, vehicle.status === 'repair' ? 'repair' : undefined);

  useEffect(() => {
    setNeedsRepair(vehicle.status === 'repair');
  }, [vehicle.status]);

  const safeNumber = (value: any) => {
    return typeof value === 'number' ? value : 0;
  };

  const statusColors: Record<ComputedStatus, string> = {
    available: "bg-green-100 text-green-800 border-green-200",
    rented: "bg-red-100 text-red-800 border-red-200",
    maintenance: "bg-orange-100 text-orange-800 border-orange-200",
    repair: "bg-orange-100 text-orange-800 border-orange-200"
  };
  const statusLabels: Record<ComputedStatus, string> = {
    available: t('common:available'),
    rented: t('common:rented'),
    maintenance: t('common:maintenance'),
    repair: t('common:repair')
  };
  const handleEditStatus = () => {
    setNeedsRepair(vehicle.status === 'repair');
    setIsEditStatusOpen(true);
  };
  const handleSaveStatus = async () => {
    try {
      const newStatus = needsRepair ? 'repair' : 'available';
      const {
        error
      } = await supabase.from('vehicles').update({
        status: newStatus
      }).eq('id', vehicleId);
      if (error) {
        console.error('Error updating vehicle status:', error);
        toast({
          title: t('common:error'),
          description: t('fleet:statusUpdateFailed'),
          variant: "destructive"
        });
        return;
      }
      toast({
        title: t('fleet:statusUpdated'),
        description: needsRepair ? t('fleet:vehicleMarkedRepair') : t('fleet:vehicleAvailable')
      });
      setRefreshVehicle(prev => prev + 1);
      refetchStatus();
      setIsEditStatusOpen(false);
    } catch (err) {
      console.error('Error in handleSaveStatus:', err);
      toast({
        title: t('common:error'),
        description: "Failed to update vehicle status",
        variant: "destructive"
      });
    }
  };
  const handleScheduleMaintenance = () => {
    setIsEditStatusOpen(false);
    setIsMaintenanceBlockOpen(true);
  };
  const handleMaintenanceBlockAdded = () => {
    setRefreshBookings(prev => prev + 1);
    refetchStatus();
  };
  const handleEditVehicle = () => {
    setIsEditVehicleOpen(true);
  };
  const handleVehicleSaved = () => {
    setRefreshVehicle(prev => prev + 1);
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
        title: t('fleet:documentUploaded'),
        description: t('fleet:documentSaved')
      });
    }
  };
  const handleNewBookingFromCalendar = (calendarSelectedDates: Date[]) => {
    setSelectedDates(calendarSelectedDates);
    setIsRentalBookingOpen(true);
  };
  const handleBookingAdded = (booking: any) => {
    setRefreshBookings(prev => prev + 1);
    refetchStatus();
    setSelectedDates([]);
      toast({
        title: t('fleet:bookingAdded'),
        description: `${t('fleet:newBookingCreatedFor')} ${booking.customer_name}`
    });
  };
  const handleBookingDeleted = (bookingId: string) => {
    setRefreshBookings(prev => prev + 1);
    refetchStatus();
  };

  return <div className="animate-fade-in">
      <div className="bg-white shadow-bottom">
        <div className="container py-4">
          <div className="flex items-center mb-4">
            <Button variant="ghost" size="sm" className="mr-2" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('common:cancel')}
            </Button>
          </div>
          
          {loading ? <div className="flex flex-col items-center py-12">
              <div className="animate-pulse bg-flitx-gray-100 h-20 w-20 rounded-lg mb-4"></div>
              <div className="animate-pulse bg-flitx-gray-100 h-8 w-48 rounded mb-2"></div>
              <div className="animate-pulse bg-flitx-gray-100 h-4 w-32 rounded"></div>
            </div> : <div className="flex flex-col md:flex-row md:items-center gap-4 pb-2">
              <div className="flex-shrink-0">
                {vehicle.image ? <div className="h-20 w-20 rounded-lg overflow-hidden">
                    <img src={vehicle.image} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="h-full w-full object-scale-down border-black border-dashed" />
                  </div> : <div className="h-20 w-20 bg-flitx-gray-100 rounded-lg flex items-center justify-center">
                    <Car className="h-10 w-10 text-flitx-gray-400" />
                  </div>}
              </div>
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold flex items-center">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                  {vehicle.is_sold ? (
                    <Badge className="ml-3 bg-red-600 text-white border-red-700 font-bold" variant="outline">
                      {t('common:sold')}
                    </Badge>
                  ) : (
                    <Badge className={`ml-3 flex items-center ${statusColors[computedStatus]}`} variant="outline">
                      {computedStatus === 'repair' && <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                      {computedStatus === 'maintenance' && <Wrench className="h-3.5 w-3.5 mr-1" />}
                      {statusLabels[computedStatus]}
                    </Badge>
                  )}
                </h1>
                
                <div className="flex items-center text-flitx-gray-500 mt-1 flex-wrap">
                  <span>{vehicle.type}</span>
                  <span className="mx-2">•</span>
                  <span>{vehicle.licensePlate}</span>
                  <span className="mx-2">•</span>
                  <span>{safeNumber(vehicle.mileage).toLocaleString()} km</span>
                  {getFuelTypeLabel(vehicle.fuelType, language) && <>
                    <span className="mx-2">•</span>
                    <span>{getFuelTypeLabel(vehicle.fuelType, language)}</span>
                  </>}
                  {vehicle.transmission_type && <>
                    <span className="mx-2">•</span>
                    <span>{getTransmissionTypeLabel(vehicle.transmission_type, language)}</span>
                  </>}
                  {vehicle.passengerCapacity && <>
                      <span className="mx-2">•</span>
                      <span>{vehicle.passengerCapacity >= 7 ? '7+' : vehicle.passengerCapacity} {t('common:people')}</span>
                    </>}
                </div>
              </div>
              
              <div className="flex-shrink-0 flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEditVehicle}>
                  <Car className="h-4 w-4 mr-2" />
                  {t('fleet:editVehicle')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleEditStatus}>
                  <Settings className="h-4 w-4 mr-2" />
                  {t('fleet:editStatus')}
                </Button>
              </div>
            </div>}
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex w-full max-w-5xl mb-6 overflow-x-auto scrollbar-hide">
              <TabsTrigger value="reminders" className="px-4 py-2 flex-grow">
                {t('fleet:reminders')}
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="px-4 py-2 flex-grow">{t('common:maintenance')}</TabsTrigger>
              <TabsTrigger value="damage" className="px-4 py-2 flex-grow">{t('fleet:damages')}</TabsTrigger>
              <TabsTrigger value="documents" className="px-4 py-2 flex-grow">{t('fleet:documents')}</TabsTrigger>
              <TabsTrigger value="availability" className="px-4 py-2 flex-grow">{t('fleet:reservations')}</TabsTrigger>
              <TabsTrigger value="finance" className="px-4 py-2 flex-grow">{t('fleet:finance')}</TabsTrigger>
            </TabsList>
          
            <div className="container py-0">
              {loading ? <div className="flex justify-center py-12">
                  <div className="text-flitx-gray-500">{t('fleet:loadingVehicleData')}</div>
                </div> : <>
                  <TabsContent value="reminders" className="mt-6 space-y-6">
                    <VehicleReminders vehicleId={vehicleId || ""} />
                  </TabsContent>
                  
                  <TabsContent value="maintenance" className="mt-6">
                    <VehicleMaintenance vehicleId={vehicleId || ""} />
                  </TabsContent>
                  
                  <TabsContent value="damage" className="mt-6">
                    <DamageReport vehicleId={vehicleId || ""} />
                  </TabsContent>
                  
                  <TabsContent value="documents" className="mt-6">
                    <VehicleDocuments vehicleId={vehicleId || ""} />
                  </TabsContent>
                  
                  <TabsContent value="availability" className="mt-6">
                    <CalendarView vehicleId={vehicleId || ""} onNewBooking={handleNewBookingFromCalendar} refreshTrigger={refreshBookings} />
                    
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">{language === 'el' ? 'Ιστορικό Κρατήσεων' : 'Booking History'}</h3>
                      <RentalBookingsList vehicleId={vehicleId || ""} onBookingDeleted={handleBookingDeleted} key={refreshBookings} />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="finance" className="mt-6">
                    <VehicleFinanceTab 
                      vehicleId={vehicleId || ""} 
                      vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} 
                      purchasePrice={vehicle.purchase_price}
                      marketValueAtPurchase={vehicle.market_value_at_purchase}
                      purchaseDate={vehicle.purchase_date}
                      currentMileage={vehicle.mileage}
                      initialMileage={vehicle.initial_mileage}
                      vehicleType={vehicle.vehicle_type}
                      vehicleYear={vehicle.year}
                      vehicleCreatedAt={vehicle.created_at}
                      isSold={vehicle.is_sold ?? false}
                      salePrice={vehicle.sale_price ?? null}
                      saleDate={vehicle.sale_date ?? null}
                    />
                  </TabsContent>
                </>}
            </div>
          </Tabs>
        </div>
      </div>

      {/* Edit Status Dialog */}
      <Dialog open={isEditStatusOpen} onOpenChange={setIsEditStatusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('fleet:editStatus')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">{language === 'el' ? 'Κατάσταση:' : 'Status:'}</span>
              <Badge className={statusColors[computedStatus]} variant="outline">
                {computedStatus === 'repair' && <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                {computedStatus === 'maintenance' && <Wrench className="h-3.5 w-3.5 mr-1" />}
                {statusLabels[computedStatus]}
              </Badge>
            </div>

            <div className="space-y-3">
              <button type="button" onClick={() => setNeedsRepair(false)} className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${!needsRepair && computedStatus !== 'rented' && computedStatus !== 'maintenance' ? 'border-green-500 bg-green-50' : 'border-border hover:border-green-300 hover:bg-green-50/50'}`}>
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="font-medium">{t('common:available')}</span>
              </button>

              <button type="button" onClick={() => setNeedsRepair(true)} className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${needsRepair ? 'border-orange-500 bg-orange-50' : 'border-border hover:border-orange-300 hover:bg-orange-50/50'}`}>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="font-medium">{t('common:repair')}</span>
              </button>

              <button type="button" onClick={handleScheduleMaintenance} className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${computedStatus === 'maintenance' ? 'border-orange-500 bg-orange-50' : 'border-border hover:border-orange-300 hover:bg-orange-50/50'}`}>
                <Wrench className="h-4 w-4 text-orange-500" />
                <div className="flex-1 text-left">
                <span className="font-medium">{language === 'el' ? 'Μη Διαθέσιμο – Σε Συντήρηση' : 'Unavailable – Under Maintenance'}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === 'el' ? 'Προγραμματισμός ημερομηνιών μη διαθεσιμότητας' : 'Schedule unavailability dates'}
                  </p>
                </div>
              </button>

              {computedStatus === 'rented' && <div className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-red-500 bg-red-50 opacity-75">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="flex-1">
                    <span className="font-medium">{t('common:rented')}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {language === 'el' ? 'Ελέγχεται από κρατήσεις' : 'Controlled by bookings'}
                    </p>
                  </div>
                </div>}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditStatusOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button className="bg-flitx-blue hover:bg-flitx-blue-600" onClick={handleSaveStatus}>
              {t('common:save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <EditVehicleDialog isOpen={isEditVehicleOpen} onClose={() => setIsEditVehicleOpen(false)} vehicle={{
      id: vehicleId || "",
      mileage: vehicle.mileage || 0,
      daily_rate: vehicle.daily_rate || vehicle.dailyRate || 0,
      license_plate: vehicle.license_plate || vehicle.licensePlate || '',
      image: vehicle.image,
      purchase_price: vehicle.purchase_price,
      purchase_date: vehicle.purchase_date,
      initial_mileage: vehicle.initial_mileage || 0,
      market_value_at_purchase: vehicle.market_value_at_purchase,
      fuel_type: vehicle.fuel_type || vehicle.fuelType || 'petrol',
      transmission_type: vehicle.transmission_type || 'manual',
      passenger_capacity: vehicle.passenger_capacity || vehicle.passengerCapacity || 5,
      vehicle_type: vehicle.vehicle_type || 'car',
      type: vehicle.type || ''
    }} onSaved={handleVehicleSaved} />

      <UnifiedBookingDialog isOpen={isRentalBookingOpen} onClose={() => setIsRentalBookingOpen(false)} onSuccess={() => { handleBookingAdded({ customer_name: 'Booking' }); }} preselectedVehicleId={vehicleId || ""} preselectedStartDate={selectedDates.length > 0 ? selectedDates[0] : undefined} preselectedEndDate={selectedDates.length > 1 ? selectedDates[selectedDates.length - 1] : undefined} />

      <MaintenanceBlockDialog isOpen={isMaintenanceBlockOpen} onClose={() => setIsMaintenanceBlockOpen(false)} vehicleId={vehicleId || ""} vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} onBlockAdded={handleMaintenanceBlockAdded} />
    </div>;
}
