
import React, { useEffect, useState } from 'react';
import { Boat, Car } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  setBusinessType, 
  getBusinessType, 
  getBusinessTypeDisplayName 
} from '@/utils/businessTypeUtils';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export function BusinessTypeSwitch() {
  const [isBoatMode, setIsBoatMode] = useState(getBusinessType() === 'boats');
  const { toast } = useToast();
  const navigate = useNavigate();

  // Initialize from localStorage on first load
  useEffect(() => {
    setIsBoatMode(getBusinessType() === 'boats');
  }, []);

  const handleToggleChange = (checked: boolean) => {
    const newType = checked ? 'boats' : 'cars';
    setBusinessType(newType);
    setIsBoatMode(checked);
    
    // Show toast notification
    toast({
      title: `Switched to ${getBusinessTypeDisplayName(newType)} Mode`,
      description: `You are now in ${getBusinessTypeDisplayName(newType)} rental management mode.`
    });
    
    // Navigate to the appropriate home page
    if (checked) {
      navigate('/boats');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 px-3 py-1.5 rounded-full shadow-sm">
      <Car className={`h-4 w-4 ${!isBoatMode ? 'text-blue-600' : 'text-gray-400'}`} />
      <div className="flex items-center space-x-2">
        <Switch 
          id="business-type" 
          checked={isBoatMode}
          onCheckedChange={handleToggleChange}
        />
        <Label htmlFor="business-type" className="text-xs font-medium cursor-pointer select-none">
          {isBoatMode ? 'Boat Mode' : 'Car Mode'}
        </Label>
      </div>
      <Boat className={`h-4 w-4 ${isBoatMode ? 'text-blue-600' : 'text-gray-400'}`} />
    </div>
  );
}
