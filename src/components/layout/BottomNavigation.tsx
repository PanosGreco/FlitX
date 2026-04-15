
import { NavLink } from "react-router-dom";
import { 
  Car, 
  BarChart3, 
  Map, 
  Calendar,
  Sparkles,
  User,
  Users
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { titleKey: "finances", href: "/finances", icon: BarChart3 },
  { titleKey: "crm", href: "/crm", icon: Users },
  { titleKey: "home", href: "/", icon: Calendar },
  { titleKey: "dailyProgram", href: "/daily-program", icon: Calendar },
  { titleKey: "aiAssistant", href: "/ai-assistant", icon: Sparkles },
  { titleKey: "fleet", href: "/fleet", icon: Car },
  { titleKey: "tracking", href: "/tracking", icon: Map },
  { titleKey: "profile", href: "/profile", icon: User },
];

export function BottomNavigation() {
  const { t } = useTranslation('common');

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 leading-tight truncate max-w-[56px] text-center">
              {t(item.titleKey)}
            </span>
          </NavLink>
        ))}
      </div>
      {/* Safe area for phones with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
