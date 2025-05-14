
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface DamageReportFormProps {
  onSubmit: (data: {
    description: string;
    severity: string;
    photos: File[];
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DamageReportForm({ onSubmit, onCancel, isLoading = false }: DamageReportFormProps) {
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [photos, setPhotos] = useState<File[]>([]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setPhotos(prevPhotos => [...prevPhotos, ...filesArray]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      description,
      severity,
      photos
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <div className="space-y-2">
        <label className="text-sm font-medium">Damage Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the damage in detail..."
          required
          disabled={isLoading}
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Severity</label>
        <Select value={severity} onValueChange={setSeverity} disabled={isLoading}>
          <SelectTrigger>
            <SelectValue placeholder="Select severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low - Cosmetic damage only</SelectItem>
            <SelectItem value="medium">Medium - Affects appearance but not function</SelectItem>
            <SelectItem value="high">High - Affects vehicle function</SelectItem>
            <SelectItem value="critical">Critical - Vehicle not operable</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Upload Photos</label>
        <Input 
          type="file" 
          accept="image/*" 
          onChange={handlePhotoChange}
          multiple
          className="cursor-pointer"
          disabled={isLoading}
        />
        
        {/* Preview photos */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <img 
                  src={URL.createObjectURL(photo)} 
                  alt={`Damage photo ${index + 1}`}
                  className="h-20 w-full object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 
                             opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isLoading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Submitting...' : 'Submit Report'}
        </Button>
      </div>
    </form>
  );
}
