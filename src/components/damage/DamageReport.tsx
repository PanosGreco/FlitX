import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, MapPin, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Car3DModel } from "./Car3DModel";
import { DamageReportForm } from "./DamageReportForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface DamageReportData {
  id: string;
  description: string;
  severity: string;
  location: string | null;
  reported_at: string;
}

interface DamageReportProps {
  vehicleId: string;
}

export function DamageReport({ vehicleId }: DamageReportProps) {
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    position: [number, number, number];
    category: string;
  } | null>(null);
  const [damageReports, setDamageReports] = useState<DamageReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (vehicleId && user) {
      fetchDamageReports();
    }
  }, [vehicleId, user]);

  const fetchDamageReports = async () => {
    try {
      setLoading(true);
      
      const { data: reports, error } = await supabase
        .from('damage_reports')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('reported_at', { ascending: false });

      if (error) throw error;

      setDamageReports(reports || []);
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
    switch (severity?.toLowerCase()) {
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

  const damageMarkers = damageReports.map(report => ({
    id: report.id,
    position: [0, 0, 0] as [number, number, number],
    severity: (report.severity || 'minor') as 'minor' | 'moderate' | 'severe'
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
            Click on the 3D model to mark damage locations.
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
                        {report.location || 'Unknown Location'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {report.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getSeverityColor(report.severity)}>
                        {report.severity || 'minor'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Reported on {new Date(report.reported_at).toLocaleDateString()}</span>
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
