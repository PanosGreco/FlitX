
import { NavLink } from "react-router-dom";
import { 
  Car, 
  BarChart3, 
  Map, 
  User, 
  Calendar,
  Sparkles,
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
  { titleKey: "aiAssistant", href: "/ai-assistant", icon: Sparkles },
  { titleKey: "dailyProgram", href: "/daily-program", icon: Calendar },
  { titleKey: "fleet", href: "/fleet", icon: Car },
  { titleKey: "tracking", href: "/tracking", icon: Map },
  { titleKey: "profile", href: "/profile", icon: User },
];

export function DesktopSidebar() {
  const { t } = useTranslation('common');

  return (
    <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
        <div className="text-primary font-bold text-xl">FlitX</div>
      </div>

      <nav className="flex-1 overflow-auto pt-4 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                end={item.href === "/"}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                <span>{t(item.titleKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} FlitX
        </div>
      </div>
    </aside>
  );
}
