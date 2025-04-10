import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BusinessTypeSwitch } from '@/components/shared/BusinessTypeSwitch';
import { isBoatBusiness } from '@/utils/businessTypeUtils';

interface MobileHeaderProps {
  title?: string;
  onOpenSidebar?: () => void;
  showBackButton?: boolean;
  className?: string;
}

export function MobileHeader({
  title,
  onOpenSidebar,
  showBackButton = false,
  className,
}: MobileHeaderProps) {
  const navigate = useNavigate();
  const isBoatMode = isBoatBusiness();

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <header
      className={cn(
        'flex items-center justify-between p-4 bg-white shadow-sm h-16',
        className
      )}
    >
      <div className="flex items-center">
        {showBackButton ? (
          <Button variant="ghost" size="icon" onClick={handleBackClick}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={onOpenSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h1 className={`text-lg font-semibold ml-2 ${isBoatMode ? 'text-blue-600' : ''}`}>
          {title || (isBoatMode ? 'Boat Fleet' : 'Car Fleet')}
        </h1>
      </div>
      
      <BusinessTypeSwitch />
    </header>
  );
}
