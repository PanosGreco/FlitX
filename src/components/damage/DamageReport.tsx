
import { useState, useEffect } from 'react';
import { Car3DModel } from './Car3DModel';
import { DamageReportForm } from './DamageReportForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Upload, Check } from 'lucide-react';
import * as THREE from 'three';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface DamageMarker {
  id: string;
  position: THREE.Vector3;
  normal: THREE.Vector3;
}

interface DamageReportImage {
  id: string;
  url: string;
  uploaded_at: string;
}

interface DamageReportProps {
  vehicleId: string;
  vehicleMake?: string;
  vehicleModel?: string;
}

export function DamageReport({ vehicleId, vehicleMake = 'Generic', vehicleModel = 'Car' }: DamageReportProps) {
  const [isReporting, setIsReporting] = useState(false);
  const [isSelectingDamageLocation, setIsSelectingDamageLocation] = useState(false);
  const [damageMarkers, setDamageMarkers] = useState<DamageMarker[]>([]);
  const [reportImages, setReportImages] = useState<DamageReportImage[]>([]);
  const [selectedDamageMarker, setSelectedDamageMarker] = useState<DamageMarker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Fetch existing damage reports on load
  useEffect(() => {
    fetchDamageReports();
  }, [vehicleId]);

  const fetchDamageReports = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;
      
      const { data: reports, error } = await supabase
        .from('vehicle_damage_reports')
        .select(`
          id, 
          damage_location,
          damage_report_images (
            id,
            storage_path
          )
        `)
        .eq('vehicle_id', vehicleId);
      
      if (error) throw error;
      
      if (reports && reports.length > 0) {
        // Process damage markers
        const markers: DamageMarker[] = reports.map(report => {
          const location = report.damage_location;
          return {
            id: report.id,
            position: new THREE.Vector3(location.x, location.y, location.z),
            normal: new THREE.Vector3(location.nx || 0, location.ny || 0, location.nz || 0)
          };
        });
        
        setDamageMarkers(markers);
        
        // Process images
        const allImages: DamageReportImage[] = [];
        for (const report of reports) {
          if (report.damage_report_images && report.damage_report_images.length > 0) {
            for (const image of report.damage_report_images) {
              const { data: publicUrl } = supabase.storage
                .from('damage_reports')
                .getPublicUrl(image.storage_path);
                
              if (publicUrl) {
                allImages.push({
                  id: image.id,
                  url: publicUrl.publicUrl,
                  uploaded_at: new Date().toISOString() // Fallback as we don't have this from the query
                });
              }
            }
          }
        }
        
        setReportImages(allImages);
      }
    } catch (error) {
      console.error('Error fetching damage reports:', error);
      toast({
        title: "Failed to load damage reports",
        description: "There was an error loading existing damage reports.",
        variant: "destructive"
      });
    }
  };

  const handleAddDamageMarker = (position: THREE.Vector3, normal: THREE.Vector3) => {
    if (isSelectingDamageLocation) {
      const newMarker = {
        id: uuidv4(),
        position: position,
        normal: normal
      };
      
      setSelectedDamageMarker(newMarker);
      setDamageMarkers([...damageMarkers, newMarker]);
      setIsSelectingDamageLocation(false);
      setIsReporting(true);
    }
  };

  const handleStartReporting = () => {
    setIsSelectingDamageLocation(true);
    toast({
      title: "Select Damage Location",
      description: "Click on the car model to indicate where the damage occurred.",
    });
  };

  const handleCancelReporting = () => {
    setIsReporting(false);
    setIsSelectingDamageLocation(false);
    // Remove the temporary marker if cancelled
    if (selectedDamageMarker) {
      setDamageMarkers(damageMarkers.filter(marker => marker.id !== selectedDamageMarker.id));
      setSelectedDamageMarker(null);
    }
  };

  const handleSubmitReport = async (formData: { description: string; severity: string; photos: File[] }) => {
    if (!selectedDamageMarker) return;
    
    setIsLoading(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to report damage.",
          variant: "destructive"
        });
        return;
      }
      
      // Save damage report to database
      const { data: reportData, error: reportError } = await supabase
        .from('vehicle_damage_reports')
        .insert({
          id: selectedDamageMarker.id,
          vehicle_id: vehicleId,
          user_id: session.session.user.id,
          damage_location: {
            x: selectedDamageMarker.position.x,
            y: selectedDamageMarker.position.y,
            z: selectedDamageMarker.position.z,
            nx: selectedDamageMarker.normal.x,
            ny: selectedDamageMarker.normal.y,
            nz: selectedDamageMarker.normal.z
          },
          damage_description: formData.description,
          damage_severity: formData.severity
        })
        .select();
      
      if (reportError) throw reportError;
      
      // Upload photos
      const uploadedImages: DamageReportImage[] = [];
      
      for (const photo of formData.photos) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${vehicleId}/${selectedDamageMarker.id}/${fileName}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('damage_reports')
          .upload(filePath, photo);
          
        if (uploadError) throw uploadError;
        
        // Save reference to database
        const { data: imageData, error: imageError } = await supabase
          .from('damage_report_images')
          .insert({
            report_id: selectedDamageMarker.id,
            storage_path: filePath
          })
          .select();
          
        if (imageError) throw imageError;
        
        // Get public URL
        const { data: publicUrl } = supabase.storage
          .from('damage_reports')
          .getPublicUrl(filePath);
          
        if (publicUrl && imageData) {
          uploadedImages.push({
            id: imageData[0].id,
            url: publicUrl.publicUrl,
            uploaded_at: new Date().toISOString()
          });
        }
      }
      
      // Add new images to the state
      setReportImages([...reportImages, ...uploadedImages]);
      
      toast({
        title: "Damage Report Submitted",
        description: "Your damage report has been successfully submitted.",
      });
      
      setIsReporting(false);
      setSelectedDamageMarker(null);
    } catch (error) {
      console.error('Error submitting damage report:', error);
      toast({
        title: "Error Submitting Report",
        description: "There was a problem submitting your damage report.",
        variant: "destructive"
      });
      
      // Remove the marker if there was an error
      if (selectedDamageMarker) {
        setDamageMarkers(damageMarkers.filter(marker => marker.id !== selectedDamageMarker.id));
        setSelectedDamageMarker(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Vehicle Damage Report</h2>
          <p className="text-sm text-gray-500">Rotate the model to inspect and report damage</p>
        </div>
        
        {!isReporting && !isSelectingDamageLocation && (
          <Button 
            onClick={handleStartReporting} 
            className="mt-3 md:mt-0 bg-red-600 hover:bg-red-700"
          >
            <AlertTriangle className="mr-2 h-4 w-4" /> 
            Report Damage
          </Button>
        )}
        
        {isSelectingDamageLocation && (
          <div className="mt-3 md:mt-0 flex items-center space-x-2">
            <span className="text-sm font-medium text-amber-600">
              Click on the vehicle to mark damage location
            </span>
            <Button variant="outline" size="sm" onClick={handleCancelReporting}>
              Cancel
            </Button>
          </div>
        )}
      </div>
      
      <Car3DModel 
        vehicleMake={vehicleMake}
        vehicleModel={vehicleModel}
        damageMarkers={damageMarkers}
        onAddDamageMarker={handleAddDamageMarker}
        isSelectingDamageLocation={isSelectingDamageLocation}
      />
      
      {isReporting && selectedDamageMarker && (
        <Card>
          <CardHeader>
            <CardTitle>Report Vehicle Damage</CardTitle>
          </CardHeader>
          <CardContent>
            <DamageReportForm 
              onSubmit={handleSubmitReport}
              onCancel={handleCancelReporting}
            />
          </CardContent>
        </Card>
      )}
      
      {/* Damage history */}
      <Card>
        <CardHeader>
          <CardTitle>Damage History</CardTitle>
        </CardHeader>
        <CardContent>
          {reportImages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {reportImages.map((image) => (
                <div key={image.id} className="bg-gray-100 rounded-md p-2">
                  <img 
                    src={image.url} 
                    alt="Damage report" 
                    className="w-full h-40 object-cover rounded-md"
                  />
                  <div className="mt-2 text-sm text-gray-500">
                    Reported on {new Date(image.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-lg font-medium mb-1">No damage reported</h3>
              <p className="text-sm">This vehicle has no damage reports.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
