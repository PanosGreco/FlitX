
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
  onMenuClick?: () => void; // Added this prop to fix the error
  showBackButton?: boolean;
  className?: string;
}

export function MobileHeader({
  title,
  onOpenSidebar,
  onMenuClick, // Using the new prop
  showBackButton = false,
  className,
}: MobileHeaderProps) {
  const navigate = useNavigate();
  const isBoatMode = isBoatBusiness();

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleMenuClick = () => {
    // Use the appropriate handler
    if (onMenuClick) {
      onMenuClick();
    } else if (onOpenSidebar) {
      onOpenSidebar();
    }
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
          <Button variant="ghost" size="icon" onClick={handleMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold ml-2 text-blue-600">
          {title || "FleetX"}
        </h1>
      </div>
      
      <BusinessTypeSwitch />
    </header>
  );
}
