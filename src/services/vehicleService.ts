
import { supabase } from "@/integrations/supabase/client";
import { VehicleData } from "@/components/fleet/VehicleCard";
import { toast } from "sonner";

export interface VehicleFormData {
  make: string;
  model: string;
  year: number;
  type: string;
  image?: File | null;
  licensePlate: string;
  dailyRate: number;
  mileage: number;
}

export const fetchVehicles = async (userId?: string) => {
  try {
    let query = supabase.from('vehicles').select('*');
    
    // If userId is provided, filter by it
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
    
    return data.map(transformDatabaseVehicleToLocal);
  } catch (error) {
    console.error('Error in fetchVehicles:', error);
    // Return sample data as fallback
    return [];
  }
};

export const addVehicle = async (vehicleData: VehicleFormData, userId: string) => {
  try {
    let imageUrl = null;
    
    // Upload image if provided
    if (vehicleData.image) {
      const fileExt = vehicleData.image.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      const filePath = `vehicles/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('vehicles')
        .upload(filePath, vehicleData.image, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) {
        console.error('Error uploading vehicle image:', uploadError);
        throw uploadError;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vehicles')
        .getPublicUrl(filePath);
      
      imageUrl = publicUrl;
    }
    
    // Insert vehicle record
    const { data, error } = await supabase.from('vehicles').insert({
      user_id: userId,
      make: vehicleData.make,
      model: vehicleData.model,
      year: vehicleData.year,
      type: vehicleData.type,
      license_plate: vehicleData.licensePlate,
      daily_rate: vehicleData.dailyRate,
      mileage: vehicleData.mileage,
      image_url: imageUrl,
      fuel_level: 100, // Default to full tank
      status: 'available', // Default to available
    }).select().single();
    
    if (error) {
      console.error('Error adding vehicle:', error);
      throw error;
    }
    
    return transformDatabaseVehicleToLocal(data);
  } catch (error) {
    console.error('Error in addVehicle:', error);
    toast.error('Failed to add vehicle. Please try again.');
    throw error;
  }
};

// Helper function to transform database response to our local VehicleData format
const transformDatabaseVehicleToLocal = (dbVehicle: any): VehicleData => {
  return {
    id: dbVehicle.id,
    make: dbVehicle.make,
    model: dbVehicle.model,
    year: dbVehicle.year,
    type: dbVehicle.type,
    mileage: dbVehicle.mileage,
    image: dbVehicle.image_url,
    status: dbVehicle.status || 'available',
    licensePlate: dbVehicle.license_plate,
    fuelLevel: dbVehicle.fuel_level || 100,
    dailyRate: dbVehicle.daily_rate,
  };
};
