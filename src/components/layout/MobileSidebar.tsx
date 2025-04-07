
import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { 
  Car, 
  BarChart3, 
  Map, 
  User, 
  X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    titleKey: "fleet",
    href: "/",
    icon: Car,
  },
  {
    titleKey: "finances",
    href: "/finances",
    icon: BarChart3,
  },
  {
    titleKey: "tracking",
    href: "/tracking",
    icon: Map,
  },
  {
    titleKey: "profile",
    href: "/profile",
    icon: User,
  },
];

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const isMobile = useIsMobile();
  const { t } = useLanguage();

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#mobile-sidebar') && !target.closest('button')) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Prevent scrolling when sidebar is open on mobile
  useEffect(() => {
    if (!isMobile) return;
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 transition-opacity" 
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <div
        id="mobile-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transition-transform duration-300 ease-in-out transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
          <div className="text-flitx-blue font-bold text-xl">FlitX</div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="text-flitx-gray-500"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="flex-1 overflow-auto pt-4 px-2">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  onClick={onClose}
                  className={({ isActive }) => 
                    `flex items-center px-3 py-2 rounded-md transition-colors ${
                      isActive 
                        ? "bg-flitx-blue text-white" 
                        : "text-flitx-gray-500 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`
                  }
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span>
                    {/* Make sure we're getting a string from the translation object */}
                    {typeof t[item.titleKey as keyof typeof t] === 'string' 
                      ? t[item.titleKey as keyof typeof t] 
                      : item.titleKey}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-flitx-gray-400">
            &copy; {new Date().getFullYear()} FlitX
          </div>
        </div>
      </div>
    </>
  );
}
