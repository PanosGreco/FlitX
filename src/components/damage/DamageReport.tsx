import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Plus, FileText, Camera, MapPin, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Car3DModel } from "./Car3DModel";
import { DamageReportForm } from "./DamageReportForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface DamageReport {
  id: string;
  damage_description: string;
  damage_severity: string;
  damage_location: {
    position: [number, number, number];
    category: string;
  };
  damage_date: string;
  status: string;
  images?: string[];
}

interface DamageReportProps {
  vehicleId: string;
}

const DAMAGE_CATEGORIES = [
  'Front of vehicle',
  'Rear of vehicle', 
  'Left side',
  'Right side',
  'Interior',
  'Roof',
  'Wheels'
];

export function DamageReport({ vehicleId }: DamageReportProps) {
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    position: [number, number, number];
    category: string;
  } | null>(null);
  const [damageReports, setDamageReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryPhotos, setCategoryPhotos] = useState<{[key: string]: string[]}>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchDamageReports();
  }, [vehicleId]);

  const fetchDamageReports = async () => {
    try {
      setLoading(true);
      
      const { data: reports, error } = await supabase
        .from('vehicle_damage_reports')
        .select(`
          *,
          damage_report_images (
            storage_path
          )
        `)
        .eq('vehicle_id', vehicleId)
        .order('damage_date', { ascending: false });

      if (error) throw error;

      const processedReports = reports?.map(report => ({
        ...report,
        images: report.damage_report_images?.map((img: any) => 
          supabase.storage.from('damage_reports').getPublicUrl(img.storage_path).data.publicUrl
        ) || []
      })) || [];

      setDamageReports(processedReports);
      
      // Group photos by category
      const photosByCategory: {[key: string]: string[]} = {};
      processedReports.forEach(report => {
        const category = report.damage_location?.category || 'Other';
        if (!photosByCategory[category]) {
          photosByCategory[category] = [];
        }
        photosByCategory[category].push(...(report.images || []));
      });
      setCategoryPhotos(photosByCategory);
      
    } catch (error) {
      console.error('Error fetching damage reports:', error);
      toast({
        title: "Error",
        description: "Failed to load damage reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handle3DClick = (position: [number, number, number]) => {
    // Determine category based on position
    let category = 'Other';
    if (position[0] > 1) category = 'Front of vehicle';
    else if (position[0] < -1) category = 'Rear of vehicle';
    else if (position[2] > 0.5) category = 'Right side';
    else if (position[2] < -0.5) category = 'Left side';
    else if (position[1] > 1) category = 'Roof';
    
    setSelectedLocation({ position, category });
    setShowReportForm(true);
  };

  const handleReportSubmit = () => {
    setShowReportForm(false);
    setSelectedLocation(null);
    fetchDamageReports();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "minor":
        return "bg-yellow-100 text-yellow-800";
      case "moderate":
        return "bg-orange-100 text-orange-800";
      case "severe":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "reported":
        return "bg-blue-100 text-blue-800";
      case "in repair":
        return "bg-yellow-100 text-yellow-800";
      case "repaired":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const damageMarkers = damageReports.map(report => ({
    id: report.id,
    position: report.damage_location?.position || [0, 0, 0] as [number, number, number],
    severity: report.damage_severity as 'minor' | 'moderate' | 'severe'
  }));

  if (showReportForm && selectedLocation) {
    return (
      <DamageReportForm
        vehicleId={vehicleId}
        damageLocation={selectedLocation}
        onSubmit={handleReportSubmit}
        onCancel={() => {
          setShowReportForm(false);
          setSelectedLocation(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-blue-500" />
            Vehicle Damage Localization
          </CardTitle>
          <p className="text-sm text-gray-600">
            Click on the 3D model to mark damage locations. Rotate and zoom to view all sides.
          </p>
        </CardHeader>
        <CardContent>
          <Car3DModel 
            onDamageClick={handle3DClick}
            damageMarkers={damageMarkers}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
            Damage History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading damage reports...</p>
            </div>
          ) : damageReports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <h3 className="text-lg font-medium mb-1">No damage reports</h3>
              <p className="text-sm">Click on the 3D model above to report damage</p>
            </div>
          ) : (
            <div className="space-y-4">
              {damageReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {report.damage_location?.category || 'Unknown Location'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {report.damage_description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getSeverityColor(report.damage_severity)}>
                        {report.damage_severity}
                      </Badge>
                      <Badge className={getStatusColor(report.status || 'reported')}>
                        {report.status || 'Reported'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Reported on {new Date(report.damage_date || '').toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}