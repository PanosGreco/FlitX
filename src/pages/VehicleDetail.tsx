
import { VehicleDetails } from "@/components/fleet/VehicleDetails";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { sampleVehicles } from "@/lib/data";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

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

const VehicleDetail = () => {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  
  // Ensure we have all the translations needed for the vehicle details page
  const translations = {
    ...t,
    // Add missing translations with fallback values
    serviceReminders: t.serviceReminders || "Service Reminders",
    fuelType: t.fuelType || "Fuel Type",
    costPerMile: t.costPerMile || "Cost Per Mile",
    fuelCosts: t.fuelCosts || "Fuel Costs",
    totalServiceCost: t.totalServiceCost || "Total Service Cost",
    milesPerDay: t.milesPerDay || "Miles Per Day",
    lastServiceDate: t.lastServiceDate || "Last Service Date",
    totalServices: t.totalServices || "Total Services",
    performance: t.performance || "Performance",
    fuelLevel: t.fuelLevel || "Fuel Level",
    vehicleMaintenance: t.vehicleMaintenance || "Vehicle Maintenance",
    repair: t.repair || "Repair",
    documents: t.documents || "Documents",
    availability: t.availability || "Availability",
    finance: t.finance || "Finance",
    overview: t.overview || "Overview",
    uploadDocuments: t.uploadDocuments || "Upload Documents",
    selectDays: t.selectDays || "Select days when the vehicle is booked or unavailable",
    dailyRate: t.dailyRate || "Daily Rate",
    totalRevenue: t.totalRevenue || "Total Revenue",
    totalExpenses: t.totalExpenses || "Total Expenses",
    netProfit: t.netProfit || "Net Profit",
    editFinance: t.editFinance || "Edit Finance",
    enterFinanceDetails: t.enterFinanceDetails || "Enter finance details for this vehicle",
    financeUpdated: t.financeUpdated || "Finance Updated",
    financeDetailsUpdated: t.financeDetailsUpdated || "Finance details have been updated",
    documentUploaded: t.documentUploaded || "Document Uploaded",
    documentSaved: t.documentSaved || "Your document has been saved",
    rentalIncomeAdded: t.rentalIncomeAdded || "Rental Income Added",
    addedIncome: t.addedIncome || "Added $",
    toIncomeFor: t.toIncomeFor || " to income for ",
    editStatus: t.editStatus || "Edit Status",
    selectStatus: t.selectStatus || "Select a status for this vehicle",
    statusUpdated: t.statusUpdated || "Status Updated",
    vehicleStatusChanged: t.vehicleStatusChanged || "Vehicle status changed to "
  };
  
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
