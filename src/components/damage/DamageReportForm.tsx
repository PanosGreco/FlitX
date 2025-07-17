import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DamageReportFormProps {
  vehicleId: string;
  damageLocation: {
    position: [number, number, number];
    category: string;
  };
  onSubmit: () => void;
  onCancel: () => void;
}

export function DamageReportForm({ vehicleId, damageLocation, onSubmit, onCancel }: DamageReportFormProps) {
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'minor' | 'moderate' | 'severe'>('minor');
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setPhotos(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (reportId: string) => {
    const uploadPromises = photos.map(async (photo, index) => {
      const fileExt = photo.name.split('.').pop();
      const fileName = `${reportId}/photo_${index + 1}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('damage_reports')
        .upload(fileName, photo);

      if (uploadError) throw uploadError;

      // Save image record to database
      const { error: dbError } = await supabase
        .from('damage_report_images')
        .insert({
          report_id: reportId,
          storage_path: uploadData.path
        });

      if (dbError) throw dbError;

      return uploadData.path;
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Please provide a damage description",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to submit damage reports",
          variant: "destructive"
        });
        return;
      }

      // Create damage report
      const { data: report, error: reportError } = await supabase
        .from('vehicle_damage_reports')
        .insert({
          vehicle_id: vehicleId,
          user_id: session.session.user.id,
          damage_description: description,
          damage_severity: severity,
          damage_location: {
            position: damageLocation.position,
            category: damageLocation.category
          }
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Upload photos if any
      if (photos.length > 0) {
        await uploadPhotos(report.id);
      }

      toast({
        title: "Success",
        description: "Damage report submitted successfully"
      });

      onSubmit();
    } catch (error) {
      console.error('Error submitting damage report:', error);
      toast({
        title: "Error",
        description: "Failed to submit damage report",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Report Damage - {damageLocation.category}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="description">Damage Description</Label>
          <Textarea
            id="description"
            placeholder="Describe the damage in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="severity">Severity Level</Label>
          <Select value={severity} onValueChange={setSeverity as (value: string) => void}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="severe">Severe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Photos</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <label htmlFor="photo-upload" className="flex-1">
                <Button type="button" variant="outline" className="w-full" asChild>
                  <span>
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                  </span>
                </Button>
              </label>
              <input
                id="photo-upload"
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoCapture}
              />
            </div>
            
            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Damage photo ${index + 1}`}
                      className="w-full h-16 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={uploading}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {uploading ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}