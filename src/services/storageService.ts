
import { supabase } from "@/integrations/supabase/client";

/**
 * Ensure that the storage buckets exist
 * This should be called early in the app initialization
 */
export const ensureStorageBuckets = async () => {
  try {
    // First check if the vehicles bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error checking buckets:', error);
      return;
    }
    
    const vehiclesBucketExists = buckets.some(bucket => bucket.name === 'vehicles');
    
    if (!vehiclesBucketExists) {
      // Create the vehicles bucket
      const { error: createError } = await supabase.storage.createBucket('vehicles', {
        public: true, // Make it publicly accessible
        fileSizeLimit: 10485760, // 10MB limit for files
      });
      
      if (createError) {
        console.error('Error creating vehicles bucket:', createError);
      } else {
        console.log('Vehicles bucket created successfully');
      }
    }
  } catch (error) {
    console.error('Error in ensureStorageBuckets:', error);
  }
};
