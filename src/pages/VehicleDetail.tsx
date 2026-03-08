import { VehicleDetails } from "@/components/fleet/VehicleDetails";
import { AppLayout } from "@/components/layout/AppLayout";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
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
  is_sold?: boolean;
  sale_price?: number | null;
  sale_date?: string | null;
}

const VehicleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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
        navigate('/');
        return;
      }
      
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
        created_at: data.created_at,
        is_sold: data.is_sold ?? false,
        sale_price: data.sale_price ?? null,
        sale_date: data.sale_date ?? null
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
      />
    </AppLayout>
  );
};

export default VehicleDetail;
