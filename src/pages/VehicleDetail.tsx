import { VehicleDetails } from "@/components/fleet/VehicleDetails";
import { MobileLayout } from "@/components/layout/MobileLayout";
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
  fuelLevel: number;
  fuelType: string;
  mpg: number;
  lastServiceDate: string;
  costPerMile: number;
  dailyRate: number;
  totalServices: number;
  serviceReminders: number;
  totalServiceCost: number;
  fuelCosts: number;
  milesPerDay: number;
  image?: string;
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
    fuelLevel: getTransValue('fuelLevel', 'Fuel Level'),
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
      
      // Transform backend data to component format
      const vehicleData: Vehicle = {
        id: data.id,
        make: data.make || 'Unknown',
        model: data.model || 'Unknown',
        year: data.year || 2023,
        type: data.type || 'Unknown',
        mileage: data.mileage || 0,
        status: data.status || 'available',
        licensePlate: data.license_plate || 'N/A',
        fuelLevel: data.fuel_level || 0,
        fuelType: 'Unknown',
        mpg: 0,
        lastServiceDate: new Date().toISOString(),
        costPerMile: 0,
        dailyRate: data.daily_rate || 0,
        totalServices: 0,
        serviceReminders: 0,
        totalServiceCost: 0,
        fuelCosts: 0,
        milesPerDay: 0,
        image: data.image || undefined
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
  
  if (loading) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading vehicle...</p>
        </div>
      </MobileLayout>
    );
  }
  
  if (!vehicle) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">Vehicle not found</p>
        </div>
      </MobileLayout>
    );
  }
  
  return (
    <MobileLayout>
      <VehicleDetails 
        vehicleId={id} 
        vehicles={[vehicle]} 
        loading={false}
        translations={translations}
      />
    </MobileLayout>
  );
};

export default VehicleDetail;
