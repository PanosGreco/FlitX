
import { supabase } from "@/integrations/supabase/client";
import { VehicleLocation } from "@/types/vehicleTracking";

export async function updateVehicleLocation(data: VehicleLocation) {
  try {
    const { error } = await supabase
      .from('vehicle_tracking')
      .insert({
        vehicle_id: data.vehicle_id,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed || null,
        heading: data.heading || null,
      });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating vehicle location:', error);
    return { success: false, error };
  }
}

export async function getLatestVehicleLocation(vehicleId: string) {
  try {
    const { data, error } = await supabase
      .from('vehicle_tracking')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('timestamp', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    return data?.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error getting vehicle location:', error);
    return null;
  }
}

export async function getVehicleLocationHistory(vehicleId: string, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('vehicle_tracking')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting vehicle location history:', error);
    return [];
  }
}
