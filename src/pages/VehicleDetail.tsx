import { VehicleDetails } from "@/components/fleet/VehicleDetails";
import { AppLayout } from "@/components/layout/AppLayout";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  type: string;
  mileage: number;
  status: string;
  licensePlate: string;
  fuelType: string;
  fuel_type: string;
  mpg: number;
  lastServiceDate: string;
  costPerMile: number;
  dailyRate: number;
  daily_rate: number;
  totalServices: number;
  serviceReminders: number;
  totalServiceCost: number;
  fuelCosts: number;
  milesPerDay: number;
  image?: string;
  license_plate?: string;
  purchase_price?: number | null;
  purchase_date?: string | null;
  initial_mileage?: number;
  market_value_at_purchase?: number | null;
  passengerCapacity?: number;
  passenger_capacity?: number;
  vehicle_type?: string;
  transmission_type?: string;
  created_at?: string;
}

interface VehicleTranslations {
  [key: string]: string | VehicleTranslations;
}

const VehicleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const getTransValue = (key: string, fallback: string): string => {
    const value = t[key as keyof typeof t];
    return typeof value === 'string' ? value : fallback;
  };
  
  const translations: VehicleTranslations = {
    serviceReminders: getTransValue('serviceReminders', 'Service Reminders'),
    fuelType: getTransValue('fuelType', 'Fuel Type'),
    costPerMile: getTransValue('costPerMile', 'Cost Per Mile'),
    fuelCosts: getTransValue('fuelCosts', 'Fuel Costs'),
    totalServiceCost: getTransValue('totalServiceCost', 'Total Service Cost'),
    milesPerDay: getTransValue('milesPerDay', 'Miles Per Day'),
    lastServiceDate: getTransValue('lastServiceDate', 'Last Service Date'),
    totalServices: getTransValue('totalServices', 'Total Services'),
    performance: getTransValue('performance', 'Performance'),
    vehicleMaintenance: getTransValue('vehicleMaintenance', 'Vehicle Maintenance'),
    repair: getTransValue('repair', 'Repair'),
    documents: getTransValue('documents', 'Documents'),
    availability: getTransValue('availability', 'Availability'),
    finance: getTransValue('finance', 'Finance'),
    overview: getTransValue('overview', 'Overview'),
    uploadDocuments: getTransValue('uploadDocuments', 'Upload Documents'),
    selectDays: getTransValue('selectDays', 'Select days when the vehicle is booked or unavailable'),
    dailyRate: getTransValue('dailyRate', 'Daily Rate'),
    totalRevenue: getTransValue('totalRevenue', 'Total Revenue'),
    totalExpenses: getTransValue('totalExpenses', 'Total Expenses'),
    netProfit: getTransValue('netProfit', 'Net Profit'),
    editFinance: getTransValue('editFinance', 'Edit Finance'),
    enterFinanceDetails: getTransValue('enterFinanceDetails', 'Enter finance details for this vehicle'),
    financeUpdated: getTransValue('financeUpdated', 'Finance Updated'),
    financeDetailsUpdated: getTransValue('financeDetailsUpdated', 'Finance details have been updated'),
    documentUploaded: getTransValue('documentUploaded', 'Document Uploaded'),
    documentSaved: getTransValue('documentSaved', 'Your document has been saved'),
    rentalIncomeAdded: getTransValue('rentalIncomeAdded', 'Rental Income Added'),
    addedIncome: getTransValue('addedIncome', 'Added $'),
    toIncomeFor: getTransValue('toIncomeFor', ' to income for '),
    editStatus: getTransValue('editStatus', 'Edit Status'),
    selectStatus: getTransValue('selectStatus', 'Select a status for this vehicle'),
    statusUpdated: getTransValue('statusUpdated', 'Status Updated'),
    vehicleStatusChanged: getTransValue('vehicleStatusChanged', 'Vehicle status changed to '),
  };

  Object.keys(t).forEach(key => {
    if (translations[key] === undefined) {
      translations[key] = t[key as keyof typeof t] as string | VehicleTranslations;
    }
  });

  const fetchVehicle = useCallback(async () => {
    if (!id || !user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching vehicle:', error);
        navigate('/');
        return;
      }
      
      if (!data) {
        // Vehicle not found - redirect to fleet
        navigate('/');
        return;
      }
      
      // Transform backend data to component format - PRESERVE ALL database values
      const vehicleData: Vehicle = {
        id: data.id,
        make: data.make || 'Unknown',
        model: data.model || 'Unknown',
        year: data.year || 2023,
        type: data.type || 'Unknown',
        mileage: data.mileage || 0,
        status: data.status || 'available',
        licensePlate: data.license_plate || 'N/A',
        license_plate: data.license_plate || '',
        fuelType: data.fuel_type || 'petrol',
        fuel_type: data.fuel_type || 'petrol',
        mpg: 0,
        lastServiceDate: new Date().toISOString(),
        costPerMile: 0,
        dailyRate: data.daily_rate || 0,
        daily_rate: data.daily_rate || 0,
        totalServices: 0,
        serviceReminders: 0,
        totalServiceCost: 0,
        fuelCosts: 0,
        milesPerDay: 0,
        image: data.image || undefined,
        purchase_price: data.purchase_price || null,
        purchase_date: data.purchase_date || null,
        initial_mileage: data.initial_mileage || 0,
        market_value_at_purchase: data.market_value_at_purchase || null,
        passengerCapacity: data.passenger_capacity || undefined,
        passenger_capacity: data.passenger_capacity || undefined,
        vehicle_type: data.vehicle_type || 'car',
        transmission_type: data.transmission_type || 'manual',
        created_at: data.created_at
      };
      setVehicle(vehicleData);
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, user, navigate]);
  
  useEffect(() => {
    fetchVehicle();
  }, [fetchVehicle]);

  // Realtime subscription for vehicle updates
  useEffect(() => {
    if (!id || !user) return;

    const channel = supabase
      .channel(`vehicle_${id}_changes`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'vehicles', filter: `id=eq.${id}` }, 
        () => {
          fetchVehicle();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user, fetchVehicle]);
  
  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading vehicle...</p>
        </div>
      </AppLayout>
    );
  }
  
  if (!vehicle) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">Vehicle not found</p>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <VehicleDetails 
        vehicleId={id} 
        vehicles={[vehicle]} 
        loading={false}
        translations={translations}
      />
    </AppLayout>
  );
};

export default VehicleDetail;
