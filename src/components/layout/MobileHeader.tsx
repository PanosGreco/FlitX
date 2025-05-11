
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/signup/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const { isLanguageLoading } = useLanguage();
  
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white shadow-bottom">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mr-3" 
          onClick={onMenuClick}
          aria-label="Menu"
          disabled={isLanguageLoading}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="font-bold text-flitx-blue text-xl tracking-tight">
          FlitX
        </div>
      </div>
      
      <LanguageSwitcher />
    </header>
  );
}
