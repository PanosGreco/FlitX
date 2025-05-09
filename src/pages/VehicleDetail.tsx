
import { VehicleDetails } from "@/components/fleet/VehicleDetails";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { sampleVehicles } from "@/lib/data";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

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
}

const VehicleDetail = () => {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchVehicle = async () => {
      if (id) {
        try {
          const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) {
            console.error('Error fetching vehicle:', error);
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
              milesPerDay: 0
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
  
  return (
    <MobileLayout>
      <VehicleDetails 
        vehicleId={id} 
        vehicles={vehicle ? [vehicle] : sampleVehicles} 
        loading={loading}
      />
    </MobileLayout>
  );
};

export default VehicleDetail;
