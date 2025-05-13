import { VehicleDetails } from "@/components/fleet/VehicleDetails";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { sampleVehicles } from "@/lib/data";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/components/ui/use-toast";

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

// Define a custom interface for our translations that handles both strings and nested objects
interface VehicleTranslations {
  [key: string]: string | VehicleTranslations;
}

const VehicleDetail = () => {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  
  // Helper function to safely get translation values with fallbacks
  const getTransValue = (key: string, fallback: string): string => {
    const value = t[key as keyof typeof t];
    return typeof value === 'string' ? value : fallback;
  };
  
  // Create a translations object that includes both the translations from context
  // and our fallback translations for missing keys
  const translations: VehicleTranslations = {
    // Vehicle detail specific translations with fallbacks
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

  // Copy all remaining properties from t, preserving their structure
  Object.keys(t).forEach(key => {
    if (translations[key] === undefined) {
      translations[key] = t[key as keyof typeof t] as string | VehicleTranslations;
    }
  });
  
  useEffect(() => {
    const fetchVehicle = async () => {
      if (id) {
        try {
          // Try fetching from Supabase first
          const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', id)
            .maybeSingle(); // Using maybeSingle instead of single to handle not found cases better
          
          if (error) {
            console.error('Error fetching vehicle:', error);
            // If there's an error (like using a numeric ID from sample data), fall back to sample data
            const sampleVehicle = sampleVehicles.find(v => v.id === id);
            if (sampleVehicle) {
              // Convert sample vehicle to match our expected format
              setVehicle({
                id: sampleVehicle.id,
                make: sampleVehicle.make,
                model: sampleVehicle.model,
                year: sampleVehicle.year,
                type: sampleVehicle.type,
                mileage: sampleVehicle.mileage,
                status: sampleVehicle.status,
                licensePlate: sampleVehicle.licensePlate,
                fuelLevel: sampleVehicle.fuelLevel,
                dailyRate: sampleVehicle.dailyRate,
                fuelType: 'Unknown',
                mpg: 0,
                lastServiceDate: new Date().toISOString(),
                costPerMile: 0,
                totalServices: 0,
                serviceReminders: 0,
                totalServiceCost: 0,
                fuelCosts: 0,
                milesPerDay: 0,
                image: sampleVehicle.image
              });
            }
          } else if (data) {
            // Transform Supabase data to match the component's expected format
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
              fuelType: 'Unknown', // Add default value
              mpg: 0, // Add default value
              lastServiceDate: new Date().toISOString(),
              costPerMile: 0,
              dailyRate: data.daily_rate || 0,
              totalServices: 0,
              serviceReminders: 0,
              totalServiceCost: 0,
              fuelCosts: 0,
              milesPerDay: 0,
              image: data.image_url || undefined
            };
            setVehicle(vehicleData);
          }
        } catch (error) {
          console.error('Error fetching vehicle:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchVehicle();
  }, [id]);
  
  // Find the matching sample vehicle to get the image if not available from Supabase
  const sampleVehicle = id ? sampleVehicles.find(v => v.id === id) : null;
  const vehicleWithImage = vehicle ? {
    ...vehicle,
    image: vehicle.image || (sampleVehicle ? sampleVehicle.image : undefined)
  } : null;
  
  return (
    <MobileLayout>
      <VehicleDetails 
        vehicleId={id} 
        vehicles={vehicleWithImage ? [vehicleWithImage] : sampleVehicles} 
        loading={loading}
        translations={translations}
      />
    </MobileLayout>
  );
};

export default VehicleDetail;
