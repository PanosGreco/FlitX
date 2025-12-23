import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Please provide a damage description",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit damage reports",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const { error } = await supabase
        .from('damage_reports')
        .insert({
          vehicle_id: vehicleId,
          user_id: user.id,
          description: description,
          severity: severity,
          location: damageLocation.category
        });

      if (error) throw error;

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
