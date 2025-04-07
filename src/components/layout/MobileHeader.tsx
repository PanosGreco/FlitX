
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center h-14 px-4 bg-white shadow-bottom">
      <Button 
        variant="ghost" 
        size="icon" 
        className="mr-3" 
        onClick={onMenuClick}
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-2">
        <div className="font-bold text-flitx-blue text-xl tracking-tight">
          FlitX
        </div>
      </div>
    </header>
  );
}
